// Content-Security-Policy: cada página llega con una CSP, no produce ninguna violación al cargar (en ambos temas) y
// bloquea un script inyectado, en línea o de otro origen. Con una carpeta, el servidor aplica su `_headers`; con una
// URL se prueban las cabeceras reales.
import { abrir, esperarEstable } from '../lib/navegador.mjs';
import { paginasDe } from '../lib/config.mjs';

export const id = 'csp';
export const nombre = 'CSP sin violaciones y que bloquea lo inyectado';

const ESCUCHAR = () => {
  window.__violaciones = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__violaciones.push(`${e.violatedDirective} ← ${e.blockedURI || 'inline'}`));
};

export async function run({ browser, base, report, config }) {
  for (const p of paginasDe(config)) {
    for (const tema of config.temas) {
      const { context, page } = await abrir(browser, base, p.ruta, { tema, init: ESCUCHAR, esperar: 'domcontentloaded' });
      await esperarEstable(page);
      const violaciones = await page.evaluate(() => window.__violaciones);
      report.check(`${p.ruta} (${tema === 'dark' ? 'oscuro' : 'claro'}): la CSP no produce violaciones`, violaciones.length === 0, violaciones.slice(0, 3).join('; '));
      await context.close();
    }
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(ESCUCHAR);
    const respuesta = await page.goto(base + p.ruta, { waitUntil: 'domcontentloaded' });
    const csp = respuesta.headers()['content-security-policy'] ?? '';
    report.check(`${p.ruta}: responde con Content-Security-Policy`, csp.length > 0);
    if (csp) {
      const dirs = csp.split(';').map((s) => s.trim());
      const scriptSrc = dirs.find((s) => s.startsWith('script-src ')) ?? dirs.find((s) => s.startsWith('default-src')) ?? '';
      report.check(`${p.ruta}: la CSP no admite 'unsafe-inline' ni 'unsafe-eval' en scripts`, !/'unsafe-(inline|eval)'/.test(scriptSrc), scriptSrc.slice(0, 80));
      const r = await page.evaluate(async () => {
        window.__violaciones.length = 0;
        window.__inyectado = false;
        const enLinea = document.createElement('script');
        enLinea.textContent = 'window.__inyectado = true';
        document.body.append(enLinea);
        const externo = document.createElement('script');
        externo.src = 'https://origen-inyectado.invalid/x.js';
        document.body.append(externo);
        const limite = Date.now() + 3000;
        while (window.__violaciones.length < 2 && Date.now() < limite) await new Promise((ok) => requestAnimationFrame(ok));
        return { ejecutado: window.__inyectado, violaciones: [...window.__violaciones] };
      });
      report.check(`${p.ruta}: la CSP bloquea un script inyectado (en línea y de otro origen)`, r.ejecutado === false && r.violaciones.length >= 2, `ejecutado: ${r.ejecutado}; violaciones: ${r.violaciones.length}`);
    }
    await ctx.close();
  }
}
