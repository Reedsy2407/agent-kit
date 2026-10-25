// Video corto (webm) de una página: se recorre de arriba abajo por pantallas, esperando por condición (dos cuadros de
// animación entre paso y paso, no un tiempo fijo), hacia design/refs/<etiqueta>/ (ignorado por git).
// Uso: node tests/front/herramientas/video.mjs [--config <archivo>] [--carpeta <dir> | --url <https://…>]
//        [--ruta /index.html] [--ancho 1280] [--tema dark|light] [--etiqueta video] [--pasos 12]
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cargarConfig } from '../lib/config.mjs';
import { abrir, cargarPlaywright, esperarEstable, lanzar } from '../lib/navegador.mjs';
import { iniciarServidor } from '../lib/servidor.mjs';
import { nombreArchivo, resolverSalida } from './salida.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));

export function leerArgumentos(args) {
  const o = {};
  const valor = (i, n) => { if (args[i + 1] === undefined || args[i + 1].startsWith('--')) throw new Error(`${n} necesita un valor`); return args[i + 1]; };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (['--config', '--carpeta', '--url', '--ruta', '--ancho', '--tema', '--etiqueta', '--pasos'].includes(a)) { o[a.slice(2)] = valor(i, a); i++; }
    else throw new Error(`opción desconocida: ${a}`);
  }
  o.ancho = o.ancho ? Number(o.ancho) : 1280;
  o.pasos = o.pasos ? Number(o.pasos) : 12;
  if (!Number.isInteger(o.ancho) || o.ancho < 200 || o.ancho > 4000) throw new Error('--ancho debe ser un entero entre 200 y 4000');
  if (!Number.isInteger(o.pasos) || o.pasos < 1 || o.pasos > 40) throw new Error('--pasos debe ser un entero entre 1 y 40 (el video es corto)');
  if (o.tema && !['dark', 'light'].includes(o.tema)) throw new Error('--tema debe ser dark o light');
  return o;
}

const dosCuadros = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));

export async function main(args, { stdout = process.stdout, stderr = process.stderr, proyecto = process.cwd() } = {}) {
  let servidor = null;
  let browser = null;
  try {
    const o = leerArgumentos(args);
    const config = cargarConfig(resolve(proyecto, o.config ?? join(aqui, '..', 'front.config.json')));
    const salida = resolverSalida(proyecto, o.etiqueta ?? 'video');
    mkdirSync(salida, { recursive: true });
    const ruta = o.ruta ?? config.paginas[0].ruta;
    const tema = o.tema ?? 'dark';
    let base = o.url ?? (o.carpeta ? null : config.origen.url); // --carpeta gana a la URL de la configuración
    if (!base) { servidor = await iniciarServidor({ carpeta: resolve(proyecto, o.carpeta ?? config.origen.carpeta), cabeceras: config.origen.cabeceras }); base = servidor.base; }
    browser = await lanzar(cargarPlaywright(proyecto));
    const alto = o.ancho < 600 ? 740 : 800;
    const bruto = join(salida, '.bruto');
    rmSync(bruto, { recursive: true, force: true });
    const { context, page } = await abrir(browser, base, ruta, { viewport: { width: o.ancho, height: alto }, tema, video: bruto });
    await esperarEstable(page);
    for (let i = 0; i < o.pasos; i++) {
      const hayMas = await page.evaluate(async (paso) => {
        window.scrollBy({ top: paso, behavior: 'instant' });
        await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
        return window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 2;
      }, Math.round(alto * 0.8));
      if (!hayMas) break;
    }
    await page.evaluate(dosCuadros);
    const video = page.video();
    await context.close(); // cerrar el contexto es lo que termina de escribir el webm
    const destino = join(salida, nombreArchivo(ruta, o.ancho, tema, 'webm'));
    renameSync(await video.path(), destino);
    rmSync(bruto, { recursive: true, force: true });
    stdout.write(`Video en ${destino}\n`);
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
