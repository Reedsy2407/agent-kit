// Pruebas de la biblioteca de front que no necesitan navegador: configuración, color, servidor, datos, lista de dist y runner.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizarConfig, cargarConfig, ConfigInvalida, POR_DEFECTO, IDS_PRUEBAS } from '../lib/config.mjs';
import { colorFactory, parseColor, contraste, peorContraste } from '../lib/color.mjs';
import { parseHeaders, rutaCoincide, iniciarServidor } from '../lib/servidor.mjs';
import { buscarDatos, TELEFONO } from '../pruebas/datos.mjs';
import { evaluarDist, globARegex, listarArchivos } from '../pruebas/dist.mjs';
import { mediana, resumen } from '../pruebas/cpu.mjs';
import { main, leerArgumentos, PRUEBAS } from '../run.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const temporal = (t) => { const d = mkdtempSync(join(tmpdir(), 'kit-front-u-')); t.after(() => rmSync(d, { recursive: true, force: true })); return d; };

// --- configuración ---

test('la configuración vacía toma los valores por defecto del brief', () => {
  const c = normalizarConfig({});
  assert.equal(c.umbrales.contrasteTexto, 4.5);
  assert.equal(c.umbrales.objetivoPx, 44);
  assert.equal(c.umbrales.focoPx, 3);
  assert.equal(c.umbrales.textoMinimoPx, 15);
  assert.equal(c.umbrales.texturaAlfaMax, 0.08);
  assert.equal(c.umbrales.pesoPortadaKB, 150);
  assert.equal(c.umbrales.jsKB, 15);
  assert.equal(c.umbrales.fuentesMax, 4);
  assert.deepEqual(c.umbrales.anchosSinDesborde, [360, 768, 1280]);
  assert.deepEqual(c.temas, ['dark', 'light']);
});

test('la configuración fusiona lo que el proyecto cambia y mantiene el resto', () => {
  const c = normalizarConfig({ umbrales: { jsKB: 30 }, paginas: [{ ruta: '/a.html', tipo: 'portada' }] });
  assert.equal(c.umbrales.jsKB, 30);
  assert.equal(c.umbrales.pesoPortadaKB, 150);
  assert.equal(c.paginas.length, 1);
  assert.equal(POR_DEFECTO.umbrales.jsKB, 15, 'los valores por defecto no se alteran');
});

test('una configuración inválida lista todos los errores', () => {
  assert.throws(() => normalizarConfig({ umbrales: { jsKB: -1, objetivoPx: 'x', inventado: 1 }, temas: ['sepia'], paginas: [{ ruta: 'sin-barra', tipo: 'otra' }], cosa: 1, datosSensibles: { patrones: [{ nombre: 'a', regex: '(' }] } }),
    (e) => e instanceof ConfigInvalida && e.errores.length >= 7 && e.errores.some((x) => /cosa/.test(x)) && e.errores.some((x) => /inventado/.test(x)) && e.errores.some((x) => /regex/.test(x)));
  assert.throws(() => normalizarConfig([]), ConfigInvalida);
  assert.throws(() => normalizarConfig({ origen: { url: 'ftp://x' } }), /origen\.url/);
});

test('cargarConfig lee un archivo y falla con claridad si no existe o no es JSON', (t) => {
  const d = temporal(t);
  writeFileSync(join(d, 'a.json'), '{ "umbrales": { "jsKB": 20 } }');
  writeFileSync(join(d, 'b.json'), '{no');
  assert.equal(cargarConfig(join(d, 'a.json')).umbrales.jsKB, 20);
  assert.throws(() => cargarConfig(join(d, 'b.json')), ConfigInvalida);
  assert.throws(() => cargarConfig(join(d, 'no-existe.json')), /no pude leer/);
});

test('la plantilla de configuración es válida y no lleva datos del proyecto de origen', () => {
  const texto = readFileSync(join(aqui, '..', 'front.config.plantilla.json'), 'utf8');
  const c = normalizarConfig(JSON.parse(texto));
  assert.ok(c.paginas.length >= 2);
  assert.equal(c.datosSensibles.telefonos, true);
});

// --- color ---

