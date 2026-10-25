// La biblioteca de front instalada en un proyecto del tipo A: llega completa, sus rutas relativas funcionan desde
// tests/front/, la ficha y el manifiesto la declaran y se puede correr sin tocar nada del kit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planificar, aplicar, archivosDelManifiesto, cargarManifiesto, cubiertaPorGitignore } from '../../../install/install.mjs';
import { generarKitConfig, validarFicha, FichaInvalida } from '../../../infra/generate-settings.mjs';
import { normalizarConfig } from '../../../front/lib/config.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const entorno = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT'));
const node = (args, cwd) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 120000, env: entorno });
const ficha = () => ({ ...JSON.parse(readFileSync(join(raiz, 'types', 'A', 'ficha-infra.json'), 'utf8')), proyecto: 'demo' });

function instalar(t) {
  const base = mkdtempSync(join(tmpdir(), 'kit-front-inst-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const destino = join(base, 'sitio');
  mkdirSync(destino);
  const plan = planificar({ destino, tipo: 'A', proyecto: 'mi-sitio', respaldo: join(base, 'respaldo'), ahora: new Date('2026-10-21T10:00:00Z') });
  aplicar(plan);
  return { destino, plan };
}

const listar = (dir, base = dir, salida = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) listar(p, base, salida);
    else salida.push(p.slice(base.length + 1).replaceAll('\\', '/'));
  }
  return salida.sort();
};

