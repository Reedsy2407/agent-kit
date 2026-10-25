// Pruebas de integración de la biblioteca de front con un navegador real. Se omiten (y se dice por qué) si no hay
// playwright-core o Chrome: el kit no los instala. Para correrlas: PLAYWRIGHT_CORE=<carpeta de playwright-core>
// y, si Chrome no está en la ruta habitual, CHROMIUM_PATH=<chrome>.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirNavegador, crearSitio, configDe, correr, paso, CSS_BUENO, HTML_BUENO, CABECERAS_BUENAS } from './_ayudas.mjs';
import * as contraste from '../pruebas/contraste.mjs';
import * as layout from '../pruebas/layout.mjs';
import * as movimiento from '../pruebas/movimiento.mjs';
import * as peso from '../pruebas/peso.mjs';
import * as contenido from '../pruebas/contenido.mjs';
import * as datos from '../pruebas/datos.mjs';
import * as csp from '../pruebas/csp.mjs';
import * as cpu from '../pruebas/cpu.mjs';

let browser = null;
let motivo = null;
before(async () => { ({ browser, motivo } = await abrirNavegador()); });
after(async () => { await browser?.close(); });

/** Cada caso: construye un sitio (bueno o con un defecto), corre la prueba y mira una comprobación concreta. */
async function caso(t, modulo, opciones, patron, esperado, config) {
  if (!browser) { t.skip(motivo); return; }
  const sitio = crearSitio(opciones);
  try {
    const res = await correr(modulo, sitio, browser, config);
    assert.equal(paso(res, patron), esperado, res.filter((r) => patron.test(r.nombre)).map((r) => `${r.nombre} — ${r.detalle}`).join('\n'));
  } finally { sitio.limpiar(); }
}

const css = (extra) => ({ css: CSS_BUENO + extra });

// --- contraste ---
test('contraste: el sitio bueno cumple AA en ambos temas', (t) => caso(t, contraste, {}, /textos ≥ AA/, true));
test('contraste: texto gris claro sobre blanco falla', (t) => caso(t, contraste, css(':root { --texto: light-dark(#aaaaaa, #555555); }'), /textos ≥ AA/, false));
test('contraste: pasa solo sin textura pero falla con el peor caso de la textura', (t) => caso(t, contraste,
  css(':root { --texto: light-dark(#767676, #8a8a8a); } .textura { color: #767676; background-color: #fff; }'), /textos ≥ AA/, false));
test('contraste: el resplandor del texto cuenta como fondo', (t) => caso(t, contraste,
  css('h1 { color: #444444; text-shadow: 0 0 10px rgba(0, 0, 0, 0.9); }'), /textos ≥ AA/, false, configDe({ temas: ['light'] })));

// --- layout ---
test('layout: el sitio bueno cumple desborde, objetivos, texto y foco', async (t) => {
  if (!browser) return t.skip(motivo);
  const sitio = crearSitio();
  try {
    const res = await correr(layout, sitio, browser);
    assert.ok(res.length >= 10);
    assert.deepEqual(res.filter((r) => !r.ok).map((r) => `${r.nombre} — ${r.detalle}`), []);
  } finally { sitio.limpiar(); }
});
test('layout: un elemento más ancho que la pantalla provoca desborde', (t) => caso(t, layout, css('.ancho { width: 2000px; height: 10px; background: #888; }') && { css: CSS_BUENO + '.ancho { width: 2000px; height: 10px; }', html: HTML_BUENO('<div class="ancho"></div>') }, /360 px.*sin desborde/, false));
test('layout: un botón de 20 px no cumple el objetivo táctil', (t) => caso(t, layout, css('.btn { min-height: 20px; height: 20px; }'), /objetivos de 44 px/, false));
test('layout: sin contorno de foco falla', (t) => caso(t, layout, css(':focus-visible { outline: none; }'), /foco visible/, false));
test('layout: contorno de foco de 1 px falla', (t) => caso(t, layout, css(':focus-visible { outline: 1px solid red; }'), /foco visible/, false));
test('layout: texto de 12 px falla el mínimo', (t) => caso(t, layout, css('footer p { font-size: 12px; }'), /texto ≥ 15 px/, false));
test('layout: la base de 18 px solo se exige si se configura', async (t) => {
  await caso(t, layout, css('body { font-size: 16px; }'), /texto base/, false, configDe({ umbrales: { textoBasePx: 18 } }));
});

// --- movimiento ---
test('movimiento: el sitio bueno anima solo opacity y transform, no parpadea y respeta reduced-motion', async (t) => {
  if (!browser) return t.skip(motivo);
  const sitio = crearSitio();
  try {
    const res = await correr(movimiento, sitio, browser);
    assert.ok(res.length >= 6);
    assert.deepEqual(res.filter((r) => !r.ok).map((r) => `${r.nombre} — ${r.detalle}`), []);
  } finally { sitio.limpiar(); }
});
test('movimiento: animar width está prohibido', (t) => caso(t, movimiento, css('.deco { animation: ancho 2s infinite alternate; } @keyframes ancho { from { width: 10px; } to { width: 40px; } }'), /solo opacity y transform/, false));
test('movimiento: una entrada FINITA que anima width también está prohibida (sin fill: al terminar desaparece de getAnimations)', (t) => caso(t, movimiento,
  css('.entra { animation: ensancha 300ms; } @keyframes ensancha { from { width: 10px; } to { width: 100px; } }'), /solo opacity y transform/, false));