test('contraste: valores de referencia de WCAG', () => {
  assert.ok(Math.abs(contraste({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }) - 21) < 0.01);
  assert.ok(Math.abs(contraste({ r: 118, g: 118, b: 118 }, { r: 255, g: 255, b: 255 }) - 4.54) < 0.02);
  assert.ok(contraste({ r: 170, g: 170, b: 170 }, { r: 255, g: 255, b: 255 }) < 3);
});

test('parseColor entiende rgb(), rgba(), notación moderna y color(srgb)', () => {
  assert.deepEqual(parseColor('rgb(10, 20, 30)'), { r: 10, g: 20, b: 30, a: 1 });
  assert.deepEqual(parseColor('rgba(10, 20, 30, 0.5)'), { r: 10, g: 20, b: 30, a: 0.5 });
  assert.deepEqual(parseColor('rgb(10 20 30 / 50%)'), { r: 10, g: 20, b: 30, a: 0.5 });
  const s = parseColor('color(srgb 1 0.5 0 / 0.2)');
  assert.equal(s.r, 255); assert.equal(s.g, 127.5); assert.equal(s.a, 0.2);
  assert.equal(parseColor('transparent'), null);
});

test('la fábrica de color es la misma que se inyecta en la página (sin cierres externos)', () => {
  const copia = new Function(`return (${colorFactory.toString()})()`)();
  assert.equal(copia.ratio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }), contraste({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }));
});

test('el peor caso baja el contraste con resplandor y con textura', () => {
  const fg = { r: 90, g: 90, b: 90, a: 1 };
  const bg = { r: 255, g: 255, b: 255, a: 1 };
  const solo = peorContraste({ fg, bg });
  const conBrillo = peorContraste({ fg, bg, resplandor: { r: 0, g: 0, b: 0, a: 0.5 } });
  const conTextura = peorContraste({ fg, bg, texturaAlfa: 0.08 });
  assert.ok(conBrillo < solo && conTextura < solo, `${solo} ${conBrillo} ${conTextura}`);
  assert.equal(peorContraste({ fg, bg, texturaAlfa: 0 }), solo);
});

// --- servidor ---

test('parseHeaders lee bloques, ignora comentarios y rutaCoincide admite un comodín', () => {
  const r = parseHeaders('# nota\n/*\n  A: 1\n  B: dos: tres\n\n/assets/*\n  C: 3\n');
  assert.deepEqual(r, [{ ruta: '/*', cabeceras: [['A', '1'], ['B', 'dos: tres']] }, { ruta: '/assets/*', cabeceras: [['C', '3']] }]);
  assert.ok(rutaCoincide('/assets/*', '/assets/a/b.css') && !rutaCoincide('/assets/*', '/otro'));
  assert.ok(rutaCoincide('/index.html', '/index.html') && !rutaCoincide('/index.html', '/indexxhtml'));
});

test('el servidor sirve la carpeta, aplica _headers, responde 404 con 404.html y no sale de la carpeta', async (t) => {
  const d = temporal(t);
  mkdirSync(join(d, 'raiz')); writeFileSync(join(d, 'secreto.txt'), 'fuera');
  writeFileSync(join(d, 'raiz', 'index.html'), 'hola'); writeFileSync(join(d, 'raiz', '404.html'), 'no hay');
  writeFileSync(join(d, 'raiz', '_headers'), '/*\n  X-Prueba: si\n');
  const s = await iniciarServidor({ carpeta: join(d, 'raiz') });
  t.after(() => s.cerrar());
  const ok = await fetch(`${s.base}/`);
  assert.equal(ok.status, 200); assert.equal(await ok.text(), 'hola'); assert.equal(ok.headers.get('x-prueba'), 'si');
  const no = await fetch(`${s.base}/nada`);
  assert.equal(no.status, 404); assert.equal(await no.text(), 'no hay'); assert.equal(no.headers.get('x-prueba'), 'si');
  const fuera = await fetch(`${s.base}/..%2fsecreto.txt`);
  assert.equal(fuera.status, 404);
  assert.notEqual(await fuera.text(), 'fuera');
});

test('el servidor puede ignorar el _headers de la carpeta', async (t) => {
  const d = temporal(t);
  writeFileSync(join(d, 'index.html'), 'x'); writeFileSync(join(d, '_headers'), '/*\n  X-Prueba: si\n');
  const s = await iniciarServidor({ carpeta: d, cabeceras: false });
  t.after(() => s.cerrar());
  assert.equal((await fetch(`${s.base}/`)).headers.get('x-prueba'), null);
});

