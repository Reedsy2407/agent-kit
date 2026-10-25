// Etapa 2C: arreglos de la biblioteca de front salidos de usarla en un repo real. Lo que no necesita navegador corre
// siempre; lo demás se omite (con el motivo) si no hay playwright-core o Chrome.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { normalizarConfig, ConfigInvalida, porTema, clicDe, clicAplica } from '../lib/config.mjs';
import { crearInforme, resumen, formatear } from '../lib/informe.mjs';
import { leerPrivados, conPrivados, buscarDatos, patronesDe } from '../pruebas/datos.mjs';
import { familiaDeFuente, licenciaAnotada } from '../pruebas/peso.mjs';
import { escucharSeguro } from '../lib/servidor.mjs';
import * as contraste from '../pruebas/contraste.mjs';
import * as layout from '../pruebas/layout.mjs';
import * as movimiento from '../pruebas/movimiento.mjs';
import * as peso from '../pruebas/peso.mjs';
import * as datos from '../pruebas/datos.mjs';
import { abrirNavegador, crearSitio, configDe, correr, CSS_BUENO, HTML_BUENO } from './_ayudas.mjs';

const temporal = (t) => { const d = mkdtempSync(join(tmpdir(), 'kit-front-2c-')); t.after(() => rmSync(d, { recursive: true, force: true })); return d; };
const invalida = (entrada, patron) => assert.throws(() => normalizarConfig(entrada), (e) => e instanceof ConfigInvalida && patron.test(e.message), JSON.stringify(entrada));

// --- configuración ---
test('texturaAlfaMax y contraste.texturas aceptan un valor único o uno por tema, y validan', () => {
  const c = normalizarConfig({ umbrales: { texturaAlfaMax: { dark: 0.08, light: 0.04 } }, contraste: { texturas: { dark: 'oscurecen', light: 'ambas' } } });
  assert.equal(porTema(c.umbrales.texturaAlfaMax, 'light'), 0.04);
  assert.equal(porTema(c.contraste.texturas, 'dark'), 'oscurecen');
  assert.equal(porTema(0.08, 'dark'), 0.08);
  assert.equal(normalizarConfig({}).contraste.texturas, 'auto');
  invalida({ umbrales: { texturaAlfaMax: { dark: 0.08 } } }, /texturaAlfaMax/);
  invalida({ umbrales: { texturaAlfaMax: { dark: 2, light: 0.1 } } }, /texturaAlfaMax/);
  invalida({ contraste: { texturas: 'claras' } }, /contraste\.texturas/);
  invalida({ contraste: { texturas: { dark: 'auto' } } }, /contraste\.texturas/);
  invalida({ contraste: { otra: 1 } }, /contraste\.otra: clave desconocida/);
});

test('clics acepta selectores y { selector, anchoMin, anchoMax }, y rechaza lo mal formado', () => {
  const c = normalizarConfig({ paginas: [{ ruta: '/', tipo: 'portada', clics: ['#a', { selector: '#b', anchoMax: 600 }] }] });
  assert.deepEqual(c.paginas[0].clics.map(clicDe), [{ selector: '#a' }, { selector: '#b', anchoMax: 600 }]);
  assert.equal(clicAplica({ selector: '#b', anchoMax: 600 }, 360), true);
  assert.equal(clicAplica({ selector: '#b', anchoMax: 600 }, 768), false);
  assert.equal(clicAplica({ selector: '#b', anchoMin: 1000 }, 768), false);
  assert.equal(clicAplica({ selector: '#b' }, 5000), true);
  for (const mal of [[{ selector: '' }], [{ selector: '#b', anchoMax: 'x' }], [{ selector: '#b', otro: 1 }], [3], '#a']) {
    invalida({ paginas: [{ ruta: '/', tipo: 'portada', clics: mal }] }, /clics/);
  }
});

