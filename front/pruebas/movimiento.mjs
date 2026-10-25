// Movimiento y efectos: solo opacity y transform animados, nada que parpadee (ciclo mínimo, WCAG 2.3.1), texturas
// con alfa ≤ el máximo, decorativos aria-hidden y sin eventos, y prefers-reduced-motion que apaga lo infinito y deja
// el contenido visible desde el primer cuadro. Sin nombres de clase del proyecto: lo decorativo se declara en la config.
import { abrir, esperarEstable, nombreTema } from '../lib/navegador.mjs';
import { paginasDe, porTema } from '../lib/config.mjs';

export const id = 'movimiento';
export const nombre = 'movimiento, efectos y prefers-reduced-motion';

const PERMITIDAS = ['offset', 'easing', 'composite', 'computedOffset', 'opacity', 'transform'];

/* Las animaciones finitas (una entrada) terminan antes de poder medirlas y document.getAnimations() deja de listarlas:
   se registran al empezar (evento animationstart, en captura) desde un script de inicio. */
const REGISTRAR = () => {
  window.__animaciones = [];
  document.addEventListener('animationstart', (e) => {
    for (const a of e.target.getAnimations({ subtree: false })) {
      if (typeof CSSAnimation === 'undefined' || !(a instanceof CSSAnimation)) continue;
      const t = a.effect.getComputedTiming();
      window.__animaciones.push({ nombre: a.animationName, infinita: t.iterations === Infinity, duracion: t.duration, props: a.effect.getKeyframes().flatMap((k) => Object.keys(k)) });
    }
  }, true);
};

function animaciones({ permitidas }) {
  const lista = document.getAnimations().filter((a) => typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation);
  const fuera = [];
  let infinitas = 0;
  let cicloMinimo = Infinity;
  for (const a of lista) {
    const t = a.effect.getComputedTiming();
    if (t.iterations === Infinity && a.playState === 'running') { infinitas += 1; cicloMinimo = Math.min(cicloMinimo, t.duration); }
    for (const k of a.effect.getKeyframes()) for (const p of Object.keys(k)) if (!permitidas.includes(p)) fuera.push(`${a.animationName}:${p}`);
  }
  for (const r of window.__animaciones ?? []) {
    if (r.infinita) continue; // las infinitas siguen vivas y ya están contadas arriba
    for (const p of r.props) if (!permitidas.includes(p)) fuera.push(`${r.nombre}:${p}`);
  }
  return { total: lista.length + (window.__animaciones ?? []).filter((r) => !r.infinita).length, infinitas, cicloMinimo, fuera: [...new Set(fuera)] };
}

function texturas() {
  const alfas = [];
  for (const el of document.querySelectorAll('*')) {
    for (const pseudo of [null, '::before', '::after']) {
      const imagen = getComputedStyle(el, pseudo).backgroundImage;
      if (!imagen.includes('data:image/svg')) continue;
      let texto = imagen;
      try { texto = decodeURIComponent(imagen); } catch { /* se usa tal cual */ }
      for (const m of texto.matchAll(/fill-opacity=["']?([\d.]+)/g)) alfas.push(Number(m[1]));
    }
  }
  return alfas;
}

function decorativos({ selectores }) {
  const mal = [];
  for (const s of selectores) {
    for (const el of document.querySelectorAll(s)) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none') continue;
      if (!el.closest('[aria-hidden="true"]')) mal.push(`${s}: sin aria-hidden`);
      if (cs.pointerEvents !== 'none') mal.push(`${s}: recibe eventos`);
    }
  }
  return [...new Set(mal)];
}

function contenidoVisible() {
  const velados = [];
  const recorrido = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = recorrido.nextNode(); n; n = recorrido.nextNode()) {
    const el = n.parentElement;
    if (!n.textContent.trim() || el.closest('script, style, noscript, [hidden]')) continue;
    if (!el.getBoundingClientRect().width) continue;
    let op = 1;
    for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
    if (op < 0.99) velados.push(el.tagName.toLowerCase());
  }
  return velados;
}

export async function run({ browser, base, report, config }) {
  const u = config.umbrales;
  const opciones = { permitidas: PERMITIDAS };

  for (const p of paginasDe(config, 'portada')) {
    // Con efectos.
    {
      const { context, page } = await abrir(browser, base, p.ruta, { init: REGISTRAR });
      await esperarEstable(page);
      const an = await page.evaluate(`(${animaciones})(${JSON.stringify(opciones)})`);
      report.check(`${p.ruta}: solo opacity y transform animados`, an.fuera.length === 0, an.fuera.join(', '));
      report.check(`${p.ruta}: nada parpadea (ciclo infinito ≥ ${u.cicloMinimoMs} ms)`, an.infinitas === 0 || an.cicloMinimo >= u.cicloMinimoMs, an.infinitas ? `${an.infinitas} infinitas, mínimo ${an.cicloMinimo} ms` : 'sin animaciones infinitas');
      /* Las texturas cambian con el tema (cada uno puede tener su alfa y su tope): se miden en todos los configurados. */
      for (const tema of config.temas) {
        const t = await abrir(browser, base, p.ruta, { tema });
        await esperarEstable(t.page);
        const alfas = await t.page.evaluate(`(${texturas})()`);
        const tope = porTema(u.texturaAlfaMax, tema);
        report.check(`${p.ruta} (${nombreTema(tema)}): texturas con alfa ≤ ${Math.round(tope * 1000) / 10} %`, alfas.every((a) => a <= tope), alfas.length ? `alfas ${[...new Set(alfas)].join(', ')}` : 'sin texturas');
        await t.context.close();
      }
      if (config.selectores.decorativos.length) {
        const mal = await page.evaluate(`(${decorativos})(${JSON.stringify({ selectores: config.selectores.decorativos })})`);
        report.check(`${p.ruta}: lo decorativo es aria-hidden y no recibe eventos`, mal.length === 0, mal.join('; '));
      }
      await context.close();
    }

    // Con movimiento reducido: nada infinito y el contenido ya visible, sin esperar.
    {
      const { context, page } = await abrir(browser, base, p.ruta, { reducido: 'reduce', init: REGISTRAR });
      const r = await page.evaluate(`(() => ({ an: (${animaciones})(${JSON.stringify(opciones)}), velados: (${contenidoVisible})() }))()`);
      report.check(`${p.ruta}: movimiento reducido → sin animaciones infinitas`, r.an.infinitas === 0, `${r.an.infinitas} infinitas`);
      report.check(`${p.ruta}: movimiento reducido → el contenido se ve entero desde el primer cuadro`, r.velados.length === 0, r.velados.slice(0, 3).join(', '));
      for (const s of config.selectores.decorativos) {
        const visible = await page.evaluate((sel) => [...document.querySelectorAll(sel)].some((e) => getComputedStyle(e).display !== 'none' && [...e.querySelectorAll('*'), e].some((x) => document.getAnimations().some((a) => a.effect?.target === x && a.playState === 'running'))), s);
        report.check(`${p.ruta}: movimiento reducido → «${s}» quieto o apagado`, !visible);
      }
      await context.close();
    }
  }
}
