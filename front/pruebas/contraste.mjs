// Contraste AA calculado contra el peor caso, en cada tema y página. Cada texto visible se mide sobre su fondo efectivo;
// si lleva resplandor (text-shadow) el fondo se mezcla también con el color del resplandor, y si él o un ancestro tiene
// una imagen de fondo (textura de líneas, puntos) se mide además con esa capa. Con `contraste.texturas: "auto"` se lee la
// textura real (color y alfa de su SVG); si no se puede leer, o si se declara "ambas", "oscurecen" o "aclaran" (también por
// tema), la capa oscurece y/o aclara hasta `umbrales.texturaAlfaMax` (también por tema). Se toma el peor caso.
// No depende de nombres de clase: solo de estilos calculados.
import { abrir, esperarEstable, nombreTema } from '../lib/navegador.mjs';
import { colorFactory } from '../lib/color.mjs';
import { paginasDe, porTema } from '../lib/config.mjs';

export const id = 'contraste';
export const nombre = 'contraste AA (peor caso)';

function medir({ texturaAlfa, modo, ignorar }, fabricaColor) {
  const { parse, over, ratio } = fabricaColor();
  const bgOf = (el) => {
    const capas = [];
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0) { capas.push(c); if (c.a === 1) break; }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (const c of capas.reverse()) base = over(c, base);
    return base;
  };
  /* Las imágenes de fondo apiladas bajo el texto, de abajo arriba: las del propio elemento y las de sus ancestros hasta el
     primero con fondo opaco (lo de debajo no se ve). Cada `background-image` se parte en sus capas (la última listada queda
     debajo). Devuelve [] si ninguna es una `url()`. */
  const separar = (valor) => {
    const partes = [];
    let nivel = 0;
    let actual = '';
    for (const ch of valor) {
      if (ch === '(') nivel++;
      if (ch === ')') nivel--;
      if (ch === ',' && nivel === 0) { partes.push(actual.trim()); actual = ''; } else actual += ch;
    }
    partes.push(actual.trim());
    return partes.filter(Boolean);
  };
  const imagenesApiladas = (el) => {
    const pila = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none') pila.push(...separar(cs.backgroundImage));
      const c = parse(cs.backgroundColor);
      if (c && c.a === 1) break;
    }
    return pila.some((p) => /url\(/.test(p)) ? pila.reverse() : [];
  };
  /* Las capas reales de una textura SVG en data URI: [{ r, g, b, a }], o null si no se puede leer. */
  const capasDe = (imagen) => {
    const u = imagen.match(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/);
    const m = u && (u[1] ?? u[2] ?? u[3]).match(/^data:image\/svg\+xml[^,]*,([\s\S]*)$/);
    if (!m) return null;
    let svg;
    try { svg = decodeURIComponent(m[1]); } catch { return null; }
    const nombrados = { black: [0, 0, 0], white: [255, 255, 255] };
    /* Solo se entiende lo simple: formas con su propio fill. Lo demás (filtros, estilos, herencia, trazos, grupos, varias imágenes) no se interpreta y cae al peor caso configurado. */
    if (/<(?:filter|style|g)\b|<svg\b[^>]*\b(?:fill|style|class)\s*=|\b(?:style|class|filter|stroke)\s*=|<(?!\/?(?:svg|rect|circle|ellipse|path|polygon|line)\b)[a-z]/i.test(svg)) return null;
    const capas = [];
    for (const [, atributos] of svg.matchAll(/<(?:rect|circle|ellipse|path|polygon|line)\b([^>]*)>/g)) {
      const atributo = (n) => { const a = atributos.match(new RegExp(`(?:^|\\s)${n}\\s*=\\s*["']([^"']*)["']`)); return a ? a[1].trim().toLowerCase() : null; };
      const relleno = atributo('fill');
      if (relleno === null) return null;
      if (relleno === 'none') continue;
      let rgb = nombrados[relleno];
      const hex = relleno.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
      if (hex) { const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1]; rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
      if (!rgb) return null;
      const alfa = Number(atributo('fill-opacity') ?? 1) * Number(atributo('opacity') ?? 1);
      if (!(alfa >= 0)) return null;
      capas.push({ r: rgb[0], g: rgb[1], b: rgb[2], a: alfa });
    }
    return capas.length ? capas : null;
  };
  const resultados = [];
  const visto = new Set();
  const recorrido = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = recorrido.nextNode(); n; n = recorrido.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || visto.has(el)) continue;
    visto.add(el);
    if (el.closest('[aria-hidden="true"], script, style, noscript, dialog:not([open]), [hidden]') || (ignorar.length && el.closest(ignorar.join(',')))) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    const px = parseFloat(cs.fontSize);
    const grande = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
    const fondos = [bg];
    if (cs.textShadow !== 'none') {
      const brillo = parse(cs.textShadow);
      if (brillo && brillo.a > 0) fondos.push(over(brillo, bg));
    }
    const todos = [...fondos];
    const pila = imagenesApiladas(el);
    if (pila.length) {
      /* Texturas leídas tal cual (auto) y apiladas todas: en cada píxel puede coincidir una forma de cada capa o ninguna, y se
         mide cada combinación. Si alguna no se puede leer (degradado, PNG, SVG complejo), o se declara un modo, vale el peor
         caso: una capa gris extrema hasta texturaAlfa. */
      let combos = null;
      if (modo === 'auto' && pila.every((p) => /^url\(/i.test(p))) {
        const porCapa = pila.map(capasDe);
        if (porCapa.every(Boolean)) {
          combos = [[]];
          for (const formas of porCapa) {
            const sig = [];
            for (const c of combos) { sig.push(c); for (const forma of formas) sig.push([...c, forma]); }
            combos = sig;
            if (combos.length > 4096) { combos = null; break; }
          }
        }
      }
      if (combos) {
        for (const b of fondos) for (const combo of combos) todos.push(combo.reduce((fondo, capa) => over(capa, fondo), b));
      } else {
        const extremos = texturaAlfa > 0 ? [0, 255].filter((k) => modo === 'ambas' || modo === 'auto' || (modo === 'oscurecen' ? k === 0 : k === 255)).map((k) => ({ r: k, g: k, b: k, a: texturaAlfa })) : [];
        for (const b of fondos) for (const capa of extremos) todos.push(over(capa, b));
      }
    }
    let min = Infinity;
    for (const b of todos) min = Math.min(min, ratio(fg.a < 1 ? over(fg, b) : fg, b));
    resultados.push({ texto: n.textContent.trim().slice(0, 28), ratio: min, grande, etiqueta: el.tagName.toLowerCase() });
  }
  return resultados;
}

