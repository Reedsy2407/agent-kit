// CPU en reposo: tiempo de CPU de todos los procesos del navegador durante una ventana, como porcentaje de un núcleo,
// repetido varias veces y resumido con la mediana. Solo falla por encima del límite (una regresión clara); el objetivo
// se informa. No es una medición con GPU real ni de un equipo de gama baja: eso se declara aparte. Es lectura pasiva:
// no genera carga artificial.
import { abrir, esperarEstable } from '../lib/navegador.mjs';
import { paginasDe } from '../lib/config.mjs';

export const id = 'cpu';
export const nombre = 'CPU en reposo (mediana de varias muestras)';

export const mediana = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
export const resumen = (xs) => `mediana ${mediana(xs).toFixed(1)} % (rango ${Math.min(...xs).toFixed(1)}–${Math.max(...xs).toFixed(1)} %, ${xs.length} muestras)`;

async function cpuTotal(cdp) {
  const { processInfo } = await cdp.send('SystemInfo.getProcessInfo');
  return processInfo.reduce((n, p) => n + p.cpuTime, 0);
}

async function medir(browser, base, ruta, ventanaMs, opciones) {
  const { context, page } = await abrir(browser, base, ruta, opciones);
  await esperarEstable(page);
  const cdp = await browser.newBrowserCDPSession();
  const t0 = Date.now();
  const c0 = await cpuTotal(cdp);
  await page.waitForTimeout(ventanaMs);
  const c1 = await cpuTotal(cdp);
  const pct = ((c1 - c0) / ((Date.now() - t0) / 1000)) * 100;
  await cdp.detach();
  await context.close();
  return pct;
}

export async function run({ browser, base, report, config }) {
  if (!config.pruebas.cpu) { report.info('CPU en reposo', 'desactivada en la configuración (pruebas.cpu)'); return; }
  const u = config.umbrales;
  for (const p of paginasDe(config, 'portada')) {
    const xs = [];
    for (let i = 0; i < u.cpuMuestras; i++) xs.push(await medir(browser, base, p.ruta, u.cpuVentanaMs, {}));
    report.info(`${p.ruta}: CPU en reposo con efectos (objetivo ≈ ${u.cpuObjetivoPct} % de un núcleo)`, resumen(xs));
    report.check(`${p.ruta}: CPU en reposo por debajo del ${u.cpuLimitePct} % (mediana)`, mediana(xs) < u.cpuLimitePct, `${mediana(xs).toFixed(1)} %`);
  }
}
