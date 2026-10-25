// Corre las pruebas de front configuradas contra una carpeta (servida en proceso) o una URL, sin depender del framework.
// Uso: node tests/front/run.mjs [--config <archivo>] [--carpeta <dir> | --url <https://…>] [--solo a,b] [--lista]
// Sale con 0 si todo pasa, 1 si algo falla y 2 si la configuración o el entorno no permiten correr.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cargarConfig, ConfigInvalida, IDS_PRUEBAS } from './lib/config.mjs';
import { cargarPlaywright, lanzar, SinNavegador } from './lib/navegador.mjs';
import { iniciarServidor } from './lib/servidor.mjs';
import { crearInforme, formatear, resumen } from './lib/informe.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
export const PRUEBAS = [...IDS_PRUEBAS];

export function leerArgumentos(args) {
  const o = { solo: null, lista: false };
  const valor = (i, n) => { if (args[i + 1] === undefined || args[i + 1].startsWith('--')) throw new Error(`${n} necesita un valor`); return args[i + 1]; };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--lista') o.lista = true;
    else if (['--config', '--carpeta', '--url', '--solo'].includes(a)) { o[a.slice(2)] = valor(i, a); i++; }
    else throw new Error(`opción desconocida: ${a}`);
  }
  if (o.solo) {
    o.solo = o.solo.split(',').map((s) => s.trim()).filter(Boolean);
    const malas = o.solo.filter((s) => !PRUEBAS.includes(s));
    if (malas.length) throw new Error(`prueba desconocida: ${malas.join(', ')} (hay: ${PRUEBAS.join(', ')})`);
  }
  return o;
}

export async function main(args, { stdout = process.stdout, stderr = process.stderr, proyecto = process.cwd() } = {}) {
  let servidor = null;
  let browser = null;
  try {
    const o = leerArgumentos(args);
    if (o.lista) { stdout.write(`${PRUEBAS.join('\n')}\n`); return 0; }
    const config = cargarConfig(resolve(proyecto, o.config ?? join(aqui, 'front.config.json')));
    const modulos = [];
    const apagadas = [];
    for (const id of PRUEBAS.filter((p) => !o.solo || o.solo.includes(p))) {
      if (config.pruebas[id] === false) { apagadas.push(id); continue; }
      modulos.push(await import(pathToFileURL(join(aqui, 'pruebas', `${id}.mjs`)).href));
    }
    for (const id of apagadas) stdout.write(`- ${id}: desactivada en la configuración (pruebas.${id}: false); no se ejecuta\n`);
    if (!modulos.length) throw new ConfigInvalida(['no queda ninguna prueba por ejecutar (todas las pedidas están desactivadas en pruebas.<id>): un sello sin pruebas no prueba nada']);

    let base = o.url ?? (o.carpeta ? null : config.origen.url); // --carpeta gana a la URL de la configuración
    if (modulos.some((m) => m.requiereNavegador !== false)) {
      if (!base) {
        servidor = await iniciarServidor({ carpeta: resolve(proyecto, o.carpeta ?? config.origen.carpeta), cabeceras: config.origen.cabeceras });
        base = servidor.base;
      }
      browser = await lanzar(cargarPlaywright(proyecto));
    }
    const informes = [];
    for (const m of modulos) {
      const informe = crearInforme();
      try { await m.run({ browser, base, report: informe, config, proyecto }); } catch (e) { informe.check('la prueba termina sin excepción', false, String(e?.stack ?? e).split('\n').slice(0, 3).join(' | ')); }
      informes.push(informe);
      stdout.write(`${formatear(m.nombre, informe)}\n`);
    }
    const { total, fallos, avisos } = resumen(informes);
    stdout.write(`\n${total - fallos}/${total} comprobaciones correctas${fallos ? `; ${fallos} fallan` : ''}${avisos ? `; ${avisos} aviso(s): hay cosas que no se pudieron comprobar (líneas con «!»)` : ''}\n`);
    return fallos ? 1 : 0;
  } catch (e) {
    stderr.write(`${e.message}\n`);
    return e instanceof ConfigInvalida || e instanceof SinNavegador || /^(opción|prueba) desconocida|necesita un valor/.test(e.message) ? 2 : 1;
  } finally {
    await browser?.close();
    await servidor?.cerrar();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = await main(process.argv.slice(2));
