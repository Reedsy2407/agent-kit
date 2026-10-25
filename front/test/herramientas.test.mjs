// Herramientas de capturas, hoja comparativa y video: destino seguro (design/refs/, ignorado) y generación real.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolverSalida, refsIgnorada, slugDeRuta, nombreArchivo, SalidaInvalida } from '../herramientas/salida.mjs';
import { analizarNombre, construirHoja, main as hoja } from '../herramientas/hoja.mjs';
import { leerArgumentos as argsCapturas, main as capturas, ANCHOS } from '../herramientas/capturas.mjs';
import { leerArgumentos as argsVideo, main as video } from '../herramientas/video.mjs';
import { abrirNavegador, crearSitio } from './_ayudas.mjs';

const proyecto = (t, gitignore = '/design/refs/\n') => {
  const d = mkdtempSync(join(tmpdir(), 'kit-herr-'));
  t.after(() => rmSync(d, { recursive: true, force: true }));
  if (gitignore !== null) writeFileSync(join(d, '.gitignore'), gitignore);
  return d;
};
const salida = () => { const o = { out: '', err: '' }; return { o, stdout: { write: (x) => { o.out += x; } }, stderr: { write: (x) => { o.err += x; } } }; };

test('la salida queda siempre dentro de design/refs/ y exige que esté ignorada por git', (t) => {
  const d = proyecto(t);
  assert.equal(resolverSalida(d, 'capturas'), join(d, 'design', 'refs', 'capturas'));
  assert.equal(resolverSalida(d, ''), join(d, 'design', 'refs'));
  for (const mala of ['..', '../x', 'a/../../x', 'C:/fuera', '/etc']) assert.throws(() => resolverSalida(d, mala), SalidaInvalida, mala);
  const sin = proyecto(t, null);
  assert.throws(() => resolverSalida(sin, 'x'), /no está en \.gitignore/);
  assert.equal(resolverSalida(sin, 'x', { exigirIgnorada: false }), join(sin, 'design', 'refs', 'x'));
  assert.equal(refsIgnorada(proyecto(t, 'node_modules/\n/design/refs\n')), true);
  assert.equal(refsIgnorada(proyecto(t, '/design/\n')), true);
  assert.equal(refsIgnorada(proyecto(t, 'dist/\n')), false);
});

test('nombres de archivo estables a partir de la ruta, el ancho y el tema', () => {
  assert.equal(slugDeRuta('/'), 'inicio');
  assert.equal(slugDeRuta('/en/index.html'), 'en-index');
  assert.equal(slugDeRuta('/404.html'), '404');
  assert.equal(nombreArchivo('/index.html', 1280, 'dark', 'png'), 'index-1280-oscuro.png');
  assert.equal(nombreArchivo('/', 360, 'light', 'webm'), 'inicio-360-claro.webm');
  assert.deepEqual(analizarNombre('en-index-1280-oscuro.png'), { pagina: 'en-index', ancho: 1280, tema: 'oscuro' });
  assert.equal(analizarNombre('notas.txt'), null);
  assert.deepEqual(ANCHOS, [360, 768, 1280, 1920]);
});

