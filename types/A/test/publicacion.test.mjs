import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escucharSeguro } from '../../../front/lib/servidor.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const plantillas = join(raiz, 'types', 'A', 'plantillas');

const PAGINA = (extra = '') => `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>t</title><script>document.documentElement.dataset.tema='oscuro'</script><link rel="stylesheet" href="assets/estilos.css"></head><body><h1>Hola</h1>${extra}</body></html>`;

/** Proyecto de ejemplo con las plantillas instaladas y, a propósito, carpetas que NO deben publicarse. */
function proyecto(t, { index = PAGINA() } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'kit-pub-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const poner = (ruta, texto) => { mkdirSync(dirname(join(dir, ruta)), { recursive: true }); writeFileSync(join(dir, ruta), texto); };
  poner('index.html', index);
  poner('404.html', PAGINA().replace('<h1>Hola</h1>', '<h1>404</h1><a href="en/">en</a>'));
  poner('en/index.html', PAGINA());
  poner('assets/estilos.css', 'body{margin:0}');
  for (const [ruta, texto] of [['design/DESIGN-BRIEF.md', 'x'], ['kit/FICHA-INFRA.json', '{}'], ['tests/otro.mjs', ''], ['.claude/kit.json', '{}'], ['CLAUDE.md', 'x'], ['HANDOFF.md', 'x'], ['capturas/a.png', 'x']]) poner(ruta, texto);
  cpSync(join(plantillas, 'scripts'), join(dir, 'scripts'), { recursive: true });
  cpSync(join(plantillas, 'tests', 'publicacion.test.mjs.tpl'), join(dir, 'tests', 'publicacion.test.mjs'));
  cpSync(join(plantillas, 'package.json.tpl'), join(dir, 'package.json'));
  return { dir, poner };
}

// Sin NODE_TEST_CONTEXT, el corredor hijo escribiría en el formato interno del padre y no en texto.
const entorno = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT'));
const node = (args, cwd) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 120000, env: entorno });
const listar = (base, dir = base, salida = []) => {
  for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) listar(base, p, salida); else salida.push(relative(base, p).replaceAll('\\', '/')); }
  return salida.sort();
};

test('publish copia solo la lista permitida y genera _headers', (t) => {
  const { dir } = proyecto(t);
  const r = node(['scripts/publish.mjs'], dir);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(listar(join(dir, 'dist')), ['404.html', '_headers', 'assets/estilos.css', 'en/index.html', 'index.html']);
  const otra = node(['scripts/publish.mjs'], dir);
  assert.equal(otra.status, 0, 'repetir publica igual (vacía el contenido, no borra la carpeta)');
});

test('el 404 de dist usa rutas absolutas desde la raíz', (t) => {
  const { dir } = proyecto(t);
  node(['scripts/publish.mjs'], dir);
  const html = readFileSync(join(dir, 'dist', '404.html'), 'utf8');
  assert.match(html, /href="\/assets\/estilos\.css"/);
  assert.match(html, /href="\/en\/"/);
  assert.match(readFileSync(join(dir, '404.html'), 'utf8'), /href="assets\/estilos\.css"/, 'el 404 de desarrollo no cambia');
});