test('movimiento: una entrada finita con solo opacity y transform sigue pasando', (t) => caso(t, movimiento, {}, /solo opacity y transform/, true));
test('movimiento: un ciclo infinito de 200 ms parpadea', (t) => caso(t, movimiento, css('.deco { animation: flash 200ms infinite alternate; } @keyframes flash { from { opacity: 0; } to { opacity: 1; } }'), /nada parpadea/, false));
test('movimiento: una textura con alfa de 20 % supera el 8 %', (t) => caso(t, movimiento, css(`.textura { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='1' fill-opacity='.2'/%3E%3C/svg%3E"); }`), /texturas/, false));
test('movimiento: un decorativo sin aria-hidden falla', (t) => caso(t, movimiento, { html: HTML_BUENO('<i class="deco2"></i>').replace('class="deco" aria-hidden="true"', 'class="deco"') }, /decorativo/, false));
test('movimiento: un decorativo que recibe eventos falla', (t) => caso(t, movimiento, css('.deco { pointer-events: auto; }'), /decorativo/, false));
test('movimiento: con movimiento reducido una animación infinita sigue viva y falla', (t) => caso(t, movimiento, css('@media (prefers-reduced-motion: reduce) { .deco { animation: flota 3s infinite alternate; } }'), /movimiento reducido → sin animaciones infinitas/, false));
test('movimiento: con movimiento reducido el contenido que nace con opacidad 0 falla', (t) => caso(t, movimiento, css('@media (prefers-reduced-motion: reduce) { .entra { animation: none; opacity: 0; } }'), /desde el primer cuadro/, false));

// --- peso, contenido, datos, csp ---
test('peso: el sitio bueno cumple el presupuesto', async (t) => {
  if (!browser) return t.skip(motivo);
  const sitio = crearSitio();
  try {
    const res = await correr(peso, sitio, browser);
    assert.deepEqual(res.filter((r) => !r.ok).map((r) => `${r.nombre} — ${r.detalle}`), []);
  } finally { sitio.limpiar(); }
});
test('peso: JavaScript de 20 KB supera el límite de 15 KB', (t) => caso(t, peso, { html: HTML_BUENO('', '<script src="/a.js" defer></script>'), extra: { 'a.js': `/*${'x'.repeat(20 * 1024)}*/` } }, /JS ≤ 15 KB/, false));
test('peso: una portada de 200 KB supera 150 KB', (t) => caso(t, peso, { extra: { 'assets/grande.css': `/*${'x'.repeat(200 * 1024)}*/` }, html: HTML_BUENO('', '<link rel="stylesheet" href="/assets/grande.css">') }, /portada ≤ 150 KB/, false));
test('peso: una imagen de otro origen es una petición externa', (t) => caso(t, peso, { html: HTML_BUENO('<img src="https://origen-externo.invalid/x.png" alt="">') }, /otros orígenes/, false));
test('peso: cinco fuentes superan el máximo de cuatro', (t) => caso(t, peso, {
  html: HTML_BUENO([1, 2, 3, 4, 5].map((n) => `<p class="f${n}">F${n}</p>`).join('')), css: CSS_BUENO + [1, 2, 3, 4, 5].map((n) => `@font-face { font-family: F${n}; src: url(/assets/f${n}.woff2) format("woff2"); } .f${n} { font-family: F${n}; }`).join('\n'),
  extra: Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`assets/f${n}.woff2`, 'x'])),
}, /máximo 4 archivos de fuente/, false));
test('peso: una fuente sin licencia anotada falla cuando hay registro', async (t) => {
  if (!browser) return t.skip(motivo);
  const sitio = crearSitio({
    html: HTML_BUENO('<p class="f1">Texto con fuente</p>'), css: CSS_BUENO + '@font-face { font-family: F1; src: url(/assets/mi-fuente.woff2) format("woff2"); } .f1 { font-family: F1; }',
    extra: { 'assets/mi-fuente.woff2': 'x', 'design/TOOLING.md': '| otra-fuente | OFL |' },
  });
  try {
    const res = await correr(peso, sitio, browser, configDe({ fuentes: { licencias: 'design/TOOLING.md' } }));
    assert.equal(paso(res, /licencia anotada/), false, JSON.stringify(res.filter((r) => /licencia/.test(r.nombre))));
  } finally { sitio.limpiar(); }
});

