// Acceso al navegador. `playwright-core` es una devDependency opcional del proyecto (versión fijada con su
// package-lock.json); el kit no la instala ni descarga navegadores: se usa el Chrome ya instalado con CHROMIUM_PATH.
import { createRequire } from 'node:module';
import { join } from 'node:path';

export class SinNavegador extends Error {}

/** `playwright-core` del proyecto, o la carpeta que indique PLAYWRIGHT_CORE. */
export function cargarPlaywright(cwd = process.cwd()) {
  const require = createRequire(join(cwd, 'package.json'));
  for (const id of [process.env.PLAYWRIGHT_CORE, 'playwright-core'].filter(Boolean)) {
    try { return require(id); } catch { /* se prueba el siguiente */ }
  }
  throw new SinNavegador('No se encontró playwright-core. Instálalo como devDependency del proyecto (npm ci, con su package-lock.json) o define PLAYWRIGHT_CORE con su carpeta. El kit no lo instala.');
}

export function lanzar(pw) {
  const ruta = process.env.CHROMIUM_PATH || undefined;
  if (!ruta) process.stderr.write('Aviso: CHROMIUM_PATH no está definido; playwright-core buscará su propio navegador (el kit no lo descarga).\n');
  return pw.chromium.launch({ executablePath: ruta });
}

/** Un contexto con el tema, el tamaño y las preferencias pedidas, y la página ya cargada. */
export async function abrir(browser, base, ruta, { viewport = { width: 1280, height: 800 }, tema = 'dark', reducido = 'no-preference', js = true, init, permisos, esperar = 'load', video } = {}) {
  const context = await browser.newContext({
    viewport, colorScheme: tema, reducedMotion: reducido, javaScriptEnabled: js,
    ...(permisos ? { permissions: permisos } : {}), ...(video ? { recordVideo: { dir: video, size: viewport } } : {}),
  });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  await page.goto(base + ruta, { waitUntil: esperar });
  return { context, page };
}

/** Espera por condición (no por tiempo): fuentes listas y animaciones finitas terminadas. */
export async function esperarEstable(page, { timeout = 15000 } = {}) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.getAnimations().every((a) => a.effect?.getComputedTiming().iterations === Infinity || a.playState === 'finished'), null, { timeout });
}

/** ¿Pertenece la URL al origen de `base`? (compara el origen completo, no el prefijo del texto). */
export function mismoOrigen(url, base) {
  try { return new URL(url).origin === new URL(base).origin; } catch { return false; }
}

export const viewportsDe = (config) => Object.entries(config.viewports).map(([nombre, [width, height]]) => ({ nombre, width, height }));
export const nombreTema = (t) => (t === 'dark' ? 'oscuro' : 'claro');
