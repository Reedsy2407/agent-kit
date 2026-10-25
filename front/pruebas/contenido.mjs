// Contenido y semántica: legible sin JavaScript, enlaces externos con rel correcto, un solo h1, puntos de referencia,
// imágenes con alt, enlaces internos que existen y (opcional) sin emoji como iconografía.
import { abrir } from '../lib/navegador.mjs';
import { paginasDe } from '../lib/config.mjs';

export const id = 'contenido';
export const nombre = 'contenido, enlaces y semántica';

export async function run({ browser, base, report, config }) {
  const c = config.contenido;

  // Sin JavaScript: el contenido se lee entero y ninguna sección queda oculta.
  for (const p of paginasDe(config, 'portada', 'interior')) {
    const { context, page } = await abrir(browser, base, p.ruta, { js: false });
    const info = await page.evaluate(() => {
      const raiz = document.querySelector('main') || document.body;
      const ocultas = [...raiz.querySelectorAll('section')].filter((s) => s.getBoundingClientRect().height < 40 || getComputedStyle(s).visibility === 'hidden').map((s) => s.id || s.className || 'section');
      return { texto: raiz.innerText.replace(/\s+/g, ' '), ocultas };
    });
    report.check(`${p.ruta} sin JavaScript: texto legible (≥ ${c.minCaracteres} caracteres)`, info.texto.length >= c.minCaracteres, `${info.texto.length} caracteres`);
    const esperado = [...c.textoEsperado, ...(p.textoEsperado ?? [])];
    if (esperado.length) {
      const faltan = esperado.filter((x) => !info.texto.includes(x));
      report.check(`${p.ruta} sin JavaScript: aparece el texto esperado`, faltan.length === 0, faltan.join(' | '));
    }
    report.check(`${p.ruta} sin JavaScript: ninguna sección oculta`, info.ocultas.length === 0, info.ocultas.join(', '));
    await context.close();
  }

  for (const p of paginasDe(config)) {
    const { context, page } = await abrir(browser, base, p.ruta);
    const info = await page.evaluate(() => {
      const externos = [...document.querySelectorAll('a[href]')].filter((a) => /^https?:/i.test(a.getAttribute('href')) && new URL(a.href).origin !== location.origin)
        .map((a) => ({ href: a.href, target: a.target, rel: a.rel }));
      return {
        externos,
        h1: document.querySelectorAll('h1').length,
        landmarks: { main: Boolean(document.querySelector('main')), nav: Boolean(document.querySelector('nav')) },
        lang: document.documentElement.lang,
        sinAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.getAttribute('src')),
        emoji: /\p{Extended_Pictographic}/u.test(document.body.innerText),
      };
    });
    const malRel = info.externos.filter((a) => a.target === '_blank' && !(/noopener/.test(a.rel) && /noreferrer/.test(a.rel)));
    report.check(`${p.ruta}: los enlaces con target=_blank llevan rel="noopener noreferrer"`, malRel.length === 0, malRel.map((a) => a.href).slice(0, 3).join(', '));
    if (c.externosEnPestanaNueva) {
      const sinBlank = info.externos.filter((a) => a.target !== '_blank');
      report.check(`${p.ruta}: los enlaces externos abren en pestaña nueva`, sinBlank.length === 0, sinBlank.map((a) => a.href).slice(0, 3).join(', '));
    }
    if (p.tipo !== '404') report.check(`${p.ruta}: un único h1`, info.h1 === 1, `${info.h1} h1`);
    report.check(`${p.ruta}: <html lang> declarado`, Boolean(info.lang), info.lang);
    report.check(`${p.ruta}: punto de referencia <main>`, info.landmarks.main);
    report.check(`${p.ruta}: todas las imágenes tienen alt`, info.sinAlt.length === 0, info.sinAlt.slice(0, 3).join(', '));
    if (c.sinEmoji) report.check(`${p.ruta}: sin emoji como iconografía`, !info.emoji);

    // Enlaces internos: el archivo existe y cada ancla apunta a un id presente.
    const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => !/^[a-z][a-z0-9+.-]*:/i.test(h)))]);
    const rotos = [];
    for (const h of hrefs) {
      const url = new URL(h, page.url());
      if (url.pathname !== new URL(page.url()).pathname) {
        const r = await page.request.head(url.origin + url.pathname);
        if (r.status() !== 200) rotos.push(h);
      } else if (url.hash && url.hash.length > 1 && !(await page.$(`[id="${decodeURIComponent(url.hash.slice(1)).replace(/"/g, '')}"]`))) rotos.push(h);
    }
    report.check(`${p.ruta}: ${hrefs.length} enlaces internos sin roturas`, rotos.length === 0, rotos.slice(0, 4).join(', '));
    await context.close();
  }
}