test('contenido: el sitio bueno cumple', async (t) => {
  if (!browser) return t.skip(motivo);
  const sitio = crearSitio();
  try {
    const res = await correr(contenido, sitio, browser);
    assert.deepEqual(res.filter((r) => !r.ok).map((r) => `${r.nombre} — ${r.detalle}`), []);
  } finally { sitio.limpiar(); }
});
test('contenido: una página que solo se pinta con JavaScript no es legible sin él', (t) => caso(t, contenido, {
  html: '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>x</title></head><body><main id="p"></main><script src="/a.js"></script></body></html>',
  extra: { 'a.js': `document.getElementById('p').innerHTML = '<h1>Hola</h1>${'texto '.repeat(60)}'`, 'otra.html': '<!doctype html><title>x</title><main>y</main>' },
}, /sin JavaScript: texto legible/, false));
test('contenido: target=_blank sin rel falla', (t) => caso(t, contenido, { html: HTML_BUENO('<a href="https://otro.org/" target="_blank">x</a>') }, /rel="noopener noreferrer"/, false));
test('contenido: dos h1 fallan', (t) => caso(t, contenido, { html: HTML_BUENO('<h1>Otro</h1>') }, /único h1/, false));
test('contenido: un enlace interno roto falla', (t) => caso(t, contenido, { html: HTML_BUENO('<a href="/no-existe.html">x</a>') }, /enlaces internos/, false));
test('contenido: un ancla sin destino falla', (t) => caso(t, contenido, { html: HTML_BUENO('<a href="#nada">x</a>') }, /enlaces internos/, false));
test('contenido: una imagen sin alt falla y un emoji también', async (t) => {
  await caso(t, contenido, { html: HTML_BUENO('<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">') }, /imágenes tienen alt/, false);
  await caso(t, contenido, { html: HTML_BUENO('<p>🚀 Lanzamiento</p>') }, /sin emoji/, false);
});
test('contenido: externosEnPestanaNueva exige target=_blank', (t) => caso(t, contenido, { html: HTML_BUENO('<a href="https://otro.org/">x</a>') }, /abren en pestaña nueva/, false, configDe({ contenido: { externosEnPestanaNueva: true } })));

test('datos: el sitio bueno no tiene datos sensibles', (t) => caso(t, datos, {}, /sin datos sensibles/, true));
test('datos: un teléfono visible falla', (t) => caso(t, datos, { html: HTML_BUENO('<p>Llama al +51 999 888 777</p>') }, /texto visible/, false));
test('datos: un enlace tel: falla en los atributos', (t) => caso(t, datos, { html: HTML_BUENO('<a href="tel:+51999888777">Llamar</a>') }, /atributos/, false));
test('datos: un nombre prohibido falla aunque esté solo en el código', (t) => caso(t, datos, { html: HTML_BUENO('<!-- Fulano Prohibido -->') }, /código fuente/, false, configDe({ datosSensibles: { nombresProhibidos: ['fulano prohibido'] } })));
test('datos: un patrón propio detecta lo que el proyecto declara', (t) => caso(t, datos, { html: HTML_BUENO('<p>Cliente ACME-77</p>') }, /texto visible/, false, configDe({ datosSensibles: { patrones: [{ nombre: 'cliente', regex: 'ACME-\\d+' }] } })));

test('csp: el sitio bueno no tiene violaciones y bloquea lo inyectado', async (t) => {
  if (!browser) return t.skip(motivo);
  const sitio = crearSitio();
  try {
    const res = await correr(csp, sitio, browser);
    assert.ok(res.some((r) => /bloquea un script inyectado/.test(r.nombre)));
    assert.deepEqual(res.filter((r) => !r.ok).map((r) => `${r.nombre} — ${r.detalle}`), []);
  } finally { sitio.limpiar(); }
});
test('csp: una CSP que solo usa default-src con unsafe-inline se detecta', (t) => caso(t, csp, { headers: "/*\n  Content-Security-Policy: default-src 'self' 'unsafe-inline'\n" },/no admite 'unsafe-inline'/, false));
test('csp: sin cabecera de CSP falla', (t) => caso(t, csp, { headers: '/*\n  X-Content-Type-Options: nosniff\n' }, /responde con Content-Security-Policy/, false));
test('csp: con unsafe-inline el script inyectado se ejecutaría y falla', (t) => caso(t, csp, { headers: CABECERAS_BUENAS.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'") }, /no admite 'unsafe-inline'|bloquea un script inyectado/, false));
test('csp: un script en línea de la página sin hash produce una violación', (t) => caso(t, csp, { html: HTML_BUENO('<script>window.x = 1</script>') }, /no produce violaciones/, false));

test('cpu: en reposo una página quieta queda muy por debajo del límite (una muestra corta)', async (t) => {
  if (!browser) return t.skip(motivo);
  const sitio = crearSitio();
  try {
    const res = await correr(cpu, sitio, browser, configDe({ pruebas: { cpu: true }, umbrales: { cpuMuestras: 1, cpuVentanaMs: 1500 } }));
    assert.ok(res.some((r) => r.info && /CPU en reposo/.test(r.nombre)));
    assert.equal(paso(res, /por debajo del/), true, JSON.stringify(res));
  } finally { sitio.limpiar(); }
});
test('cpu: desactivada en la configuración, lo dice y no mide', async (t) => {
  if (!browser) return t.skip(motivo);
  const sitio = crearSitio();
  try {
    const res = await correr(cpu, sitio, browser);
    assert.equal(res.length, 1);
    assert.match(res[0].detalle, /desactivada/);
  } finally { sitio.limpiar(); }
});