test('la hoja con una carpeta pone oscuro y claro lado a lado, y con varias, una columna por dirección', () => {
  const una = construirHoja({ columnas: [{ titulo: 'd1', carpeta: 'd1', archivos: ['inicio-360-oscuro.png', 'inicio-360-claro.png', 'inicio-1280-oscuro.png', 'basura.txt'] }] });
  assert.match(una, /<th scope="col">oscuro<\/th><th scope="col">claro<\/th>/);
  assert.match(una, /inicio · 360 px.*src="d1\/inicio-360-oscuro\.png".*src="d1\/inicio-360-claro\.png"/s);
  assert.match(una, /inicio · 1280 px[\s\S]*sin captura/, 'falta el claro de 1280');
  const varias = construirHoja({ columnas: [{ titulo: 'a', carpeta: 'a', archivos: ['x-360-oscuro.png', 'x-360-claro.png'] }, { titulo: 'b', carpeta: 'b', archivos: ['x-360-oscuro.png'] }] });
  assert.match(varias, /<th scope="col">a<\/th><th scope="col">b<\/th>/);
  assert.match(varias, /x · 360 px · oscuro.*a\/x-360-oscuro\.png.*b\/x-360-oscuro\.png/s);
  assert.match(varias, /x · 360 px · claro.*a\/x-360-claro\.png.*sin captura/s);
  assert.doesNotMatch(varias, /<script|https?:\/\//, 'sin scripts ni red');
  assert.match(construirHoja({ titulo: '<b>&', columnas: [{ titulo: 'x"', carpeta: 'c', archivos: [] }] }), /&lt;b&gt;&amp;/, 'se escapa el texto');
});

test('el comando de hoja lee las carpetas de design/refs/ y escribe la hoja ahí', (t) => {
  const d = proyecto(t);
  for (const dir of ['d1', 'd2']) { mkdirSync(join(d, 'design', 'refs', dir), { recursive: true }); writeFileSync(join(d, 'design', 'refs', dir, 'inicio-360-oscuro.png'), 'png'); }
  const s = salida();
  assert.equal(hoja(['--carpetas', 'd1,d2'], { stdout: s.stdout, stderr: s.stderr, proyecto: d }), 0, s.o.err);
  const html = readFileSync(join(d, 'design', 'refs', 'hoja.html'), 'utf8');
  assert.match(html, /d1\/inicio-360-oscuro\.png/);
  assert.match(html, /d2\/inicio-360-oscuro\.png/);
  const mal = salida();
  assert.equal(hoja(['--carpetas', '../fuera'], { stdout: mal.stdout, stderr: mal.stderr, proyecto: d }), 2);
  assert.equal(hoja(['--carpetas', 'no-existe'], { ...salida(), proyecto: d }), 2);
  assert.equal(hoja([], { ...salida(), proyecto: d }), 2);
  assert.equal(hoja(['--carpetas', 'd1', '--salida', '../hoja.html'], { ...salida(), proyecto: d }), 2, 'la hoja tampoco sale de design/refs/');
});

test('los argumentos de capturas y video se validan', () => {
  assert.deepEqual(argsCapturas(['--anchos', '360,1280', '--completa']).anchos, [360, 1280]);
  assert.throws(() => argsCapturas(['--anchos', '10']), /entre 200 y 4000/);
  assert.throws(() => argsCapturas(['--raro']), /opción desconocida/);
  assert.equal(argsVideo([]).pasos, 12);
  assert.throws(() => argsVideo(['--pasos', '500']), /entre 1 y 40/);
  assert.throws(() => argsVideo(['--tema', 'sepia']), /dark o light/);
});

test('capturas y video fallan con claridad (código 2) si design/refs/ no está ignorada', async (t) => {
  const d = proyecto(t, null);
  writeFileSync(join(d, 'c.json'), '{}');
  const s = salida();
  assert.equal(await capturas(['--config', 'c.json'], { stdout: s.stdout, stderr: s.stderr, proyecto: d }), 2);
  assert.match(s.o.err, /\.gitignore/);
  assert.equal(await video(['--config', 'c.json'], { ...salida(), proyecto: d }), 2);
});

let browser = null;
let motivo = null;
before(async () => { ({ browser, motivo } = await abrirNavegador()); });
after(async () => { await browser?.close(); });

test('capturas genera un PNG por ancho y tema en design/refs/, esperando por condición', async (t) => {
  if (!browser) return t.skip(motivo);
  const d = proyecto(t);
  const sitio = crearSitio();
  t.after(() => sitio.limpiar());
  writeFileSync(join(d, 'c.json'), JSON.stringify({ origen: { carpeta: sitio.dir }, paginas: [{ ruta: '/index.html', tipo: 'portada' }] }));
  const s = salida();
  assert.equal(await capturas(['--config', 'c.json', '--anchos', '360,1280', '--etiqueta', 'dir1'], { stdout: s.stdout, stderr: s.stderr, proyecto: d }), 0, s.o.err);
  assert.deepEqual(readdirSync(join(d, 'design', 'refs', 'dir1')).sort(), ['index-1280-claro.png', 'index-1280-oscuro.png', 'index-360-claro.png', 'index-360-oscuro.png']);
  const png = readFileSync(join(d, 'design', 'refs', 'dir1', 'index-360-oscuro.png'));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.ok(png.length > 1000);
  assert.match(s.o.out, /4 capturas/);
});

test('video graba un webm corto en design/refs/ y no deja el directorio temporal', async (t) => {
  if (!browser) return t.skip(motivo);
  const d = proyecto(t);
  const sitio = crearSitio();
  t.after(() => sitio.limpiar());
  writeFileSync(join(d, 'c.json'), JSON.stringify({ origen: { carpeta: sitio.dir }, paginas: [{ ruta: '/index.html', tipo: 'portada' }] }));
  const s = salida();
  assert.equal(await video(['--config', 'c.json', '--pasos', '3', '--ancho', '800'], { stdout: s.stdout, stderr: s.stderr, proyecto: d }), 0, s.o.err);
  const dir = join(d, 'design', 'refs', 'video');
  assert.deepEqual(readdirSync(dir), ['index-800-oscuro.webm']);
  assert.ok(statSync(join(dir, 'index-800-oscuro.webm')).size > 500);
  assert.ok(!existsSync(join(dir, '.bruto')));
});