test('los patrones aceptan ámbitos y la configuración acepta el archivo de datos privados', () => {
  const c = normalizarConfig({ datosSensibles: { archivoPrivado: 'tests/front/datos-privados.json', patrones: [{ nombre: 'x', regex: 'x', ambitos: ['atributos'] }] } });
  assert.equal(c.datosSensibles.archivoPrivado, 'tests/front/datos-privados.json');
  assert.equal(normalizarConfig({}).datosSensibles.archivoPrivado, null);
  assert.equal(normalizarConfig({}).datosSensibles.archivoPrivadoObligatorio, false);
  invalida({ datosSensibles: { patrones: [{ nombre: 'x', regex: 'x', ambitos: ['pantalla'] }] } }, /ambitos/);
  invalida({ datosSensibles: { patrones: [{ nombre: 'x', regex: 'x', ambitos: [] }] } }, /ambitos/);
  invalida({ datosSensibles: { archivoPrivado: 3 } }, /archivoPrivado/);
  invalida({ datosSensibles: { archivoPrivadoObligatorio: 'sí' } }, /archivoPrivadoObligatorio/);
});

// --- datos: ámbito de los patrones y datos privados ---
test('un patrón con ámbito «atributos» no se compara con el texto visible (el caso «whatsapp»)', () => {
  const cfg = (patrones) => normalizarConfig({ datosSensibles: { telefonos: false, patrones } });
  const sinAmbito = cfg([{ nombre: 'mensajería', regex: 'whatsapp' }]);
  const conAmbito = cfg([{ nombre: 'mensajería', regex: 'whatsapp', ambitos: ['atributos'] }]);
  assert.equal(buscarDatos('Trabajé con WhatsApp e IA', sinAmbito, { ambito: 'visible' }).length, 1, 'sin ámbito se busca en todos, como antes');
  assert.deepEqual(buscarDatos('Trabajé con WhatsApp e IA', conAmbito, { ambito: 'visible' }), []);
  assert.equal(buscarDatos('https://api.whatsapp.com/send', conAmbito, { ambito: 'atributos' }).length, 1);
  assert.deepEqual(buscarDatos('https://api.whatsapp.com/send', conAmbito, { ambito: 'codigo' }), []);
  assert.equal(patronesDe(sinAmbito).length, 1, 'sin ámbito pedido, todos los patrones');
});

test('leerPrivados distingue no configurado, ausente, inválido, vacío y con datos', (t) => {
  const d = temporal(t);
  const cfg = (extra = {}) => normalizarConfig({ datosSensibles: { archivoPrivado: 'tests/front/datos-privados.json', ...extra } });
  assert.equal(leerPrivados(normalizarConfig({}), d).estado, 'no-configurado');
  assert.equal(leerPrivados(cfg(), d).estado, 'ausente');
  const ruta = join(d, 'tests', 'front', 'datos-privados.json');
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, '{ roto');
  assert.match(leerPrivados(cfg(), d).errores[0], /no es JSON válido/);
  for (const [texto, patron] of [['[]', /objeto/], ['{"nombresProhibidos":[1]}', /nombresProhibidos/], ['{"patrones":[{"nombre":"x","regex":"("}]}', /expresión válida/], ['{"patrones":[{"nombre":"x","regex":"a","ambitos":["zzz"]}]}', /ambitos/], ['{"otra":1}', /clave desconocida/]]) {
    writeFileSync(ruta, texto);
    const r = leerPrivados(cfg(), d);
    assert.equal(r.estado, 'invalido', texto);
    assert.match(r.errores.join(' '), patron, texto);
  }
  writeFileSync(ruta, '{"_ayuda":"x","nombresProhibidos":[],"patrones":[]}');
  assert.deepEqual([leerPrivados(cfg(), d).estado, leerPrivados(cfg(), d).nombresProhibidos], ['ok', []]);
  writeFileSync(ruta, '{"nombresProhibidos":["Cliente Real"],"patrones":[{"nombre":"ref","regex":"REF-\\\\d+"}]}');
  const p = leerPrivados(cfg(), d);
  const unida = conPrivados(cfg({ nombresProhibidos: ['Público'] }), p);
  assert.deepEqual(unida.datosSensibles.nombresProhibidos, ['Público', 'Cliente Real']);
  assert.equal(unida.datosSensibles.patrones.length, 1);
  assert.deepEqual(buscarDatos('trabajé para cliente real', unida), ['nombre prohibido «Cliente Real»: «cliente real»']);
  assert.deepEqual(cfg().datosSensibles.nombresProhibidos, [], 'la configuración original no se modifica');
});

