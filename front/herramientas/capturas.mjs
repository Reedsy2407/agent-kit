// Capturas locales a 360, 768, 1280 y 1920 px, en oscuro y claro, esperando por condición (fuentes listas y
// animaciones finitas terminadas), hacia design/refs/<etiqueta>/ (ignorado por git).
// Uso: node tests/front/herramientas/capturas.mjs [--config <archivo>] [--carpeta <dir> | --url <https://…>]
//        [--rutas /a.html,/b.html] [--anchos 360,768,1280,1920] [--etiqueta capturas] [--completa]
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cargarConfig } from '../lib/config.mjs';
import { abrir, cargarPlaywright, esperarEstable, lanzar } from '../lib/navegador.mjs';
import { iniciarServidor } from '../lib/servidor.mjs';
import { nombreArchivo, resolverSalida } from './salida.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
export const ANCHOS = [360, 768, 1280, 1920];
const altoDe = (ancho) => (ancho < 600 ? 740 : ancho < 1000 ? 1024 : ancho < 1600 ? 800 : 1080);

export function leerArgumentos(args) {
  const o = { completa: false };
  const valor = (i, n) => { if (args[i + 1] === undefined || args[i + 1].startsWith('--')) throw new Error(`${n} necesita un valor`); return args[i + 1]; };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--completa') o.completa = true;
    else if (['--config', '--carpeta', '--url', '--rutas', '--anchos', '--etiqueta'].includes(a)) { o[a.slice(2)] = valor(i, a); i++; }
    else throw new Error(`opción desconocida: ${a}`);
  }
  if (o.anchos) {
    o.anchos = o.anchos.split(',').map((x) => Number(x.trim()));
    if (!o.anchos.every((n) => Number.isInteger(n) && n >= 200 && n <= 4000)) throw new Error('--anchos debe ser una lista de enteros entre 200 y 4000');
  }
  return o;
}

export async function main(args, { stdout = process.stdout, stderr = process.stderr, proyecto = process.cwd() } = {}) {
  let servidor = null;
  let browser = null;
  try {
    const o = leerArgumentos(args);
    const config = cargarConfig(resolve(proyecto, o.config ?? join(aqui, '..', 'front.config.json')));
    const salida = resolverSalida(proyecto, o.etiqueta ?? 'capturas');
    mkdirSync(salida, { recursive: true });
    const rutas = o.rutas ? o.rutas.split(',') : config.paginas.map((p) => p.ruta);
    let base = o.url ?? (o.carpeta ? null : config.origen.url); // --carpeta gana a la URL de la configuración
    if (!base) { servidor = await iniciarServidor({ carpeta: resolve(proyecto, o.carpeta ?? config.origen.carpeta), cabeceras: config.origen.cabeceras }); base = servidor.base; }
    browser = await lanzar(cargarPlaywright(proyecto));
    let n = 0;
    for (const ruta of rutas) {
      for (const ancho of o.anchos ?? ANCHOS) {
        for (const tema of ['dark', 'light']) {
          const { context, page } = await abrir(browser, base, ruta, { viewport: { width: ancho, height: altoDe(ancho) }, tema });
          await esperarEstable(page);
          await page.screenshot({ path: join(salida, nombreArchivo(ruta, ancho, tema, 'png')), fullPage: o.completa });
          await context.close();
          n += 1;
        }
      }
    }
    stdout.write(`${n} capturas en ${salida}\n`);
    return 0;
  } catch (e) {
    stderr.write(`${e.message}\n`);
    return 2;
  } finally {
    await browser?.close();
    await servidor?.cerrar();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = await main(process.argv.slice(2));