test('el tipo A instala la biblioteca de front, los presets, los patrones y la guía, sin las pruebas del kit', (t) => {
  const { destino, plan } = instalar(t);
  assert.deepEqual(plan.advertencias, []);
  for (const f of ['tests/front/run.mjs', 'tests/front/front.config.json', 'tests/front/lib/config.mjs', 'tests/front/lib/color.mjs', 'tests/front/lib/servidor.mjs', 'tests/front/lib/navegador.mjs', 'tests/front/lib/informe.mjs',
    'tests/front/herramientas/capturas.mjs', 'tests/front/herramientas/hoja.mjs', 'tests/front/herramientas/video.mjs', 'tests/front/herramientas/salida.mjs',
    'design/FRONTEND.md', 'design/presets/sobrio.css', 'design/presets/expresivo.css', 'design/patrones/chip-copiable/patron.js', 'design/patrones/particulas-decorativas/patron.css',
    '.claude/skills/explorar-direcciones/SKILL.md', '.claude/skills/estudiar-referencia/SKILL.md', '.claude/skills/pulir-front/SKILL.md', '.claude/skills/elegir-tipografia-paleta/SKILL.md'])
    assert.ok(existsSync(join(destino, f)), `falta ${f}`);
  for (const f of listar(join(destino, 'tests', 'front'))) assert.doesNotMatch(f, /\.test\.mjs$|^test\//, `las pruebas del kit no se instalan: ${f}`);
  assert.match(readFileSync(join(destino, 'design', 'FRONTEND.md'), 'utf8'), /^# FRONTEND — guía del front de mi-sitio/);
  assert.match(readFileSync(join(destino, 'package.json'), 'utf8'), /"front": "node tests\/front\/run\.mjs"/);
});

test('lo instalado de front queda versionado (no cubierto por .gitignore) salvo design/refs/', () => {
  const m = cargarManifiesto('A');
  for (const a of archivosDelManifiesto(m).filter((x) => /^(tests\/front|design\/(presets|patrones|FRONTEND))/.test(x.destino) && x.destino !== 'tests/front/datos-privados.json')) {
    assert.equal(a.versionado, true, a.destino);
    assert.equal(cubiertaPorGitignore(a.destino, m.gitignore), false, a.destino);
  }
  assert.ok(cubiertaPorGitignore('design/refs/d1/a.png', m.gitignore), 'las capturas y maquetas no se versionan');
});

test('instalada, la biblioteca funciona desde tests/front/ (lista y carpeta de publicación) sin el kit', (t) => {
  const { destino } = instalar(t);
  const lista = node(['tests/front/run.mjs', '--lista'], destino);
  assert.equal(lista.status, 0, lista.stderr);
  assert.equal(lista.stdout.trim().split('\n').length, 9);
  // Un dist correcto pasa; con una carpeta que no debe publicarse, falla.
  mkdirSync(join(destino, 'dist', 'assets'), { recursive: true });
  for (const f of ['index.html', '404.html', '_headers', 'assets/a.css']) writeFileSync(join(destino, 'dist', f), 'x');
  const bien = node(['tests/front/run.mjs', '--solo', 'dist'], destino);
  assert.equal(bien.status, 0, bien.stdout + bien.stderr);
  mkdirSync(join(destino, 'dist', 'kit'));
  writeFileSync(join(destino, 'dist', 'kit', 'x.json'), '{}');
  const mal = node(['tests/front/run.mjs', '--solo', 'dist'], destino);
  assert.equal(mal.status, 1);
  assert.match(mal.stdout, /✗ dist\/: nada que no deba publicarse/);
});

test('la configuración instalada es válida y trae los umbrales del brief', (t) => {
  const { destino } = instalar(t);
  const c = normalizarConfig(JSON.parse(readFileSync(join(destino, 'tests', 'front', 'front.config.json'), 'utf8')));
  assert.equal(c.origen.carpeta, 'dist');
  assert.ok(c.dist.permitidos.includes('en/**'), 'coincide con la lista permitida de publish.mjs');
  assert.equal(c.fuentes.licencias, 'design/TOOLING.md');
  assert.equal(c.umbrales.textoBasePx, 18);
});

test('el publish de la plantilla y la lista de dist/ de la configuración permiten lo mismo', () => {
  const publish = readFileSync(join(raiz, 'types', 'A', 'plantillas', 'scripts', 'publish.mjs'), 'utf8');
  const permitidos = JSON.parse(publish.match(/PERMITIDOS = (\[[^\]]*\])/)[1].replaceAll("'", '"'));
  const c = normalizarConfig(JSON.parse(readFileSync(join(raiz, 'front', 'front.config.plantilla.json'), 'utf8')));
  for (const p of permitidos) assert.ok(c.dist.permitidos.some((g) => g === p || g === `${p}/**`), `dist.permitidos no cubre «${p}»`);
});

test('la ficha del tipo A declara las pruebas de front para el sello y autoriza sus comandos', () => {
  const f = ficha();
  assert.deepEqual(f.kit.front, { config: 'tests/front/front.config.json', comando: 'node tests/front/run.mjs' });
  assert.deepEqual(generarKitConfig(f).front, f.kit.front);
  for (const r of ['Bash(node tests/front/run.mjs:*)', 'Bash(node tests/front/herramientas/capturas.mjs:*)']) assert.ok(f.permisos.permitidos.includes(r), r);
  assert.equal(generarKitConfig({ ...f, kit: { ...f.kit, front: undefined } }).front, null, 'sin front configurado queda en null');
});

test('kit.front se valida: ruta relativa dentro del proyecto y un comando', () => {
  const con = (front) => ({ ...ficha(), kit: { ...ficha().kit, front } });
  for (const mala of [{ config: '../fuera.json', comando: 'x' }, { config: '/abs.json', comando: 'x' }, { config: 'C:\\x.json', comando: 'x' }, { config: 'a\\..\\b.json', comando: 'x' }, { config: 'ok.json', comando: '' }, { config: 3, comando: 'x' }])
    assert.throws(() => validarFicha(con(mala)), FichaInvalida, JSON.stringify(mala));
  assert.doesNotThrow(() => validarFicha(con({ config: 'tests/front/front.config.json', comando: 'node tests/front/run.mjs' })));
  assert.doesNotThrow(() => validarFicha(con(null)));
});

test('extremo a extremo con navegador: instalar, publicar y pasar todas las pruebas de front sobre dist/', async (t) => {
  const { abrirNavegador, HTML_BUENO, CSS_BUENO } = await import('../../../front/test/_ayudas.mjs');
  const { browser, motivo } = await abrirNavegador();
  if (!browser) return t.skip(motivo);
  await browser.close();
  const { destino } = instalar(t);
  const poner = (ruta, texto) => { mkdirSync(dirname(join(destino, ruta)), { recursive: true }); writeFileSync(join(destino, ruta), texto); };
  const html = HTML_BUENO().replace('/otra.html', '/en/index.html');
  poner('index.html', html); poner('en/index.html', html); poner('404.html', HTML_BUENO('<p>No encontrada.</p>').replace('/otra.html', '/en/index.html'));
  poner('assets/estilo.css', CSS_BUENO);
  const cfg = JSON.parse(readFileSync(join(destino, 'tests', 'front', 'front.config.json'), 'utf8'));
  cfg.paginas = [{ ruta: '/index.html', tipo: 'portada' }, { ruta: '/en/index.html', tipo: 'interior' }, { ruta: '/404.html', tipo: '404' }];
  cfg.pruebas.cpu = false;
  cfg.selectores.decorativos = ['.deco'];
  poner('tests/front/front.config.json', JSON.stringify(cfg));
  const publicado = node(['scripts/publish.mjs'], destino);
  assert.equal(publicado.status, 0, publicado.stderr);
  const env = { ...entorno, CHROMIUM_PATH: entorno.CHROMIUM_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' };
  const r = spawnSync(process.execPath, ['tests/front/run.mjs'], { cwd: destino, encoding: 'utf8', timeout: 240000, env });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /comprobaciones correctas; 1 aviso\(s\)[^\n]*\n$/, 'solo el aviso de que los datos privados están vacíos');
  assert.match(r.stdout, /AVISO: datos privados/);
  assert.doesNotMatch(r.stdout, /✗/);
});