export async function run({ browser, base, report, config }) {
  const u = config.umbrales;
  /* La función y la fábrica de colores viajan como texto: una sola fuente de la aritmética (lib/color.mjs). */
  for (const p of paginasDe(config)) {
    for (const tema of config.temas) {
      const fuente = `(${medir})(${JSON.stringify({ texturaAlfa: porTema(u.texturaAlfaMax, tema), modo: porTema(config.contraste.texturas, tema), ignorar: config.selectores.ignorarTexto })}, ${colorFactory})`;
      const { context, page } = await abrir(browser, base, p.ruta, { tema });
      await esperarEstable(page);
      const res = await page.evaluate(fuente);
      const fallan = res.filter((r) => r.ratio < (r.grande ? u.contrasteTextoGrande : u.contrasteTexto));
      const peor = res.length ? res.reduce((a, b) => (b.ratio < a.ratio ? b : a)) : null;
      report.check(`${p.ruta} (${nombreTema(tema)}): ${res.length} textos ≥ AA contra el peor caso`, res.length > 0 && fallan.length === 0,
        fallan.length ? fallan.slice(0, 4).map((r) => `«${r.texto}» ${r.etiqueta} ${r.ratio.toFixed(2)}`).join('; ') : res.length ? `peor ${peor.ratio.toFixed(2)}:1 «${peor.texto}»` : 'no se encontró texto visible');
      await context.close();
    }
  }
}