test('el informe distingue avisos: no fallan, se imprimen con «!» y se cuentan', () => {
  const i = crearInforme();
  i.check('a', true);
  i.aviso('datos privados', 'no existe el archivo');
  i.info('i', 'x');
  assert.deepEqual(resumen([i]), { total: 1, fallos: 0, avisos: 1 });
  assert.match(formatear('p', i), /! AVISO: datos privados — no existe el archivo/);
});

// --- puertos ---
test('escucharSeguro vuelve a pedir puerto cuando el sistema da uno que fetch y Chrome bloquean (el reintento, forzado)', async () => {
  const puertos = [6666, 6000, 40123];
  let cierres = 0;
  const falso = {
    once() {}, off() {},
    listen(_p, _h, cb) { cb(); },
    address: () => ({ port: puertos[0] }),
    close(cb) { cierres += 1; puertos.shift(); cb(); },
  };
  assert.equal(await escucharSeguro(falso), 40123);
  assert.equal(cierres, 2, 'cerró y reintentó por cada puerto bloqueado');
});

// --- licencias ---
test('familiaDeFuente y licenciaAnotada: el registro puede identificar la familia y su licencia de otra forma', () => {
  assert.equal(familiaDeFuente('geist-mono-latin-400-normal.woff2'), 'geist-mono');
  assert.equal(familiaDeFuente('Inter-Regular.woff2'), 'Inter');
  assert.equal(familiaDeFuente('mi-fuente.woff2'), 'mi-fuente');
  const registro = '- Pixelify Sans 700 (títulos). © 2021 The Pixelify Project Authors. LICENSE-pixelify-OFL.txt\n- Geist Mono 400 y 700: SIL Open Font License 1.1\nInstrument Sans se usa para el texto';
  assert.equal(licenciaAnotada(registro, 'pixelify-sans-latin-700-normal.woff2'), 'familia');
  assert.equal(licenciaAnotada(registro, 'geist-mono-latin-400-normal.woff2'), 'familia');
  assert.equal(licenciaAnotada(registro, 'instrument-sans-latin-400-normal.woff2'), null, 'nombrar la familia sin licencia no basta');
  assert.equal(licenciaAnotada('| mi-fuente | OFL |', 'mi-fuente.woff2'), 'archivo', 'el nombre de archivo sigue valiendo');
  assert.equal(licenciaAnotada('| otra-fuente | OFL |', 'mi-fuente.woff2'), null);
  assert.equal(licenciaAnotada('| xy | OFL |', 'ab.woff2'), null, 'una familia demasiado corta no se acepta por coincidencia');
  assert.equal(licenciaAnotada('| xab | OFL |', 'ab-latin-400-normal.woff2'), null, 'ni dentro de otra palabra de dos letras');
});

// --- con navegador ---
let browser = null;
let motivo = null;
before(async () => { ({ browser, motivo } = await abrirNavegador()); });
after(async () => { await browser?.close(); });

const css = (extra) => ({ css: CSS_BUENO + extra });
const SVG = (relleno, alfa) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect y='3' width='4' height='1' fill='${relleno}' fill-opacity='${alfa}'/%3E%3C/svg%3E")`;
const nombres = (res, patron) => res.filter((r) => patron.test(r.nombre));
async function ejecutar(t, modulo, opciones, config) {
  if (!browser) { t.skip(motivo); return null; }
  const sitio = crearSitio(opciones);
  t.after(() => sitio.limpiar());
  return correr(modulo, sitio, browser, config);
}

// Texto gris sobre fondo casi negro con una textura de líneas NEGRAS: la textura solo oscurece, así que el contraste mejora.
// Con una capa clara añadida (el peor caso genérico) el mismo texto bajaría de 4,5.
const OSCURA = css(`.textura { background-color: #111111; background-image: ${SVG('%23000000', '.06')}; color: #808080; }`);