test('_headers no tiene comentarios y la CSP autoriza por hash el script en línea', (t) => {
  const { dir } = proyecto(t);
  node(['scripts/publish.mjs'], dir);
  const h = readFileSync(join(dir, 'dist', '_headers'), 'utf8');
  assert.doesNotMatch(h, /^\s*#/m);
  assert.match(h, /script-src 'self' 'sha256-[A-Za-z0-9+/=]+';/);
  assert.doesNotMatch(h, /script-src[^;]*unsafe-inline/);
  assert.doesNotMatch(readFileSync(join(plantillas, 'scripts', '_headers.template'), 'utf8'), /^\s*#/m, 'la plantilla tampoco lleva comentarios');
});

test('la prueba de publicación pasa en un proyecto correcto', (t) => {
  const { dir } = proyecto(t);
  const r = node(['--test', 'tests/publicacion.test.mjs'], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /# fail 0/);
});

test('la prueba de publicación falla si dist/ incluye design/, kit/, tests/, .claude/, scripts/, CLAUDE.md, HANDOFF.md, package.json o capturas', (t) => {
  for (const nombre of ['design', 'kit', 'tests', '.claude', 'scripts', 'CLAUDE.md', 'HANDOFF.md', 'package.json', 'capturas']) {
    const { dir } = proyecto(t);
    const p = join(dir, 'scripts', 'publish.mjs');
    writeFileSync(p, readFileSync(p, 'utf8').replace("['index.html', '404.html', 'en', 'assets']", `['index.html', '404.html', 'en', 'assets', '${nombre}']`));
    const r = node(['--test', 'tests/publicacion.test.mjs'], dir);
    assert.notEqual(r.status, 0, `debía fallar con «${nombre}» en dist/`);
    assert.match(r.stdout, /dist\/ incluye/, nombre);
  }
});

test('un script en línea con atributos (type="module") recibe hash y la prueba de publicación pasa', (t) => {
  const { dir } = proyecto(t, { index: PAGINA('<script type="module">console.log(1)</script>') });
  assert.equal(node(['scripts/publish.mjs'], dir).status, 0);
  const h = readFileSync(join(dir, 'dist', '_headers'), 'utf8');
  assert.equal(h.match(/'sha256-/g).length, 2, 'un hash para el script del tema y otro para el módulo');
  const r = node(['--test', 'tests/publicacion.test.mjs'], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('un script en línea con data-src también recibe hash (data-src no es src)', (t) => {
  const { dir } = proyecto(t, { index: PAGINA('<script data-src="x">console.log(2)</script>') });
  assert.equal(node(['scripts/publish.mjs'], dir).status, 0);
  assert.equal(readFileSync(join(dir, 'dist', '_headers'), 'utf8').match(/'sha256-/g).length, 2);
});

test('la prueba de publicación detecta violaciones de la CSP en la página', (t) => {
  for (const [que, extra, esperado] of [
    ['atributo de evento', '<button onclick="x()">x</button>', /atributo de evento/],
    ['script externo', '<script src="https://otro.example/x.js"></script>', /script externo/],
    ['estilo en línea', '<p style="color:red">x</p>', /atributo style/],
  ]) {
    const { dir } = proyecto(t, { index: PAGINA(extra) });
    const r = node(['--test', 'tests/publicacion.test.mjs'], dir);
    assert.notEqual(r.status, 0, que);
    assert.match(r.stdout, esperado, que);
  }
});

test('humo: pasa contra un sitio correcto y falla con teléfono, sin cabeceras o sin 404', async (t) => {
  const { dir } = proyecto(t);
  node(['scripts/publish.mjs'], dir);
  const dist = join(dir, 'dist');
  const cab = Object.fromEntries(readFileSync(join(dist, '_headers'), 'utf8').split('\n\n')[0].split('\n').slice(1).map((l) => l.trim().split(/:\s+/)).map(([k, ...v]) => [k, v.join(': ')]));
  const servidor = (opciones = {}) => new Promise((ok) => {
    const s = createServer((req, res) => {
      const url = req.url.split('?')[0];
      const archivo = url.endsWith('/') ? `${url.slice(1)}index.html` : url.slice(1);
      let cuerpo;
      try { cuerpo = readFileSync(join(dist, archivo)); } catch { cuerpo = null; }
      const tipo = archivo.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8';
      if (cuerpo) { res.writeHead(200, { 'content-type': tipo, ...(opciones.sinCabeceras ? {} : cab) }); return res.end(cuerpo); }
      if (opciones.sin404) { res.writeHead(200, cab); return res.end('x'); }
      res.writeHead(404, { 'content-type': 'text/html' });
      res.end(readFileSync(join(dist, '404.html')));
    });
    escucharSeguro(s).then(() => ok(s));
  });
  const humo = async (s) => new Promise((ok) => {
    const p = spawn(process.execPath, ['scripts/humo.mjs', `http://127.0.0.1:${s.address().port}`], { cwd: dir, env: entorno });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (status) => ok({ status, err }));
  });
  for (const [nombre, opciones, cambio, esperado] of [
    ['correcto', {}, null, 0], ['con teléfono', {}, () => writeFileSync(join(dist, 'index.html'), PAGINA('<p>+34 600 123 456</p>')), /texto prohibido/],
    ['sin cabeceras', { sinCabeceras: true }, null, /falta la cabecera/], ['sin 404', { sin404: true }, null, /404/],
  ]) {
    node(['scripts/publish.mjs'], dir); // cada caso parte de un dist limpio
    cambio?.();
    const s = await servidor(opciones);
    try {
      const r = await humo(s);
      if (esperado === 0) assert.equal(r.status, 0, `${nombre}: ${r.err}`);
      else { assert.equal(r.status, 1, nombre); assert.match(r.err, esperado, nombre); }
    } finally { s.close(); }
  }
});