// --- datos, dist, cpu ---

const cfg = (datosSensibles = {}) => normalizarConfig({ datosSensibles });

test('buscarDatos detecta teléfonos, patrones y nombres, y respeta «ignorar»', () => {
  assert.equal(buscarDatos('Llámame al +51 999 888 777', cfg()).length, 1);
  assert.deepEqual(buscarDatos('versión 3.3.5, abril 2026 – actualidad', cfg()), []);
  assert.equal(buscarDatos('Hola Fulano', cfg({ nombresProhibidos: ['fulano'] }))[0], 'nombre prohibido «fulano»: «Fulano»');
  assert.equal(buscarDatos('Cliente: ACME-123', cfg({ patrones: [{ nombre: 'cliente', regex: 'ACME-\\d+' }] }))[0], 'cliente: «ACME-123»');
  assert.deepEqual(buscarDatos('Ref 1234567890', cfg({ ignorar: ['Ref \\d+'] })), []);
  assert.deepEqual(buscarDatos('+51 999 888 777', cfg({ telefonos: false })), []);
  assert.deepEqual(buscarDatos('2023-10-21-2024', cfg(), { telefonos: false }), []);
  assert.ok(TELEFONO.test('(01) 234-5678'));
});

test('evaluarDist separa lo no permitido, lo que nunca debe publicarse y lo que falta', () => {
  const permitidos = ['index.html', '404.html', '_headers', 'assets/**'];
  const ok = evaluarDist(['index.html', '404.html', '_headers', 'assets/a.css', 'assets/sub/b.woff2'], { permitidos });
  assert.deepEqual(ok, { fuera: [], prohibidos: [], faltan: [] });
  const mal = evaluarDist(['index.html', '_headers', 'design/DESIGN-BRIEF.md', 'kit/x.json', 'CLAUDE.md', 'package.json', 'tests/a.mjs', 'scripts/p.mjs', '.claude/k.json', 'assets/captura-1.png', 'otro.txt'], { permitidos });
  assert.deepEqual(mal.faltan, ['404.html']);
  for (const f of ['design/DESIGN-BRIEF.md', 'kit/x.json', 'CLAUDE.md', 'package.json', 'tests/a.mjs', 'scripts/p.mjs', '.claude/k.json', 'assets/captura-1.png']) assert.ok(mal.prohibidos.includes(f), f);
  assert.ok(mal.fuera.includes('otro.txt') && mal.fuera.includes('design/DESIGN-BRIEF.md'));
  assert.deepEqual(evaluarDist(['index.html', 'assets/scripts/app.js'], { permitidos: ['index.html', 'assets/**'] }).prohibidos, [], 'una carpeta «scripts» dentro de assets/ es legítima');
  assert.deepEqual(evaluarDist(['index.html', 'x.pdf'], { permitidos: ['index.html', '*.pdf'], prohibidos: ['\\.pdf$'] }).prohibidos, ['x.pdf'], 'el proyecto añade sus propias prohibiciones');
});

test('globARegex: * no cruza carpetas y ** sí', () => {
  assert.ok(globARegex('assets/*').test('assets/a.css') && !globARegex('assets/*').test('assets/s/a.css'));
  assert.ok(globARegex('assets/**').test('assets/s/a.css'));
});

test('listarArchivos recorre en profundidad con rutas relativas con /', (t) => {
  const d = temporal(t);
  mkdirSync(join(d, 'a', 'b'), { recursive: true }); writeFileSync(join(d, 'a', 'b', 'c.txt'), 'x'); writeFileSync(join(d, 'z.txt'), 'x');
  assert.deepEqual(listarArchivos(d).sort(), ['a/b/c.txt', 'z.txt']);
});

test('CPU: mediana y resumen de varias muestras', () => {
  assert.equal(mediana([5, 1, 3]), 3);
  assert.match(resumen([2.5, 1.5, 3.5]), /^mediana 2\.5 % \(rango 1\.5–3\.5 %, 3 muestras\)$/);
});

// --- runner ---