test('contraste: una textura que solo oscurece no suma la capa clara (auto lee la textura real)', async (t) => {
  const res = await ejecutar(t, contraste, OSCURA, configDe());
  if (!res) return;
  assert.ok(nombres(res, /textos ≥ AA/).every((r) => r.ok), JSON.stringify(res));
});

test('contraste: "ambas" y "aclaran" siguen siendo el peor caso y fallan con el mismo sitio; "oscurecen" pasa', async (t) => {
  if (!browser) return t.skip(motivo);
  for (const [modo, ok] of [['ambas', false], ['aclaran', false], ['oscurecen', true], ['auto', true]]) {
    const res = await ejecutar(t, contraste, OSCURA, configDe({ contraste: { texturas: modo } }));
    assert.ok(nombres(res, /textos ≥ AA/).every((r) => r.ok === ok), `${modo}: ${JSON.stringify(nombres(res, /textos/))}`);
  }
});

test('contraste: si la textura no se puede leer, auto vuelve al peor caso con ambas capas', async (t) => {
  const png = css(`.textura { background-color: #111111; background-image: url("data:image/png;base64,iVBORw0KGgo="); color: #808080; }`);
  const res = await ejecutar(t, contraste, png, configDe());
  if (!res) return;
  assert.ok(nombres(res, /textos ≥ AA/).some((r) => !r.ok), 'sin poder leerla se asume el peor caso');
});

test('contraste: el tope de la textura se ajusta por tema', async (t) => {
  if (!browser) return t.skip(motivo);
  const ambas = { contraste: { texturas: 'ambas' } };
  const bajo = await ejecutar(t, contraste, OSCURA, configDe({ ...ambas, umbrales: { texturaAlfaMax: { dark: 0.01, light: 0.01 } } }));
  assert.ok(nombres(bajo, /textos ≥ AA/).every((r) => r.ok), 'con tope bajo en los dos temas pasa');
  const mixto = await ejecutar(t, contraste, OSCURA, configDe({ ...ambas, umbrales: { texturaAlfaMax: { dark: 0.01, light: 0.08 } } }));
  assert.ok(nombres(mixto, /\(oscuro\)/).every((r) => r.ok), 'oscuro con 1 %');
  assert.ok(nombres(mixto, /\(claro\)/).some((r) => !r.ok), 'claro con 8 % falla');
  const porModo = await ejecutar(t, contraste, OSCURA, configDe({ contraste: { texturas: { dark: 'oscurecen', light: 'ambas' } } }));
  assert.ok(nombres(porModo, /\(oscuro\)/).every((r) => r.ok) && nombres(porModo, /\(claro\)/).some((r) => !r.ok), 'el modo también es por tema');
});

test('movimiento: las texturas se miden en cada tema, no solo en el oscuro', async (t) => {
  if (!browser) return t.skip(motivo);
  const soloClaro = css(`@media (prefers-color-scheme: light) { .textura { background-image: ${SVG('%23000000', '.2')}; } }`);
  const res = await ejecutar(t, movimiento, soloClaro, configDe());
  assert.ok(nombres(res, /\(oscuro\): texturas/).every((r) => r.ok), 'en oscuro está bien');
  assert.ok(nombres(res, /\(claro\): texturas/).some((r) => !r.ok), 'en claro supera el 8 %');
  const tope = await ejecutar(t, movimiento, {}, configDe({ umbrales: { texturaAlfaMax: { dark: 0.08, light: 0.02 } } }));
  assert.ok(nombres(tope, /\(oscuro\): texturas/).every((r) => r.ok) && nombres(tope, /\(claro\): texturas/).some((r) => !r.ok), 'el tope por tema se aplica');
});

// --- clics ---
const MENU = '<button id="menu" type="button">Menú</button>';
const SOLO_MOVIL = '@media (min-width: 600px) { #menu { display: none; } }';

test('layout: un clic limitado por ancho solo se hace donde aplica y el resto de la prueba sigue', async (t) => {
  const config = configDe({ paginas: [{ ruta: '/index.html', tipo: 'portada', clics: [{ selector: '#menu', anchoMax: 599 }] }] });
  const res = await ejecutar(t, layout, { html: HTML_BUENO(MENU), css: CSS_BUENO + SOLO_MOVIL }, config);
  if (!res) return;
  assert.equal(nombres(res, /clic en/).length, 0, JSON.stringify(nombres(res, /clic en|objetivos/)));
  assert.ok(nombres(res, /foco visible/).length > 0, 'la prueba llegó hasta el foco');
});

