// Ayudas de las pruebas de la biblioteca de front (sin pruebas propias). Construye sitios de ejemplo en una carpeta
// temporal y, si hay playwright-core y Chrome, abre un navegador compartido. Sin ellos las pruebas de integración se omiten.
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { cargarPlaywright } from '../lib/navegador.mjs';
import { iniciarServidor } from '../lib/servidor.mjs';
import { crearInforme } from '../lib/informe.mjs';
import { normalizarConfig } from '../lib/config.mjs';

const CHROME_WINDOWS = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/** { browser } o { motivo } si no hay con qué probar. Respeta PLAYWRIGHT_CORE y CHROMIUM_PATH. */
export async function abrirNavegador() {
  let pw;
  try { pw = cargarPlaywright(); } catch (e) { return { motivo: e.message }; }
  const ruta = process.env.CHROMIUM_PATH || (existsSync(CHROME_WINDOWS) ? CHROME_WINDOWS : undefined);
  if (!ruta) return { motivo: 'sin CHROMIUM_PATH ni Chrome en la ruta habitual' };
  try { return { browser: await pw.chromium.launch({ executablePath: ruta }) }; } catch (e) { return { motivo: `no se pudo lanzar Chrome: ${e.message.split('\n')[0]}` }; }
}

const TEXTURA = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect y='3' width='4' height='1' fill='%23000000' fill-opacity='ALFA'/%3E%3C/svg%3E\")";

export const CSS_BUENO = `
:root { color-scheme: light dark; --fondo: light-dark(#ffffff, #111111); --texto: light-dark(#111111, #eeeeee); --enlace: light-dark(#0645ad, #8ab4f8); }
html { background: var(--fondo); }
body { margin: 0; background: var(--fondo); color: var(--texto); font: 18px/1.6 Georgia, serif; }
main, header, footer { padding: 16px; max-width: 60rem; }
a { color: var(--enlace); }
nav a, .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; min-width: 44px; padding: 0 12px; }
.btn { font: inherit; }
.textura { background-image: ${TEXTURA.replace('ALFA', '.06')}; padding: 8px; }
.deco { position: fixed; right: 0; top: 0; width: 10px; height: 10px; pointer-events: none; background: var(--enlace); animation: flota 3s ease-in-out infinite alternate; }
.entra { animation: entra 400ms both; }
.skip { position: absolute; left: -999px; }
.skip:focus-visible { left: 8px; }
:focus-visible { outline: 3px solid var(--enlace); outline-offset: 2px; }
@keyframes flota { from { transform: translateY(0); opacity: 0.5; } to { transform: translateY(8px); opacity: 1; } }
@keyframes entra { from { opacity: 0; transform: translateY(6px); } }
@media (prefers-reduced-motion: reduce) { .deco, .entra { animation: none; } }
`;

const PARRAFO = 'Este es un párrafo de ejemplo con texto suficiente para que la página tenga contenido legible incluso sin JavaScript, y para que las comprobaciones de longitud mínima tengan algo que medir con seguridad.';

export const HTML_BUENO = (cuerpoExtra = '', cabezaExtra = '') => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demostración</title><link rel="stylesheet" href="/assets/estilo.css">${cabezaExtra}</head>
<body><a class="skip" href="#principal">Saltar al contenido</a>
<header><nav><a href="/index.html">Inicio</a> <a href="/otra.html">Otra</a></nav></header>
<main id="principal"><h1 class="entra">Título de la demostración</h1><p>${PARRAFO}</p>
<section id="uno" class="textura"><h2>Sección</h2><p>${PARRAFO}</p></section>
<button class="btn" type="button">Acción</button> <a href="https://ejemplo.org/" target="_blank" rel="noopener noreferrer">Enlace externo</a>
<span class="deco" aria-hidden="true"></span>${cuerpoExtra}</main><footer><p>Pie de página de ejemplo.</p></footer></body></html>`;

export const CABECERAS_BUENAS = `/*
  X-Content-Type-Options: nosniff
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
`;

/** Crea un sitio de ejemplo; `cambios` reemplaza archivos (ruta → texto). Devuelve { dir, limpiar }. */
export function crearSitio({ css = CSS_BUENO, html = HTML_BUENO(), headers = CABECERAS_BUENAS, extra = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'kit-front-'));
  const poner = (ruta, texto) => { mkdirSync(dirname(join(dir, ruta)), { recursive: true }); writeFileSync(join(dir, ruta), texto); };
  poner('index.html', html);
  poner('otra.html', html);
  poner('404.html', HTML_BUENO('<p>No encontrada.</p>'));
  poner('assets/estilo.css', css);
  if (headers) poner('_headers', headers);
  for (const [r, t] of Object.entries(extra)) poner(r, t);
  return { dir, limpiar: () => rmSync(dir, { recursive: true, force: true }) };
}

export const configDe = (cambios = {}) => normalizarConfig({
  paginas: [{ ruta: '/index.html', tipo: 'portada' }, { ruta: '/404.html', tipo: '404' }],
  selectores: { decorativos: ['.deco'] },
  pruebas: { cpu: false },
  ...cambios,
});

/** Corre una prueba de la biblioteca contra un sitio y devuelve sus resultados. */
export async function correr(modulo, sitio, browser, config = configDe()) {
  const servidor = await iniciarServidor({ carpeta: sitio.dir, cabeceras: config.origen.cabeceras });
  const report = crearInforme();
  try { await modulo.run({ browser, base: servidor.base, report, config, proyecto: sitio.dir }); } finally { await servidor.cerrar(); }
  return report.resultados;
}

/** ¿Pasó la comprobación cuyo nombre coincide? Falla si no existe (la prueba no puede ser vacía). */
export function paso(resultados, patron) {
  const r = resultados.filter((x) => patron.test(x.nombre));
  if (!r.length) throw new Error(`no hay ninguna comprobación que coincida con ${patron}: ${resultados.map((x) => x.nombre).join(' | ')}`);
  return r.every((x) => x.ok);
}
