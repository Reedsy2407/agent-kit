// Deuda de la etapa 2A: rutas relativas del 404 en la prueba de publicación y PDF del humo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escucharSeguro } from '../../../front/lib/servidor.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const plantillas = join(raiz, 'types', 'A', 'plantillas');
// Sin NODE_TEST_CONTEXT, el corredor hijo escribiría en el formato interno del padre y no en texto.
const entorno = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT'));
const node = (args, cwd) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 120000, env: entorno });

const PAGINA = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>t</title><script>document.documentElement.dataset.tema=1</script><link rel="stylesheet" href="assets/estilos.css"></head><body><h1>Hola</h1></body></html>';

function proyecto(t) {
  const dir = mkdtempSync(join(tmpdir(), 'kit-deuda-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const poner = (ruta, texto) => { mkdirSync(dirname(join(dir, ruta)), { recursive: true }); writeFileSync(join(dir, ruta), texto); };
  poner('index.html', PAGINA);
  poner('404.html', PAGINA.replace('<h1>Hola</h1>', '<h1>404</h1>'));
  poner('en/index.html', PAGINA);
  poner('assets/estilos.css', 'body{margin:0}');
  cpSync(join(plantillas, 'scripts'), join(dir, 'scripts'), { recursive: true });
  cpSync(join(plantillas, 'tests', 'publicacion.test.mjs.tpl'), join(dir, 'tests', 'publicacion.test.mjs'));
  return dir;
}

/** Sirve dist/ con sus cabeceras y corre scripts/humo.mjs contra él. */
async function humoContra(dir, { pdf = false } = {}) {
  const dist = join(dir, 'dist');
  const cab = Object.fromEntries(readFileSync(join(dist, '_headers'), 'utf8').split('\n\n')[0].split('\n').slice(1).map((l) => l.trim().split(/:\s+/)).map(([k, ...v]) => [k, v.join(': ')]));
  const servidor = await new Promise((ok) => {
    const s = createServer((req, res) => {
      const url = req.url.split('?')[0];
      const archivo = url.endsWith('/') ? `${url.slice(1)}index.html` : url.slice(1);
      let cuerpo = null;
      try { cuerpo = readFileSync(join(dist, archivo)); } catch { /* 404 */ }
      if (cuerpo) {
        const tipo = archivo.endsWith('.css') ? 'text/css' : archivo.endsWith('.pdf') && pdf ? 'application/pdf' : 'text/html; charset=utf-8';
        res.writeHead(200, { 'content-type': tipo, ...cab });
        return res.end(cuerpo);
      }
      res.writeHead(404, { 'content-type': 'text/html' });
      res.end(readFileSync(join(dist, '404.html')));
    });
    escucharSeguro(s).then(() => ok(s));
  });
  try {
    return await new Promise((ok) => {
      const p = spawn(process.execPath, ['scripts/humo.mjs', `http://127.0.0.1:${servidor.address().port}`], { cwd: dir, env: entorno });
      let err = '';
      p.stderr.on('data', (d) => { err += d; });
      p.on('close', (status) => ok({ status, err }));
    });
  } finally { servidor.close(); }
}

test('la prueba de publicación falla si el 404 de dist/ conserva rutas relativas', (t) => {
  const dir = proyecto(t);
  const p = join(dir, 'scripts', 'publish.mjs');
  const original = readFileSync(p, 'utf8');
  const sinReescritura = original.replace(/writeFileSync\(f404, readFileSync\(f404, 'utf8'\)\.replace\([^\n]*\n/, '');
  assert.notEqual(sinReescritura, original, 'la prueba debe poder desactivar la reescritura del 404');
  writeFileSync(p, sinReescritura);
  const r = node(['--test', 'tests/publicacion.test.mjs'], dir);
  assert.notEqual(r.status, 0, 'con rutas relativas la prueba debe fallar');
  assert.match(r.stdout, /ruta relativa en el 404: assets\/estilos\.css/);
});

test('la prueba de publicación acepta el 404 con rutas absolutas que genera publish.mjs', (t) => {
  const dir = proyecto(t);
  const r = node(['--test', 'tests/publicacion.test.mjs'], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('humo: un 404 con la hoja de estilos en ruta relativa falla', async (t) => {
  const dir = proyecto(t);
  node(['scripts/publish.mjs'], dir);
  const f = join(dir, 'dist', '404.html');
  writeFileSync(f, readFileSync(f, 'utf8').replace('href="/assets/estilos.css"', 'href="assets/estilos.css"'));
  const r = await humoContra(dir);
  assert.equal(r.status, 1);
  assert.match(r.err, /404: la hoja de estilos \(assets\/estilos\.css\) no usa una ruta absoluta desde la raíz/);
});

test('humo: los PDF configurados deben responder 200 y empezar por %PDF', async (t) => {
  const casos = [
    ['no existe', null, /\/cv\.pdf: no es un PDF servido con 200/],
    ['no es un PDF', 'esto es texto', /\/cv\.pdf: no es un PDF servido con 200/],
    ['es un PDF', '%PDF-1.4\n%contenido de ejemplo', 0],
  ];
  for (const [nombre, contenido, esperado] of casos) {
    const dir = proyecto(t);
    const h = join(dir, 'scripts', 'humo.mjs');
    writeFileSync(h, readFileSync(h, 'utf8').replace('const PDFS = [];', "const PDFS = ['/cv.pdf'];"));
    node(['scripts/publish.mjs'], dir);
    if (contenido !== null) writeFileSync(join(dir, 'dist', 'cv.pdf'), contenido);
    const r = await humoContra(dir, { pdf: true });
    if (esperado === 0) assert.equal(r.status, 0, `${nombre}: ${r.err}`);
    else { assert.equal(r.status, 1, nombre); assert.match(r.err, esperado, nombre); }
  }
});