test('layout: un selector ausente da un fallo claro en segundos, sin colgarse ni abortar lo demás', async (t) => {
  const config = configDe({ paginas: [{ ruta: '/index.html', tipo: 'portada', clics: ['#no-existe'] }] });
  const t0 = Date.now();
  const res = await ejecutar(t, layout, {}, config);
  if (!res) return;
  const lento = Date.now() - t0;
  const clics = nombres(res, /clic en «#no-existe»/);
  assert.ok(clics.length >= 2 && clics.every((r) => !r.ok), `un fallo por ancho: ${JSON.stringify(clics)}`);
  assert.match(clics[0].detalle, /en 3 s/);
  assert.match(clics[0].detalle, /anchoMin\/anchoMax/);
  assert.ok(nombres(res, /foco visible/).length > 0 && nombres(res, /sin desborde/).every((r) => r.ok), 'lo demás se sigue comprobando');
  assert.ok(lento < 60000, `tardó ${lento} ms`);
});

test('layout: un clic sin límite de ancho sobre un elemento que solo existe en móvil falla donde no está', async (t) => {
  const config = configDe({ paginas: [{ ruta: '/index.html', tipo: 'portada', clics: ['#menu'] }] });
  const res = await ejecutar(t, layout, { html: HTML_BUENO(MENU), css: CSS_BUENO + SOLO_MOVIL }, config);
  if (!res) return;
  const mal = nombres(res, /clic en «#menu»/).filter((r) => !r.ok);
  assert.ok(mal.length > 0 && mal.every((r) => !/ 360 px/.test(r.nombre)), `falla en los anchos grandes y no en 360: ${mal.map((r) => r.nombre)}`);
});

// --- licencias con navegador ---
test('peso: el registro puede nombrar la familia y su licencia sin repetir el nombre del archivo', async (t) => {
  if (!browser) return t.skip(motivo);
  const html = HTML_BUENO('<p class="f1">Texto</p>');
  const base = css('@font-face { font-family: F1; src: url(/assets/mi-fuente-latin-400-normal.woff2) format("woff2"); } .f1 { font-family: F1; }');
  for (const [registro, ok] of [['- Mi Fuente 400: SIL Open Font License 1.1', true], ['- Mi Fuente 400 se usa en el texto', false], ['- Otra Fuente: OFL', false]]) {
    const res = await ejecutar(t, peso, { html, css: base.css, extra: { 'assets/mi-fuente-latin-400-normal.woff2': 'x', 'design/TOOLING.md': registro } }, configDe({ fuentes: { licencias: 'design/TOOLING.md' } }));
    assert.equal(nombres(res, /licencia anotada/).every((r) => r.ok), ok, registro);
  }
});

// --- datos privados con navegador ---
const PRIVADO = (nombresProhibidos, patrones = []) => ({ 'tests/front/datos-privados.json': JSON.stringify({ nombresProhibidos, patrones }) });
const conArchivo = { datosSensibles: { archivoPrivado: 'tests/front/datos-privados.json' } };

test('datos privados: los nombres del archivo local se buscan aunque la configuración versionada no los tenga', async (t) => {
  const html = HTML_BUENO('<p>Proyecto para Cliente Secreto SA</p>');
  const con = await ejecutar(t, datos, { html, extra: PRIVADO(['cliente secreto']) }, configDe(conArchivo));
  if (!con) return;
  assert.ok(nombres(con, /texto visible/).some((r) => !r.ok && /cliente secreto/.test(r.detalle)), JSON.stringify(nombres(con, /texto visible/)));
  assert.match(nombres(con, /datos privados/)[0].detalle, /1 nombre/);
  const sin = await ejecutar(t, datos, { html }, configDe({}));
  assert.ok(nombres(sin, /texto visible/).every((r) => r.ok), 'sin archivo configurado no hay nada que buscar (y no se avisa de lo que no se pidió)');
  assert.equal(sin.some((r) => r.aviso), false);
});

test('datos privados: sin el archivo la prueba AVISA claramente en vez de pasar en silencio; con «obligatorio» falla', async (t) => {
  const html = HTML_BUENO('<p>Texto normal</p>');
  const aviso = await ejecutar(t, datos, { html }, configDe(conArchivo));
  if (!aviso) return;
  const a = nombres(aviso, /datos privados/);
  assert.equal(a.length, 1);
  assert.equal(a[0].aviso, true);
  assert.match(a[0].detalle, /no existe tests\/front\/datos-privados\.json.*no se comprueban/);
  assert.equal(resumen([{ resultados: aviso }]).avisos, 1);
  assert.equal(resumen([{ resultados: aviso }]).fallos, 0, 'un aviso no rompe a quien clona el repositorio');
  const duro = await ejecutar(t, datos, { html }, configDe({ datosSensibles: { archivoPrivado: 'tests/front/datos-privados.json', archivoPrivadoObligatorio: true } }));
  assert.ok(nombres(duro, /datos privados/).some((r) => !r.ok), 'obligatorio: falla');
  const vacio = await ejecutar(t, datos, { html, extra: PRIVADO([]) }, configDe(conArchivo));
  assert.equal(nombres(vacio, /datos privados/)[0].aviso, true, 'un archivo vacío también avisa');
  const roto = await ejecutar(t, datos, { html, extra: { 'tests/front/datos-privados.json': '{ roto' } }, configDe(conArchivo));
  assert.ok(nombres(roto, /datos privados/).some((r) => !r.ok && /JSON/.test(r.detalle)), 'un archivo roto falla');
});

test('datos: un patrón con ámbito «atributos» detecta un enlace pero no la palabra en el texto visible', async (t) => {
  const patron = { datosSensibles: { patrones: [{ nombre: 'zeta', regex: 'zeta-link', ambitos: ['atributos'] }] } };
  const visible = await ejecutar(t, datos, { html: HTML_BUENO('<p>Hablo de zeta-link en el texto</p>') }, configDe(patron));
  if (!visible) return;
  assert.ok(nombres(visible, /sin datos sensibles/).every((r) => r.ok), 'el texto visible no se compara');
  const enlace = await ejecutar(t, datos, { html: HTML_BUENO('<a href="https://ejemplo.org/zeta-link">x</a>') }, configDe(patron));
  assert.ok(nombres(enlace, /atributos/).some((r) => !r.ok), 'el enlace sí');
});

// --- contraste auto: lo que no entiende cae al peor caso (hallazgo de la revisión) ---
const SVG_CRUDO = (interior, raiz = '') => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='4' height='4'${raiz}>${interior}</svg>`)}")`;
test('contraste auto: un SVG que no se puede interpretar con seguridad se mide con el peor caso, no como textura oscura', async (t) => {
  if (!browser) return t.skip(motivo);
  const casos = {
    'fill heredado del <svg>': SVG_CRUDO("<rect y='3' width='4' height='1' opacity='.06'/>", " fill='white'"),
    'fill en style': SVG_CRUDO("<rect y='3' width='4' height='1' style='fill:white' opacity='.06'/>"),
    'sin fill (negro por defecto, pero no se asume)': SVG_CRUDO("<rect y='3' width='4' height='1' opacity='.06'/>"),
    'dentro de un <g>': SVG_CRUDO("<g fill='white'><rect y='3' width='4' height='1' fill-opacity='.06'/></g>"),
    'con filtro de ruido': SVG_CRUDO("<filter id='n'><feTurbulence baseFrequency='.8'/></filter><rect width='4' height='4' filter='url(%23n)' fill='black' fill-opacity='.06'/>"),
    'con trazo': SVG_CRUDO("<rect y='3' width='4' height='1' fill='black' fill-opacity='.06' stroke='white'/>"),
    'alfa en porcentaje': SVG_CRUDO("<rect y='3' width='4' height='1' fill='black' fill-opacity='6%'/>"),
  };
  for (const [nombre, imagen] of Object.entries(casos)) {
    const res = await ejecutar(t, contraste, css(`.textura { background-color: #111111; background-image: ${imagen}; color: #808080; }`), configDe());
    assert.ok(nombres(res, /textos ≥ AA/).some((r) => !r.ok), `${nombre}: debía caer al peor caso y fallar`);
  }
  const bueno = await ejecutar(t, contraste, css(`.textura { background-color: #111111; background-image: ${SVG_CRUDO("<rect y='3' width='4' height='1' fill='black' fill-opacity='.06'/>")}; color: #808080; }`), configDe());
  assert.ok(nombres(bueno, /textos ≥ AA/).every((r) => r.ok), 'el caso simple y legible sigue pasando');
});

test('contraste auto: formas que no se interpretan (polyline, text, image, use) y los degradados junto a la textura caen al peor caso', async (t) => {
  if (!browser) return t.skip(motivo);
  const blanca = "<rect y='3' width='4' height='1' fill='white' fill-opacity='.06'/>";
  const casos = {
    'polyline oscura sin medir': { imagen: SVG_CRUDO(`<polyline points='0,0 4,4'/>${blanca}`), extra: '' },
    'text': { imagen: SVG_CRUDO(`<text>x</text>${blanca}`), extra: '' },
    'image': { imagen: SVG_CRUDO(`<image href='data:,x'/>${blanca}`), extra: '' },
    'use': { imagen: SVG_CRUDO(`<use href='%23a'/>${blanca}`), extra: '' },
    'degradado junto a la textura': { imagen: `linear-gradient(rgba(0,0,0,.9), transparent), ${SVG_CRUDO("<rect y='3' width='4' height='1' fill='black' fill-opacity='.06'/>")}`, extra: '' },
  };
  for (const [nombre, { imagen }] of Object.entries(casos)) {
    // Con texto claro sobre fondo oscuro la capa blanca (peor caso) falla; solo la lista blanca la leería como "oscurecedora".
    const res = await ejecutar(t, contraste, css(`.textura { background-color: #111111; background-image: ${imagen}; color: #808080; }`), configDe());
    assert.ok(nombres(res, /textos ≥ AA/).some((r) => !r.ok), `${nombre}: debía caer al peor caso y fallar`);
  }
});

// --- 0.4.0: varias capas de textura apiladas se unen en vez de caer al peor caso ---
test('contraste auto: dos capas oscuras que solo oscurecen (en una lista o anidadas) se unen y pasan; si una aclara, falla', async (t) => {
  if (!browser) return t.skip(motivo);
  const dosEnLista = css(`.textura { background-color: #111111; background-image: ${SVG('%23000000', '.06')}, ${SVG('%23000000', '.06')}; color: #808080; }`);
  const anidadas = css(`main { background-color: #111111; background-image: ${SVG('%23000000', '.06')}; } .textura { background-color: transparent; background-image: ${SVG('%23000000', '.06')}; color: #808080; }`);
  for (const [nombre, sitio] of Object.entries({ 'dos en la misma lista': dosEnLista, 'una en el ancestro y otra en el elemento': anidadas })) {
    const res = await ejecutar(t, contraste, sitio, configDe({ temas: ['dark'] }));
    assert.ok(nombres(res, /textos ≥ AA/).every((r) => r.ok), `${nombre}: ${JSON.stringify(nombres(res, /textos/))}`);
  }
  const unaClara = css(`.textura { background-color: #111111; background-image: ${SVG('%23000000', '.06')}, ${SVG('%23ffffff', '.3')}; color: #808080; }`);
  const mala = await ejecutar(t, contraste, unaClara, configDe());
  assert.ok(nombres(mala, /textos ≥ AA/).some((r) => !r.ok), 'si una de las capas aclara de verdad, el contraste baja y debe fallar');
  const conDegradado = css(`.textura { background-color: #111111; background-image: ${SVG('%23000000', '.06')}, linear-gradient(rgba(0,0,0,.2), transparent); color: #808080; }`);
  const peor = await ejecutar(t, contraste, conDegradado, configDe());
  assert.ok(nombres(peor, /textos ≥ AA/).some((r) => !r.ok), 'una capa ilegible (degradado) vuelve al peor caso');
});