test('leerArgumentos valida las opciones y las pruebas pedidas', () => {
  assert.deepEqual(leerArgumentos(['--solo', 'dist,datos', '--url', 'https://x.org']).solo, ['dist', 'datos']);
  assert.throws(() => leerArgumentos(['--solo', 'inventada']), /prueba desconocida/);
  assert.throws(() => leerArgumentos(['--raro']), /opción desconocida/);
  assert.throws(() => leerArgumentos(['--config']), /necesita un valor/);
  assert.equal(PRUEBAS.length, 9);
});

const salida = () => { const o = { out: '', err: '' }; return { o, stdout: { write: (x) => { o.out += x; } }, stderr: { write: (x) => { o.err += x; } } }; };

test('el runner con --lista imprime las pruebas y sale con 0', async () => {
  const s = salida();
  assert.equal(await main(['--lista'], { stdout: s.stdout, stderr: s.stderr }), 0);
  assert.equal(s.o.out.trim().split('\n').length, 9);
});

test('el runner sale con 2 si la configuración no es válida o no existe', async (t) => {
  const d = temporal(t);
  writeFileSync(join(d, 'c.json'), '{ "umbrales": { "jsKB": -1 } }');
  const s = salida();
  assert.equal(await main(['--config', 'c.json'], { stdout: s.stdout, stderr: s.stderr, proyecto: d }), 2);
  assert.match(s.o.err, /jsKB/);
  assert.equal(await main(['--config', 'no.json'], { ...salida(), proyecto: d }), 2);
});

test('el runner solo con «dist» no necesita navegador: pasa con una lista correcta y falla con una carpeta contaminada', async (t) => {
  const d = temporal(t);
  mkdirSync(join(d, 'dist', 'assets'), { recursive: true });
  for (const f of ['index.html', '404.html', '_headers', 'assets/a.css']) writeFileSync(join(d, 'dist', f), 'x');
  writeFileSync(join(d, 'c.json'), JSON.stringify({ dist: { carpeta: 'dist', permitidos: ['index.html', '404.html', '_headers', 'assets/**'] } }));
  const bien = salida();
  assert.equal(await main(['--config', 'c.json', '--solo', 'dist'], { stdout: bien.stdout, stderr: bien.stderr, proyecto: d }), 0, bien.o.out + bien.o.err);
  mkdirSync(join(d, 'dist', 'design')); writeFileSync(join(d, 'dist', 'design', 'x.md'), 'x');
  const mal = salida();
  assert.equal(await main(['--config', 'c.json', '--solo', 'dist'], { stdout: mal.stdout, stderr: mal.stderr, proyecto: d }), 1);
  assert.match(mal.o.out, /✗ dist\/: nada que no deba publicarse/);
});

test('sin playwright-core el runner explica cómo instalarlo y sale con 2 (el kit no lo instala)', async (t) => {
  const d = temporal(t);
  const previo = process.env.PLAYWRIGHT_CORE;
  delete process.env.PLAYWRIGHT_CORE;
  t.after(() => { if (previo !== undefined) process.env.PLAYWRIGHT_CORE = previo; });
  writeFileSync(join(d, 'c.json'), '{}');
  const s = salida();
  const code = await main(['--config', 'c.json', '--solo', 'datos'], { stdout: s.stdout, stderr: s.stderr, proyecto: d });
  assert.equal(code, 2);
  assert.match(s.o.err, /playwright-core.*no lo instala/);
});

test('las fechas ISO no se leen como teléfonos', () => {
  assert.deepEqual(buscarDatos('Publicado el 2026-10-21 y revisado el 2026-11-02', cfg()), []);
  assert.equal(buscarDatos('Llama al 2026-10-21 o al +51 999 888 777', cfg()).length, 1, 'un teléfono real junto a una fecha sigue detectándose');
});

test('mismoOrigen compara el origen completo, no el prefijo del texto', async () => {
  const { mismoOrigen } = await import('../lib/navegador.mjs');
  assert.equal(mismoOrigen('http://127.0.0.1:4000/a.css', 'http://127.0.0.1:4000'), true);
  assert.equal(mismoOrigen('https://a.com.otro.org/x', 'https://a.com'), false);
  assert.equal(mismoOrigen('http://127.0.0.1:40001/x', 'http://127.0.0.1:4000'), false);
  assert.equal(mismoOrigen('no es url', 'https://a.com'), false);
});

