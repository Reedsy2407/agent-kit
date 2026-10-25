// Presets de expresión y biblioteca de patrones: contrato de tokens, reglas de estilo (solo tokens, sin degradados) y,
// con un navegador, que un catálogo armado con cada preset pasa las pruebas de la biblioteca de front y que cada
// patrón se comporta como dice su LEEME.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirNavegador, correr, paso } from '../../front/test/_ayudas.mjs';
import { normalizarConfig } from '../../front/lib/config.mjs';
import { iniciarServidor } from '../../front/lib/servidor.mjs';
import * as contraste from '../../front/pruebas/contraste.mjs';
import * as layout from '../../front/pruebas/layout.mjs';
import * as movimiento from '../../front/pruebas/movimiento.mjs';
import * as peso from '../../front/pruebas/peso.mjs';
import * as contenido from '../../front/pruebas/contenido.mjs';
import * as datos from '../../front/pruebas/datos.mjs';
import * as csp from '../../front/pruebas/csp.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');
const PATRONES = ['chip-copiable', 'boton-textura', 'linea-de-tiempo', 'tarjeta-proyecto', 'etiquetas', 'entrada-escalonada', 'particulas-decorativas'];
const PRESETS = ['sobrio', 'expresivo'];

const tokensDe = (css) => new Map([...css.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gim)].map((m) => [m[1], m[2].trim()]));
// Solo la primera regla :root de cada preset (las demás son variantes por preferencia).
const raizDe = (css) => tokensDe(css.match(/:root\s*\{([\s\S]*?)\n\}/)[1]);

// --- presets ---

test('los dos presets definen exactamente los mismos tokens (contrato intercambiable)', () => {
  const [a, b] = PRESETS.map((p) => [...raizDe(leer('design', 'presets', `${p}.css`)).keys()].sort());
  assert.deepEqual(a, b);
  for (const t of ['--expresion', '--t-0', '--t-1', '--t-2', '--t-3', '--t-note', '--t-page', '--radius-control', '--radius-frame', '--radius-data', '--espacio-seccion', '--dur-fast', '--dur', '--dur-entrada', '--stagger', '--ciclo-lento', '--glow-c', '--glow', '--glow-box', '--textura-lineas', '--textura-puntos'])
    assert.ok(a.includes(t), `falta ${t}`);
});

