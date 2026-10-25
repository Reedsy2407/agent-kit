import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planificar, aplicar, archivosDelManifiesto, cargarManifiesto, cubiertaPorGitignore } from '../../../install/install.mjs';
import { generarSettings, validarFicha, FichaInvalida } from '../../../infra/generate-settings.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');
const ficha = (cambios = {}) => {
  const f = JSON.parse(leer('types', 'A', 'ficha-infra.json'));
  f.proyecto = 'demo';
  f.despliegue = { ...f.despliegue, ...cambios };
  return f;
};

test('la ficha del tipo A deniega siempre delete, secret, logout y pages project delete', () => {
  const s = generarSettings(ficha());
  for (const x of ['wrangler delete', 'wrangler secret', 'wrangler logout', 'wrangler pages project delete']) {
    for (const pre of ['npx ', '']) assert.ok(s.permissions.deny.includes(`Bash(${pre}${x}:*)`), `falta la denegación de ${pre}${x}`);
  }
  assert.ok(!s.permissions.allow.some((r) => /wrangler|run deploy/.test(r)), 'antes del primer despliegue humano no se autoriza el despliegue');
  const t2 = generarSettings(ficha({ primerDespliegueHecho: true }));
  for (const x of ['wrangler delete', 'wrangler secret', 'wrangler logout']) assert.ok(t2.permissions.deny.includes(`Bash(npx ${x}:*)`), 'siguen denegados tras el primer despliegue');
});

test('tras el primer despliegue humano se autorizan solo npm run deploy y npx wrangler deploy, exactos', () => {
  const s = generarSettings(ficha({ primerDespliegueHecho: true }));
  assert.ok(s.permissions.allow.includes('Bash(npm run deploy)'));
  assert.ok(s.permissions.allow.includes('Bash(npx wrangler deploy)'));
  assert.ok(!s.permissions.allow.some((r) => /wrangler (delete|secret|logout|pages)/.test(r)));
  assert.ok(!s.permissions.allow.some((r) => /deploy:\*|deploy \*/.test(r)), 'acotadas: sin comodines');
});

test('una autorización condicional tapada por una denegación hace fallar la ficha, aunque aún no esté activa', () => {
  assert.throws(() => validarFicha(ficha({ permitidosTrasPrimerDespliegue: ['Bash(npx wrangler delete)'] })), FichaInvalida);
  assert.throws(() => validarFicha(ficha({ primerDespliegueHecho: 'sí' })), /primerDespliegueHecho/);
});

test('la ficha del tipo A exige al menos las pruebas del proyecto en el sello', () => {
  const f = ficha();
  assert.ok(f.kit.checks.some((c) => c.commands.includes('npm test')));
});

test('la skill publicar tiene frontmatter válido y recoge el flujo y los pasos manuales', () => {
  const texto = leer('types', 'A', 'skills', 'publicar', 'SKILL.md');
  const fm = texto.match(/^---\n([\s\S]*?)\n---\n/)[1];
  assert.match(fm, /^name:\s*publicar$/m);
  assert.match(fm, /^description:\s*\S/m);
  assert.match(fm, /^disable-model-invocation:\s*true$/m);
  assert.doesNotMatch(fm, /allowed-tools/);
  assert.ok(texto.split('\n').length < 500);
  for (const x of [/publicar → pruebas → despliegue → humo → revisión/, /Notice to agents/, /wrangler pages project create/, /primer despliegue es directo a producción/, /wrangler versions upload/,
    /wrangler login/, /workers\.dev/, /npx wrangler logout/, /primerDespliegueHecho/, /verifica|comprueba en la documentación oficial/i, /200 en `\/` y `\/en\/`/, /404 con estilos/, /PDF del CV/, /cabeceras/, /teléfono/]) assert.match(texto, x);
});

test('la guía de problemas cubre el antivirus sin pedir excepciones', () => {
  const t = leer('types', 'A', 'PUBLICACION-PROBLEMAS.md');
  assert.match(t, /IDP\.HELU\.PSE95/);
  assert.match(t, /firma digital de Microsoft/);
  assert.match(t, /No crees excepciones ni apagues el antivirus/);
});

test('el ADR 0009 existe y descarta la vía de Pages', () => {
  const t = leer('docs', 'adr', '0009-publicacion-tipo-a-en-workers.md');
  assert.match(t, /Pages dentro de Workers/);
  assert.match(t, /Notice to agents/);
  assert.match(t, /No se usa `wrangler pages project create` ni `--force`/);
  assert.match(t, /No se ejecuta `wrangler`/);
});

test('wrangler.jsonc: solo archivos estáticos, sin main ni binding', () => {
  const t = leer('types', 'A', 'plantillas', 'wrangler.jsonc');
  const json = JSON.parse(t.replace(/^\s*\/\/.*$/gm, '').replaceAll('{{proyecto}}', 'x').replaceAll('{{fecha}}', '2026-01-01'));
  assert.equal(json.assets.directory, './dist');
  assert.equal(json.assets.not_found_handling, '404-page');
  assert.equal(json.workers_dev, true);
  assert.ok(!('main' in json) && !('binding' in json.assets) && !('ASSETS' in json));
});

test('package.json de la plantilla: playwright-core fijo como devDependency, sin dependencias de ejecución', () => {
  const p = JSON.parse(leer('types', 'A', 'plantillas', 'package.json.tpl'));
  assert.match(p.devDependencies['playwright-core'], /^\d+\.\d+\.\d+$/, 'versión exacta');
  assert.equal(p.dependencies, undefined);
});

test('instalar el tipo A deja la publicación completa y lo local sin versionar', () => {
  const base = mkdtempSync(join(tmpdir(), 'kit-tipoA-'));
  try {
    const destino = join(base, 'sitio');
    mkdirSync(destino);
    const plan = planificar({ destino, tipo: 'A', proyecto: 'mi-sitio', respaldo: join(base, 'respaldo'), ahora: new Date('2026-10-21T10:00:00Z') });
    assert.deepEqual(plan.advertencias, []);
    aplicar(plan);
    for (const f of ['scripts/publish.mjs', 'scripts/_headers.template', 'scripts/humo.mjs', 'tests/publicacion.test.mjs', 'wrangler.jsonc', 'package.json', '.claude/skills/publicar/SKILL.md', 'kit/PUBLICACION-PROBLEMAS.md'])
      assert.ok(existsSync(join(destino, f)), `falta ${f}`);
    const w = readFileSync(join(destino, 'wrangler.jsonc'), 'utf8');
    assert.match(w, /"name": "mi-sitio"/);
    assert.match(w, /"compatibility_date": "2026-10-21"/);
    assert.match(readFileSync(join(destino, 'scripts/_headers.template'), 'utf8'), /\{\{SCRIPT_HASHES\}\}/, 'el marcador de la CSP no lo toca el instalador');
    assert.match(readFileSync(join(destino, 'design/DESIGN-BRIEF.md'), 'utf8'), /Perfil de expresión \(obligatorio\):\*\* expresivo\./);
    const m = cargarManifiesto('A');
    for (const a of archivosDelManifiesto(m)) assert.equal(cubiertaPorGitignore(a.destino, m.gitignore), !a.versionado, a.destino);
    for (const g of ['/dist/', '/.wrangler/', '/node_modules/']) assert.ok(readFileSync(join(destino, '.gitignore'), 'utf8').split('\n').includes(g), g);
  } finally { rmSync(base, { recursive: true, force: true }); }
});