test('una sección de configuración que no es un objeto es ConfigInvalida, no un TypeError', () => {
  for (const sec of ['umbrales', 'selectores', 'dist', 'origen']) assert.throws(() => normalizarConfig({ [sec]: null }), (e) => e instanceof ConfigInvalida && e.errores.some((x) => x.startsWith(`${sec} debe ser un objeto`)), sec);
});

test('--carpeta gana a la URL de la configuración (y --url gana a ambas)', async (t) => {
  const d = temporal(t);
  mkdirSync(join(d, 'dist'));
  for (const f of ['index.html', '404.html', '_headers']) writeFileSync(join(d, 'dist', f), 'x');
  writeFileSync(join(d, 'c.json'), JSON.stringify({ origen: { url: 'https://no-debe-usarse.invalid' }, dist: { carpeta: 'dist', permitidos: ['index.html', '404.html', '_headers'] } }));
  // «dist» no necesita servidor ni navegador: con --solo dist solo comprobamos que la combinación de opciones es válida.
  const s = salida();
  assert.equal(await main(['--config', 'c.json', '--carpeta', 'dist', '--solo', 'dist'], { stdout: s.stdout, stderr: s.stderr, proyecto: d }), 0, s.o.out + s.o.err);
});

test('el servidor nunca queda en un puerto que Chrome bloquea (antes fallaba al azar con ERR_UNSAFE_PORT)', async (t) => {
  const { PUERTOS_NO_SEGUROS } = await import('../lib/servidor.mjs');
  assert.ok(PUERTOS_NO_SEGUROS.has(6666) && PUERTOS_NO_SEGUROS.has(6000) && PUERTOS_NO_SEGUROS.has(10080));
  const d = temporal(t);
  writeFileSync(join(d, 'index.html'), 'x');
  const abiertos = [];
  t.after(() => Promise.all(abiertos.map((s) => s.cerrar())));
  for (let i = 0; i < 40; i++) {
    const s = await iniciarServidor({ carpeta: d });
    abiertos.push(s);
    assert.ok(!PUERTOS_NO_SEGUROS.has(Number(new URL(s.base).port)), s.base);
  }
});

// --- 0.4.0: pruebas.<id>: false apaga una prueba desde la configuración ---
test('pruebas.<id>: false apaga esa prueba, lo avisa y no la carga; el resto de la configuración no cambia', async () => {




  assert.ok(IDS_PRUEBAS.every((id) => normalizarConfig({}).pruebas[id] === true), 'por defecto todas activas');
  assert.throws(() => normalizarConfig({ pruebas: { dist: 'no' } }), /pruebas\.dist debe ser true o false/);
  assert.throws(() => normalizarConfig({ pruebas: { inventada: false } }), /pruebas\.inventada: clave desconocida/);
  const dir = mkdtempSync(join(tmpdir(), 'front-apagar-'));
  try {
    writeFileSync(join(dir, 'f.json'), JSON.stringify({ pruebas: Object.fromEntries(IDS_PRUEBAS.map((id) => [id, false])) }));
    let salida = '';
    let error = '';
    const codigo = await main(['--config', 'f.json'], { stdout: { write: (t) => { salida += t; } }, stderr: { write: (t) => { error += t; } }, proyecto: dir });
    assert.equal(codigo, 2, 'sin ninguna prueba por ejecutar no se pasa en verde (el sello no probaría nada)');
    assert.match(error, /no queda ninguna prueba/);
    for (const id of IDS_PRUEBAS) assert.match(salida, new RegExp(`- ${id}: desactivada en la configuración`));
    // Una sola prueba que no necesita navegador sigue corriendo y pasa.
    writeFileSync(join(dir, 'g.json'), JSON.stringify({ pruebas: Object.fromEntries(IDS_PRUEBAS.filter((id) => id !== 'dist').map((id) => [id, false])) }));
    salida = '';
    assert.equal(await main(['--config', 'g.json'], { stdout: { write: (t) => { salida += t; } }, stderr: { write: () => {} }, proyecto: dir }), 0, salida);
    assert.doesNotMatch(salida, /- dist: desactivada/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