test('ambos presets respetan la escala del brief: cuerpo 18 px, piso 15 px, título de página ≥ 3x', () => {
  for (const p of PRESETS) {
    const t = raizDe(leer('design', 'presets', `${p}.css`));
    assert.equal(t.get('--t-0'), '18px');
    assert.equal(t.get('--t-note'), '15px');
    const minimo = Number(t.get('--t-page').match(/clamp\((\d+)px/)[1]);
    assert.ok(minimo >= 3 * 18, `${p}: título de página ${minimo}px < 54px`);
    assert.equal(t.get('--expresion'), p);
  }
});

test('sobrio no tiene brillos ni texturas y no escalona; expresivo sí, dentro del presupuesto', () => {
  const s = raizDe(leer('design', 'presets', 'sobrio.css'));
  for (const k of ['--glow', '--glow-box', '--textura-lineas', '--textura-puntos']) assert.equal(s.get(k), 'none', `sobrio ${k}`);
  assert.equal(s.get('--stagger'), '0ms');
  const e = leer('design', 'presets', 'expresivo.css');
  const x = raizDe(e);
  assert.notEqual(x.get('--glow'), 'none');
  assert.match(x.get('--glow-c'), /color-mix\(in srgb, var\(--brand\) (\d+)%, transparent\)/);
  assert.ok(Number(x.get('--glow-c').match(/(\d+)%/)[1]) <= 40, 'el brillo es suave');
  const alfas = [...e.matchAll(/fill-opacity='([\d.]+)'/g)].map((m) => Number(m[1]));
  assert.ok(alfas.length >= 4 && alfas.every((a) => a <= 0.08), `alfas ${alfas}`);
  assert.ok(parseFloat(x.get('--ciclo-lento')) * 1000 >= 340, 'nada parpadea');
  assert.match(e, /prefers-reduced-motion: reduce[\s\S]*--stagger: 0ms/);
});

test('los presets y los patrones no usan degradados, backdrop-filter ni fuentes sobreusadas', () => {
  const archivos = [...PRESETS.map((p) => join('presets', `${p}.css`)), ...PATRONES.map((p) => join('patrones', p, 'patron.css'))];
  for (const a of archivos) {
    const css = leer('design', a);
    assert.doesNotMatch(css, /linear-gradient|radial-gradient|conic-gradient|backdrop-filter/, a);
    assert.doesNotMatch(css, /font-family:[^;]*\b(Inter|Roboto|Arial)\b/i, a);
  }
});

// --- patrones (sin navegador) ---

test('cada patrón trae html, css y LEEME, y js solo si lo necesita', () => {
  for (const p of PATRONES) {
    for (const f of ['patron.html', 'patron.css', 'LEEME.md']) assert.ok(existsSync(join(raiz, 'design', 'patrones', p, f)), `${p}/${f}`);
    assert.match(leer('design', 'patrones', p, 'LEEME.md'), /^# /, p);
  }
  for (const p of ['chip-copiable', 'particulas-decorativas']) assert.ok(existsSync(join(raiz, 'design', 'patrones', p, 'patron.js')), p);
  const hay = readdirSync(join(raiz, 'design', 'patrones')).sort();
  assert.deepEqual(hay, [...PATRONES].sort(), 'no hay patrones sin probar');
});

test('el CSS de los patrones usa solo tokens: sin colores sueltos, sin !important y solo píxeles de borde', () => {
  for (const p of PATRONES) {
    const css = leer('design', 'patrones', p, 'patron.css').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, `${p}: color suelto`);
    assert.doesNotMatch(css, /\brgba?\(|\bhsla?\(/, `${p}: color suelto`);
    assert.doesNotMatch(css, /!important/, p);
    const sueltos = [...css.matchAll(/(?<![\w.-])(\d+)px/g)].map((m) => m[1]).filter((n) => !['1', '2', '3'].includes(n));
    assert.deepEqual(sueltos, [], `${p}: píxeles fuera de los tokens (${sueltos})`);
    for (const m of css.matchAll(/font-size:\s*([^;]+);/g)) assert.match(m[1], /var\(--t-/, `${p}: tamaño de letra sin token`);
  }
});

test('los keyframes de los patrones solo animan opacity y transform', () => {
  for (const p of PATRONES) {
    const css = leer('design', 'patrones', p, 'patron.css').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const kf of css.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?\n\})\s*\n?/g)) {
      const props = [...kf[1].matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
      assert.deepEqual(props.filter((x) => !['opacity', 'transform'].includes(x)), [], `${p}: keyframes con ${props}`);
    }
    for (const t of css.matchAll(/transition:\s*([^;]+);/g)) {
      const props = t[1].split(',').map((x) => x.trim().split(/\s+/)[0]);
      assert.deepEqual(props.filter((x) => !['transform', 'opacity', 'border-color', 'background-color'].includes(x)), [], `${p}: transición de ${props}`);
    }
  }
});

test('el HTML y el JS de los patrones son compatibles con una CSP estricta y no abren red', () => {
  for (const p of PATRONES) {
    const html = leer('design', 'patrones', p, 'patron.html').replace(/<!--[\s\S]*?-->/g, '');
    assert.doesNotMatch(html, /\sstyle\s*=|\son[a-z]+\s*=|<script|<style|javascript:/i, `${p}: html no compatible con CSP`);
    assert.doesNotMatch(html, /https?:\/\/(?!ejemplo\.org)/, `${p}: solo dominios de ejemplo`);
    const js = existsSync(join(raiz, 'design', 'patrones', p, 'patron.js')) ? leer('design', 'patrones', p, 'patron.js') : '';
    assert.doesNotMatch(js, /\beval\(|new Function|innerHTML|outerHTML|document\.write|setAttribute\(\s*['"]style|fetch\(|XMLHttpRequest|localStorage|import\(/, `${p}: js no permitido`);
  }
});

test('ningún patrón ni preset lleva datos personales ni de proyectos reales', () => {
  /* El patrón se arma por partes: este archivo también está bajo la prueba de «nada de proyectos reales». */
  const prohibido = new RegExp([String.raw`@gmail`, String.raw`@hotmail`, String.raw`linkedin\.com/in`, 'sae' + 'nz', 'ang' + String.raw`el\b`, 'reed' + 'sy', 'es' + 'g-', 'ciber' + 'tec', String.raw`\+51`, String.raw`\bcv_`].join('|'), 'i');
  const archivos = [...PRESETS.map((p) => join('presets', `${p}.css`)), 'FRONTEND.md'].filter((f) => existsSync(join(raiz, 'design', f)));
  for (const p of PATRONES) for (const f of readdirSync(join(raiz, 'design', 'patrones', p))) archivos.push(join('patrones', p, f));
  for (const a of archivos) assert.doesNotMatch(leer('design', a), prohibido, a);
});

// --- catálogo con navegador ---

let browser = null;
let motivo = null;
before(async () => { ({ browser, motivo } = await abrirNavegador()); });
after(async () => { await browser?.close(); });

const CABECERAS = "/*\n  X-Content-Type-Options: nosniff\n  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'\n";

/** Un sitio con todos los patrones, con el preset pedido, armado solo con los archivos del kit. */
function catalogo(preset) {
  const dir = mkdtempSync(join(tmpdir(), 'kit-catalogo-'));
  mkdirSync(join(dir, 'assets'));
  const css = [leer('design', 'styles.css'), leer('design', 'presets', `${preset}.css`), ...PATRONES.map((p) => leer('design', 'patrones', p, 'patron.css')),
    'main { max-width: 44rem; margin: 0 var(--gutter); padding: var(--space-8) 0; } section { margin-bottom: var(--espacio-seccion); } .skip { position: absolute; left: -999px; } nav a { display: inline-flex; align-items: center; min-height: var(--touch); min-width: var(--touch); }'].join('\n');
  writeFileSync(join(dir, 'assets', 'estilo.css'), css);
  writeFileSync(join(dir, 'assets', 'patrones.js'), ['chip-copiable', 'particulas-decorativas'].map((p) => leer('design', 'patrones', p, 'patron.js')).join('\n'));
  const parrafo = 'Catálogo de patrones de ejemplo, armado con los archivos del kit para comprobar que cumplen las pruebas de la biblioteca de front en ambos presets.';
  const secciones = PATRONES.map((p) => `<section id="s-${p}"><h2>${p}</h2><p>Ejemplo del patrón en el catálogo.</p>${leer('design', 'patrones', p, 'patron.html').replace(/<!--[\s\S]*?-->/g, '')}</section>`).join('\n');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Catálogo</title><link rel="stylesheet" href="/assets/estilo.css"><script src="/assets/patrones.js" defer></script></head>
<body><header><nav><a href="/index.html">Inicio</a></nav></header><main id="destino"><h1>Catálogo</h1><p>${parrafo}</p>${secciones}</main><footer><p>Pie del catálogo de ejemplo.</p></footer></body></html>`;
  writeFileSync(join(dir, 'index.html'), html);
  writeFileSync(join(dir, '404.html'), html);
  writeFileSync(join(dir, '_headers'), CABECERAS);
  return { dir, limpiar: () => rmSync(dir, { recursive: true, force: true }) };
}

const CONFIG = normalizarConfig({
  paginas: [{ ruta: '/index.html', tipo: 'portada' }],
  selectores: { objetivos: 'button, a.chip, a.boton, .enlaces a, nav a', decorativos: ['.particulas'] },
  pruebas: { cpu: false },
});

for (const preset of PRESETS) {
  test(`el catálogo con el preset ${preset} pasa contraste, maquetación, movimiento, peso, contenido, datos y CSP`, async (t) => {
    if (!browser) return t.skip(motivo);
    const sitio = catalogo(preset);
    t.after(() => sitio.limpiar());
    for (const m of [contraste, layout, movimiento, peso, contenido, datos, csp]) {
      const res = await correr(m, sitio, browser, CONFIG);
      assert.ok(res.length > 0, m.nombre);
      assert.deepEqual(res.filter((r) => !r.ok).map((r) => `${m.nombre}: ${r.nombre} — ${r.detalle}`), []);
    }
  });
}

async function conPagina(t, preset, opciones, fn) {
  const sitio = catalogo(preset);
  const servidor = await iniciarServidor({ carpeta: sitio.dir });
  const contexto = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opciones.contexto });
  if (opciones.init) await contexto.addInitScript(opciones.init);
  const page = await contexto.newPage();
  try {
    await page.goto(`${servidor.base}/index.html`, { waitUntil: 'load' });
    await fn(page);
  } finally { await contexto.close(); await servidor.cerrar(); sitio.limpiar(); }
}

test('chip copiable: con JS es un botón que copia y avisa en la región en vivo, y el aviso se va solo', async (t) => {
  if (!browser) return t.skip(motivo);
  await conPagina(t, 'expresivo', { contexto: { permissions: ['clipboard-read', 'clipboard-write'] } }, async (page) => {
    const antes = await page.evaluate(() => ({ boton: document.querySelector('.chip').tagName, mailtos: document.querySelectorAll('a[href^="mailto:"]').length, aviso: document.querySelector('.chip-aviso').getAttribute('aria-live') }));
    assert.deepEqual(antes, { boton: 'BUTTON', mailtos: 0, aviso: 'polite' });
    assert.equal(await page.getAttribute('.chip', 'aria-label'), 'Copiar correo usuario@ejemplo.org');
    await page.click('.chip');
    await page.waitForFunction(() => document.querySelector('.chip-aviso').textContent === 'Copiado');
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'usuario@ejemplo.org');
    await page.waitForFunction(() => document.querySelector('.chip-aviso').textContent === '', null, { timeout: 8000 });
  });
});

test('chip copiable: sin navigator.clipboard usa el respaldo y confirma', async (t) => {
  if (!browser) return t.skip(motivo);
  const init = () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    window.__copiado = [];
    document.execCommand = (c) => { const ta = document.querySelector('textarea'); window.__copiado.push([c, ta ? ta.value : null]); return true; };
  };
  await conPagina(t, 'expresivo', { init }, async (page) => {
    await page.click('.chip');
    await page.waitForFunction(() => document.querySelector('.chip-aviso').textContent === 'Copiado');
    assert.deepEqual(await page.evaluate(() => window.__copiado), [['copy', 'usuario@ejemplo.org']]);
  });
});

test('chip copiable: sin JavaScript queda un enlace mailto visible de 44 px', async (t) => {
  if (!browser) return t.skip(motivo);
  await conPagina(t, 'expresivo', { contexto: { javaScriptEnabled: false } }, async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.chip'); const b = c.getBoundingClientRect(); return { tag: c.tagName, href: c.getAttribute('href'), alto: b.height }; });
    assert.equal(r.tag, 'A'); assert.equal(r.href, 'mailto:usuario@ejemplo.org'); assert.ok(r.alto >= 44);
  });
});

test('partículas: 12 decorativas con expresivo; ninguna con movimiento reducido ni en 360 px; se pausan con la pestaña oculta', async (t) => {
  if (!browser) return t.skip(motivo);
  await conPagina(t, 'expresivo', {}, async (page) => {
    assert.equal(await page.evaluate(() => document.querySelector('.particulas').children.length), 12);
    const cs = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.particulas')); return [c.pointerEvents, document.querySelector('.particulas').getAttribute('aria-hidden')]; });
    assert.deepEqual(cs, ['none', 'true']);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await page.evaluate(() => document.querySelector('.particulas').classList.contains('pausada')), true);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.particulas i')).animationPlayState), 'paused');
    await page.setViewportSize({ width: 360, height: 740 });
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.particulas')).display), 'none');
  });
  await conPagina(t, 'expresivo', { contexto: { reducedMotion: 'reduce' } }, async (page) => {
    assert.equal(await page.evaluate(() => document.querySelector('.particulas').children.length), 0);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.particulas')).display), 'none');
  });
  await conPagina(t, 'expresivo', {}, async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.particulas').children.length === 0);
  });
});

test('botón con textura: la textura sale del preset (líneas en expresivo, ninguna en sobrio) y mide al menos 56 px', async (t) => {
  if (!browser) return t.skip(motivo);
  for (const [preset, hay] of [['expresivo', true], ['sobrio', false]]) {
    await conPagina(t, preset, {}, async (page) => {
      const r = await page.evaluate(() => { const b = document.querySelector('a.boton'); const cs = getComputedStyle(b); return { img: cs.backgroundImage, alto: b.getBoundingClientRect().height }; });
      assert.equal(r.img.includes('data:image/svg'), hay, `${preset}: ${r.img.slice(0, 40)}`);
      assert.ok(r.alto >= 56);
    });
  }
});

test('entrada escalonada: el retraso sale de --stagger (60 ms en expresivo, 0 en sobrio) y se apaga con movimiento reducido', async (t) => {
  if (!browser) return t.skip(motivo);
  const retrasos = (page) => page.evaluate(() => [...document.querySelectorAll('.escalona > *')].map((e) => getComputedStyle(e).animationDelay));
  await conPagina(t, 'expresivo', {}, async (page) => assert.deepEqual(await retrasos(page), ['0s', '0.06s', '0.12s']));
  await conPagina(t, 'sobrio', {}, async (page) => assert.deepEqual(await retrasos(page), ['0s', '0s', '0s']));
  await conPagina(t, 'expresivo', { contexto: { reducedMotion: 'reduce' } }, async (page) => {
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.escalona > *')].map((e) => getComputedStyle(e).animationName)), ['none', 'none', 'none']);
  });
});
