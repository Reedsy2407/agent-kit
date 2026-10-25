// Maquetación y accesibilidad táctil: sin desborde horizontal, objetivos de 44 px, foco visible de 3 px, texto mínimo
// de 15 px (y base opcional). Los selectores salen de la configuración, no de nombres de clase del proyecto.
import { abrir, esperarEstable, nombreTema, viewportsDe } from '../lib/navegador.mjs';
import { paginasDe, clicDe, clicAplica } from '../lib/config.mjs';

export const id = 'layout';
export const nombre = 'maquetación y accesibilidad táctil';

/** Espera máxima por un selector de `clics`: un selector ausente falla en segundos, no tras los 30 s por defecto. */
export const ESPERA_CLIC_MS = 3000;

/**
 * Hace los clics de la página que aplican a este ancho (un clic puede limitarse con anchoMin/anchoMax: p. ej. un botón de
 * menú que solo existe en móvil). Un selector que no aparece es un fallo claro y no impide seguir con el resto.
 */
export async function hacerClics(page, pagina, ancho, report) {
  for (const clic of (pagina.clics ?? []).map(clicDe).filter((c) => clicAplica(c, ancho))) {
    try {
      await page.waitForSelector(clic.selector, { state: 'visible', timeout: ESPERA_CLIC_MS });
      await page.click(clic.selector, { timeout: ESPERA_CLIC_MS });
    } catch (e) {
      report.check(`${pagina.ruta} ${ancho} px: clic en «${clic.selector}»`, false, `no se pudo hacer el clic en ${ESPERA_CLIC_MS / 1000} s (${String(e.message).split('\n')[0]}). Si el elemento no existe a este ancho, limita el clic con anchoMin/anchoMax`);
    }
  }
}

export async function run({ browser, base, report, config }) {
  const u = config.umbrales;
  const sel = config.selectores;

  for (const p of paginasDe(config)) {
    // 1. Sin desborde horizontal en cada ancho y tema.
    for (const ancho of u.anchosSinDesborde) {
      for (const tema of config.temas) {
        const { context, page } = await abrir(browser, base, p.ruta, { viewport: { width: ancho, height: ancho < 600 ? 740 : 900 }, tema });
        await esperarEstable(page);
        const d = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        report.check(`${p.ruta} ${ancho} px (${nombreTema(tema)}): sin desborde horizontal`, d.sw <= d.cw, `${d.sw} ≤ ${d.cw}`);
        await context.close();
      }
    }

    // 2. Objetivos táctiles, en cada viewport configurado.
    for (const vp of viewportsDe(config)) {
      const { context, page } = await abrir(browser, base, p.ruta, { viewport: { width: vp.width, height: vp.height } });
      await esperarEstable(page);
      await hacerClics(page, p, vp.width, report);
      const chicos = await page.evaluate(({ objetivos, excluir, minimo }) => [...document.querySelectorAll(objetivos)].filter((e) => {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height || e.closest('[hidden], [aria-hidden="true"]') || (excluir.length && e.closest(excluir.join(',')))) return false;
        const cs = getComputedStyle(e);
        if (cs.visibility === 'hidden' || cs.display === 'none') return false;
        return r.height < minimo - 0.5 || r.width < minimo - 0.5;
      }).map((e) => `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : e.className && typeof e.className === 'string' ? `.${e.className.split(' ')[0]}` : ''} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`),
      { objetivos: sel.objetivos, excluir: sel.excluirObjetivos, minimo: u.objetivoPx });
      report.check(`${p.ruta} ${vp.width} px: objetivos de ${u.objetivoPx} px`, chicos.length === 0, chicos.slice(0, 5).join('; '));
      await context.close();
    }

    // 3. Texto mínimo y foco visible, en el viewport más ancho.
    const ancho = viewportsDe(config).reduce((a, b) => (b.width > a.width ? b : a));
    const { context, page } = await abrir(browser, base, p.ruta, { viewport: { width: ancho.width, height: ancho.height } });
    await esperarEstable(page);
    await hacerClics(page, p, ancho.width, report);
    const texto = await page.evaluate(({ ignorar, piso }) => {
      const bajos = [];
      const recorrido = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = recorrido.nextNode(); n; n = recorrido.nextNode()) {
        const el = n.parentElement;
        if (!n.textContent.trim() || el.closest('[aria-hidden="true"], script, style, noscript, [hidden]') || (ignorar.length && el.closest(ignorar.join(',')))) continue;
        const px = parseFloat(getComputedStyle(el).fontSize);
        if (el.getBoundingClientRect().width && px < piso) bajos.push(`${el.tagName.toLowerCase()} ${px}px`);
      }
      return { bajos, base: getComputedStyle(document.body).fontSize };
    }, { ignorar: sel.ignorarTexto, piso: u.textoMinimoPx });
    report.check(`${p.ruta}: texto ≥ ${u.textoMinimoPx} px`, texto.bajos.length === 0, texto.bajos.slice(0, 3).join('; '));
    if (u.textoBasePx) report.check(`${p.ruta}: texto base de ${u.textoBasePx} px`, texto.base === `${u.textoBasePx}px`, texto.base);

    const sinFoco = [];
    let enfocados = 0;
    for (let i = 0; i < 120; i++) {
      await page.keyboard.press('Tab');
      const f = await page.evaluate(() => {
        const e = document.activeElement;
        if (!e || e === document.body || e === document.documentElement || e.__visto) return null;
        e.__visto = true;
        const cs = getComputedStyle(e);
        return { id: `${e.tagName.toLowerCase()}[${e.getAttribute('href') || e.id || e.className}]`, w: parseFloat(cs.outlineWidth), s: cs.outlineStyle, o: parseFloat(cs.outlineOffset) };
      });
      if (!f) continue;
      enfocados += 1;
      if (!(f.w >= u.focoPx) || f.s === 'none') sinFoco.push(`${f.id} ${f.w}px ${f.s}`);
    }
    report.check(`${p.ruta}: foco visible de ${u.focoPx} px (${enfocados} elementos enfocables)`, sinFoco.length === 0, sinFoco.slice(0, 3).join('; ') || (enfocados === 0 ? 'ningún elemento enfocable' : ''));
    await context.close();
  }
}
