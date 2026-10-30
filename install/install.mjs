// Instalador del kit (ADR 0003, 0006 y 0008). Copia lo que aplica al tipo de proyecto, añade al .gitignore las
// rutas exactas de lo no versionado, genera .claude/kit.json y settings.local.json desde la ficha y deja un
// respaldo fuera del destino. `--dry-run` imprime el plan y no escribe nada; `--diff` además muestra, por archivo que
// difiere, qué hay y qué traería el kit (tampoco escribe). `--forzar` pisa todo lo que difiere; `--forzar=ruta1,ruta2` solo
// esas rutas (o carpetas). La ficha que el proyecto ya tiene se fusiona con la plantilla: no se pierde nada suyo.
// Uso: node install/install.mjs --destino <carpeta> [--tipo A|B|C] [--proyecto <nombre>] [--ficha <archivo>]
//        [--respaldo <carpeta>] [--forzar[=ruta1,ruta2]] [--dry-run] [--diff]
//        node install/install.mjs --auto [--dry-run] [--diff] [--forzar]: el propio kit genera su .claude/ (auto.mjs, ADR 0014)
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, lstatSync, realpathSync } from 'node:fs';
import { join, resolve, dirname, relative, isAbsolute, basename, sep } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { sustituir } from './marcadores.mjs';
import { generarSettings, generarKitConfig, fusionarFicha, FichaInvalida } from '../infra/generate-settings.mjs';
import { diffDeArchivos, resumenDeDiff } from './diff.mjs';
import { planAuto, describirAuto, aplicarAuto } from './auto.mjs';

export const RAIZ_KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export class InstalacionInvalida extends Error {}

const dentro = (raiz, ruta) => {
  const r = relative(raiz, ruta);
  return r === '' || (r !== '..' && !r.startsWith(`..${sep}`) && !isAbsolute(r));
};

/** Resuelve `rel` contra la raíz del destino y rechaza lo que sale de ella (`..`, rutas absolutas, enlaces fuera). */
export function resolverSeguro(raiz, rel) {
  if (isAbsolute(rel) || /^[a-zA-Z]:/.test(rel)) throw new InstalacionInvalida(`ruta absoluta rechazada: ${rel}`);
  const ruta = resolve(raiz, rel);
  if (!dentro(raiz, ruta)) throw new InstalacionInvalida(`la ruta sale del destino: ${rel}`);
  let ancestro = ruta;
  const hay = (p) => { try { lstatSync(p); return true; } catch { return false; } };
  while (!hay(ancestro)) ancestro = dirname(ancestro);
  let real;
  try { real = realpathSync(ancestro); } catch { throw new InstalacionInvalida(`enlace roto en la ruta: ${rel}`); }
  if (!dentro(realpathSync(raiz), real)) throw new InstalacionInvalida(`la ruta pasa por un enlace que sale del destino: ${rel}`);
  return ruta;
}

export function respaldoPorDefecto(env = process.env) {
  if (env.LOCALAPPDATA) return join(env.LOCALAPPDATA, 'agent-kit', 'respaldos');
  return join(homedir(), '.local', 'share', 'agent-kit', 'respaldos');
}

function listar(dir, excluir = []) {
  const salida = [];
  for (const nombre of readdirSync(dir).sort()) {
    if (excluir.includes(nombre)) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...listar(ruta, excluir).map((r) => join(nombre, r)));
    else salida.push(nombre);
  }
  return salida;
}

export function cargarManifiesto(tipo, raizKit = RAIZ_KIT) {
  if (!/^[A-Z]$/.test(tipo)) throw new InstalacionInvalida(`tipo desconocido: «${tipo}» (usa A, B o C)`);
  const archivo = join(raizKit, 'types', tipo, 'manifest.json');
  if (!existsSync(archivo)) throw new InstalacionInvalida(`tipo desconocido: «${tipo}» (usa A, B o C)`);
  return JSON.parse(readFileSync(archivo, 'utf8'));
}

/** Carpetas de compilación o de caché que nunca son del esqueleto aunque existan en el disco del kit. */
const CARPETAS_LOCALES = ['target', '__pycache__', '.ruff_cache', 'node_modules'];

/** Esqueleto del stack que la ficha declara (`kit.preset`), si el manifiesto del tipo tiene `esqueletos` y existe uno para ese preset.
    Nunca se instala un esqueleto que el proyecto no declara (ADR 0016). Devuelve { stack, archivos, gitignore } o null. */
export function esqueletoDe(manifiesto, preset, raizKit = RAIZ_KIT) {
  if (!manifiesto.esqueletos || !preset) return null;
  if (!/^types\/[A-Z]\/esqueletos$/.test(manifiesto.esqueletos)) throw new InstalacionInvalida(`ruta de esqueletos no válida en el manifiesto: ${manifiesto.esqueletos}`);
  const base = join(raizKit, manifiesto.esqueletos);
  if (!existsSync(base)) return null;
  for (const nombre of readdirSync(base).sort()) {
    const meta = join(base, nombre, 'esqueleto.json');
    if (!/^[a-z0-9-]+$/.test(nombre) || !existsSync(meta)) continue;
    const datos = JSON.parse(readFileSync(meta, 'utf8'));
    if (datos.preset !== preset) continue;
    const archivos = listar(join(base, nombre), CARPETAS_LOCALES).filter((r) => r !== 'esqueleto.json').map((r) => ({ origen: join(base, nombre, r), destino: aRelativa(r) }));
    return { stack: datos.stack ?? nombre, archivos, gitignore: Array.isArray(datos.gitignore) ? datos.gitignore : [] };
  }
  return null;
}

const aRelativa = (...partes) => partes.join('/').replace(/\\/g, '/');

/** Lista de archivos a instalar según el manifiesto: { origen (absoluto), destino (relativo), plantilla, versionado }. */
export function archivosDelManifiesto(manifiesto, raizKit = RAIZ_KIT) {
  const salida = [];
  for (const e of manifiesto.archivos) {
    const origen = join(raizKit, e.origen);
    /* Lo privado (casos de consulta local) no se versiona en el kit: en un clon limpio no existe y simplemente no se instala.
       Solo puede ir a kit/ del destino, y el instalador comprueba que git lo ignore antes de copiarlo. */
    if (e.privado) {
      if (!/^kit\/casos-privados\/?$/.test(aRelativa(e.destino))) throw new InstalacionInvalida(`lo privado solo se instala en kit/casos-privados/ del destino: ${e.destino}`);
      if (!existsSync(origen)) continue;
    } else if (!existsSync(origen)) throw new InstalacionInvalida(`el manifiesto nombra algo que no existe: ${e.origen}`);
    const rasgos = { plantilla: !!e.plantilla, versionado: e.versionado, propio: !!e.propio || !!e.privado, privado: !!e.privado };
    const archivos = statSync(origen).isDirectory() ? listar(origen, e.excluir).map((sub) => ({ origen: join(origen, sub), destino: aRelativa(e.destino, sub) })) : [{ origen, destino: aRelativa(e.destino) }];
    for (const a of archivos) {
      if (/(^|[\\/])datos-privados\.json$/.test(a.origen)) throw new InstalacionInvalida(`los datos privados del kit nunca se instalan (${e.origen}); en el proyecto se instala solo el ejemplo`);
      salida.push({ ...a, ...rasgos });
    }
  }
  return salida;
}

/** Git sobre el destino, con tiempo máximo y sin leer stdin. Devuelve el código de salida, o null si no pudo ejecutarse. */
function gitEn(raiz, args) {
  try { execFileSync('git', ['-C', raiz, ...args], { stdio: ['ignore', 'ignore', 'ignore'], timeout: 20000 }); return 0; } catch (e) { return typeof e.status === 'number' ? e.status : null; }
}
export const esRepositorioGit = (raiz) => gitEn(raiz, ['rev-parse', '--git-dir']) === 0;
/** ¿Ignora git esa ruta (relativa al destino) ahora mismo? Falso si el destino no es un repositorio. */
export const gitIgnora = (raiz, rel) => gitEn(raiz, ['check-ignore', '-q', '--', rel]) === 0;
/** ¿Rastrea git ya esa ruta en el destino? Lo rastreado no cuenta como ignorado aunque case con una regla. */
export const gitRastrea = (raiz, rel) => gitEn(raiz, ['ls-files', '--error-unmatch', '--', rel]) === 0;
/** Lo privado solo se escribe si git lo ignora ahora y no lo rastrea. */
const privadaSegura = (raiz, rel) => gitIgnora(raiz, rel) && !gitRastrea(raiz, rel);

/** ¿Está la ruta cubierta por alguna línea de .gitignore del manifiesto? (rutas exactas ancladas a la raíz) */
export function cubiertaPorGitignore(destino, lineas) {
  return lineas.some((l) => (l.endsWith('/') ? `/${destino}`.startsWith(l) : `/${destino}` === l));
}

function nombreDeTipo(manifiesto) {
  return manifiesto.nombre;
}

const normalizarRuta = (r) => r.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');

/** ¿Se pisa este destino? `forzar`: true (todo), false (nada) o una lista de rutas/carpetas. */
export function quiereForzar(forzar, destino) {
  if (forzar === true) return true;
  if (!Array.isArray(forzar)) return false;
  return forzar.map(normalizarRuta).some((r) => destino === r || destino.startsWith(`${r}/`));
}

export function planificar({ destino, tipo, proyecto, fichaRuta, respaldo, forzar = false, ahora = new Date(), raizKit = RAIZ_KIT, env = process.env }) {
  const raiz = resolve(destino);
  if (!existsSync(raiz) || !statSync(raiz).isDirectory()) throw new InstalacionInvalida(`el destino no existe o no es una carpeta: ${raiz}`);
  const manifiesto = cargarManifiesto(tipo, raizKit);
  const plan = { raiz, tipo, manifiesto, proyecto: proyecto ?? basename(raiz), forzar, pendienteEtapa2: manifiesto.estado !== 'disponible', acciones: [], gitignore: { ruta: '.gitignore', añadir: [], previo: null }, advertencias: [], respaldo: null };
  if (plan.pendienteEtapa2) return plan;

  const sello = ahora.toISOString().replace(/[:.]/g, '-');
  const base = resolve(respaldo ?? respaldoPorDefecto(env));
  const dirRespaldo = join(base, `${plan.proyecto}-${sello}`);
  if (dentro(realpathSync(raiz), dirRespaldo) || dentro(raiz, dirRespaldo)) throw new InstalacionInvalida(`el respaldo (${dirRespaldo}) quedaría dentro del destino: elige otra carpeta con --respaldo`);
  plan.respaldo = dirRespaldo;

  let fichaFusionada = false;
  let ficha = JSON.parse(readFileSync(fichaRuta ? resolve(fichaRuta) : join(raizKit, manifiesto.ficha), 'utf8'));
  /* Sin --ficha, la que el proyecto ya tiene manda sobre la plantilla (se le añade lo nuevo del kit y no se le quita nada). */
  const rutaFicha = resolverSeguro(raiz, 'kit/FICHA-INFRA.json');
  if (!fichaRuta && existsSync(rutaFicha)) {
    let propia;
    try { propia = JSON.parse(readFileSync(rutaFicha, 'utf8')); } catch (e) { throw new InstalacionInvalida(`kit/FICHA-INFRA.json del destino no es JSON válido (${e.message}): corrígelo o pasa --ficha`); }
    if (!propia || typeof propia !== 'object' || Array.isArray(propia)) throw new InstalacionInvalida('kit/FICHA-INFRA.json del destino debe ser un objeto: corrígelo o pasa --ficha');
    ficha = fusionarFicha(ficha, propia);
    fichaFusionada = true;
  }
  ficha.proyecto = proyecto ?? (ficha.proyecto || plan.proyecto);
  ficha.tipo = tipo;
  const kitCfg = generarKitConfig(ficha); // valida la ficha: si es inválida, no se escribe nada
  const settings = generarSettings(ficha);

  const valores = {
    proyecto: ficha.proyecto, tipo, tipo_nombre: nombreDeTipo(manifiesto), fecha: ahora.toISOString().slice(0, 10),
    rama_base: kitCfg.baseBranch, max_rama: kitCfg.maxBranchCommits, max_modulo: 30,
    perfil_expresion: manifiesto.perfilExpresion ?? 'sobrio',
  };

  const entradas = [];
  for (const a of archivosDelManifiesto(manifiesto, raizKit)) {
    let contenido = readFileSync(a.origen);
    if (a.plantilla) {
      const r = sustituir(contenido.toString('utf8'), valores);
      contenido = Buffer.from(r.texto);
      if (r.sinValor.length) plan.advertencias.push(`${a.destino}: marcadores sin valor ({{${r.sinValor.join('}}, {{')}}})`);
    }
    entradas.push({ destino: a.destino, contenido, generado: false, propio: a.propio, privado: a.privado });
  }
  const esqueleto = esqueletoDe(manifiesto, ficha.kit?.preset, raizKit);
  if (esqueleto) {
    for (const a of esqueleto.archivos) entradas.push({ destino: a.destino, contenido: readFileSync(a.origen), generado: false });
    plan.esqueleto = esqueleto.stack;
    plan.advertencias.push(`esqueleto del stack «${esqueleto.stack}» (kit.preset=${ficha.kit.preset}): proyecto mínimo ${tipo === 'C' ? 'ejecutable (CLI y daemon) con pruebas, integración continua y publicación de ejemplo' : 'con salud, prueba, contenedor e integración continua'}; el estado de su verificación está en types/${tipo}/esqueletos/VERIFICACION.md del kit`);
  }
  entradas.push({ destino: 'kit/FICHA-INFRA.json', contenido: Buffer.from(`${JSON.stringify(ficha, null, 2)}\n`), generado: true });
  entradas.push({ destino: '.claude/kit.json', contenido: Buffer.from(`${JSON.stringify(kitCfg, null, 2)}\n`), generado: true });
  const hayLocal = existsSync(resolverSeguro(raiz, '.claude/settings.local.json'));
  entradas.push({ destino: hayLocal ? '.claude/settings.local.generado.json' : '.claude/settings.local.json', contenido: Buffer.from(`${JSON.stringify(settings, null, 2)}\n`), generado: true });
  if (hayLocal) plan.advertencias.push('ya existía .claude/settings.local.json: no se toca; revisa settings.local.generado.json y cópialo a mano');

  const vistos = new Set();
  for (const e of entradas) {
    if (vistos.has(e.destino)) throw new InstalacionInvalida(`el manifiesto instala dos veces ${e.destino}`);
    vistos.add(e.destino);
    const ruta = resolverSeguro(raiz, e.destino);
    let accion = 'crear';
    let anterior = null;
    if (existsSync(ruta)) {
      anterior = readFileSync(ruta);
      if (anterior.equals(e.contenido)) accion = 'igual';
      else accion = (e.propio ? Array.isArray(forzar) && forzar.map(normalizarRuta).includes(e.destino) : quiereForzar(forzar, e.destino)) ? 'sobrescribir' : 'omitir'; // lo «propio» del proyecto (datos privados) solo se pisa nombrando su ruta exacta, no una carpeta
    }
    plan.acciones.push({ ...e, ruta, accion, anterior });
  }

  if (fichaFusionada) {
    const f = plan.acciones.find((a) => a.destino === 'kit/FICHA-INFRA.json');
    plan.advertencias.push(f.accion === 'igual' ? 'kit/FICHA-INFRA.json: la ficha del proyecto ya incluye todo lo de la plantilla' : `kit/FICHA-INFRA.json: la ficha del proyecto se fusionaría con la plantilla (se conserva todo lo suyo, se añade lo nuevo del kit y se vuelven a añadir permisos de la plantilla que el proyecto hubiera quitado); ${f.accion === 'omitir' ? 'no se escribe sin --forzar=kit/FICHA-INFRA.json' : 'se escribe con respaldo'}`);
  }

  if (Array.isArray(forzar)) {
    const sinMatch = forzar.filter((r) => !plan.acciones.some((a) => quiereForzar([r], a.destino)));
    if (sinMatch.length) throw new InstalacionInvalida(`--forzar nombra rutas que el kit no instala: ${sinMatch.join(', ')} (usa --diff para ver las rutas)`);
  }

  const attrs = plan.acciones.find((a) => a.destino === '.gitattributes' && a.accion === 'omitir');
  if (attrs) plan.advertencias.push('ya existía .gitattributes con otro contenido: no se toca; revisa que tenga «* text=auto eol=lf» (evita el ruido de fin de línea en Windows) y «*.pdf binary», «*.woff2 binary»');

  // .gitignore: rutas exactas, una por una, sin duplicar y sin tocar el resto.
  const rutaIgnore = resolverSeguro(raiz, '.gitignore');
  const previo = existsSync(rutaIgnore) ? readFileSync(rutaIgnore, 'utf8') : null;
  const existentes = new Set((previo ?? '').split(/\r?\n/).map((l) => l.trim()));
  plan.gitignore = { ruta: rutaIgnore, previo, añadir: [...new Set([...manifiesto.gitignore, ...(esqueleto?.gitignore ?? [])])].filter((l) => !existentes.has(l)) };

  /* Lo privado solo se copia si git lo ignora en el destino. Aquí se predice (para --dry-run); aplicar() lo vuelve a comprobar
     con git justo antes de escribir, ya con el .gitignore actualizado. */
  const privadas = plan.acciones.filter((a) => a.privado);
  if (privadas.length) {
    let motivo = null;
    if (!esRepositorioGit(raiz)) motivo = 'el destino no es un repositorio git: no se puede comprobar que git ignore kit/casos-privados/';
    else if (privadas.some((a) => gitRastrea(raiz, a.destino))) motivo = 'git ya rastrea (versiona) alguno de esos archivos en el destino';
    else if (!privadas.every((a) => gitIgnora(raiz, a.destino) || cubiertaPorGitignore(a.destino, [...existentes, ...plan.gitignore.añadir]))) motivo = 'git no ignora esa carpeta y el instalador no añade una regla que la cubra';
    plan.privados = { archivos: privadas.map((a) => a.destino), rechazo: motivo };
    if (motivo) {
      for (const a of privadas) a.accion = 'rechazar';
      plan.advertencias.push(`RECHAZADO: no se copia kit/casos-privados/ (${motivo}). Es material de consulta local y nunca se versiona.`);
    }
  }
  return plan;
}

/** Texto legible del plan (también para --dry-run). */
export function describirPlan(plan, { dryRun, diff = false }) {
  const l = [];
  l.push(`${dryRun ? 'PLAN (dry-run: no se escribe nada)' : 'INSTALACIÓN'} — tipo ${plan.tipo} (${plan.manifiesto.nombre}) en ${plan.raiz}`);
  if (plan.pendienteEtapa2) {
    l.push(`El tipo ${plan.tipo} todavía no está disponible (estado del manifiesto: ${plan.manifiesto.estado}). No se instala nada.`);
    return l.join('\n');
  }
  l.push(`Proyecto: ${plan.proyecto}`, `Respaldo (fuera del destino): ${plan.respaldo}`);
  const etiqueta = { rechazar: 'RECHAZADO (no se puede confirmar que git la ignore)', crear: 'crear', igual: 'igual (sin cambios)', sobrescribir: 'sobrescribir (con respaldo)', omitir: 'omitir (ya existe; usa --forzar o --forzar=<ruta>)' };
  for (const a of plan.acciones) l.push(`  ${etiqueta[a.accion].padEnd(30)} ${a.destino}`);
  if (diff) {
    const distintas = plan.acciones.filter((a) => a.accion === 'omitir' || a.accion === 'sobrescribir');
    l.push('', `RESUMEN (${distintas.length} archivo(s) difieren):`);
    for (const a of distintas) l.push(`  ${resumenDeDiff(a.anterior, a.contenido).padEnd(24)} ${a.destino}`);
    l.push('', 'DIFERENCIAS («-» es lo que hay, «+» lo que traería el kit):');
    for (const a of distintas) {
      /* Los datos privados y la ficha pueden contener nombres o datos del proyecto: la terminal y los registros no deben verlos. */
      const reservado = a.propio || a.destino === 'kit/FICHA-INFRA.json';
      const texto = diffDeArchivos(a.anterior, a.contenido);
      const n = texto.split('\n').filter((x) => /^ {2}[-+] /.test(x)).length;
      l.push(`--- ${a.destino}  [${a.accion === 'omitir' ? 'se omitiría' : 'se sobrescribiría'}]`, reservado ? `  (contenido no mostrado: puede incluir datos del proyecto; difieren ${n} línea(s). Compáralo a mano)` : texto);
    }
    if (!distintas.length) l.push('  (ninguno: lo instalado coincide con el kit)');
    l.push('');
  }
  l.push(plan.gitignore.añadir.length ? `  .gitignore: añadir ${plan.gitignore.añadir.join(' ')}` : '  .gitignore: sin cambios');
  for (const w of plan.advertencias) l.push(`Aviso: ${w}`);
  l.push('Siguiente paso del humano: revisar .claude/settings.local.json y rellenar kit/FICHA-INFRA.json.');
  return l.join('\n');
}

/** Escribe el plan. Primero el respaldo de lo que se va a pisar; el destino nunca se toca fuera de la raíz. */
export function aplicar(plan) {
  if (plan.pendienteEtapa2) return { escritos: [], omitidos: [], rechazados: [] };
  const rechazados = plan.acciones.filter((a) => a.accion === 'rechazar').map((a) => a.destino);
  if (!plan.acciones.some((a) => a.accion === 'crear' || a.accion === 'sobrescribir') && !plan.gitignore.añadir.length) return { escritos: [], omitidos: plan.acciones.filter((a) => a.accion !== 'rechazar').map((a) => a.destino), rechazados };
  const escritos = [];
  const omitidos = [];
  const aRespaldar = plan.acciones.filter((a) => a.accion === 'sobrescribir');
  const ignoreCambia = plan.gitignore.añadir.length > 0;
  mkdirSync(plan.respaldo, { recursive: true });
  for (const a of aRespaldar) {
    const copia = join(plan.respaldo, 'previo', a.destino);
    mkdirSync(dirname(copia), { recursive: true });
    writeFileSync(copia, a.anterior);
  }
  if (ignoreCambia && plan.gitignore.previo !== null) writeFileSync(join(plan.respaldo, 'previo.gitignore'), plan.gitignore.previo);
  writeFileSync(join(plan.respaldo, 'instalacion.json'), `${JSON.stringify({ tipo: plan.tipo, destino: plan.raiz, acciones: plan.acciones.map((a) => ({ destino: a.destino, accion: a.accion })), gitignore: plan.gitignore.añadir }, null, 2)}\n`);

  const escribir = (a) => {
    resolverSeguro(plan.raiz, a.destino); // recomprueba justo antes de escribir
    mkdirSync(dirname(a.ruta), { recursive: true });
    writeFileSync(a.ruta, a.contenido);
    escritos.push(a.destino);
  };
  for (const a of plan.acciones) {
    if (a.privado || a.accion === 'rechazar') continue; // lo privado va después del .gitignore
    if (a.accion === 'crear' || a.accion === 'sobrescribir') escribir(a);
    else omitidos.push(a.destino);
  }
  if (ignoreCambia) {
    const previo = plan.gitignore.previo ?? '';
    const sep_ = previo === '' || previo.endsWith('\n') ? '' : '\n';
    writeFileSync(plan.gitignore.ruta, `${previo}${sep_}${plan.gitignore.añadir.join('\n')}\n`);
    escritos.push('.gitignore');
  }
  for (const a of plan.acciones.filter((x) => x.privado && x.accion !== 'rechazar')) {
    if (a.accion !== 'crear' && a.accion !== 'sobrescribir') { omitidos.push(a.destino); continue; }
    if (!privadaSegura(plan.raiz, a.destino)) { rechazados.push(a.destino); continue; } // comprobación final con el .gitignore ya escrito
    escribir(a);
  }
  return { escritos, omitidos, rechazados };
}

export function leerArgumentos(args) {
  const o = { dryRun: false, forzar: false, diff: false, auto: false };
  const valor = (i, n) => { if (args[i + 1] === undefined || args[i + 1].startsWith('--')) throw new InstalacionInvalida(`${n} necesita un valor`); return args[i + 1]; };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') o.dryRun = true;
    else if (a === '--diff') o.diff = true;
    else if (a === '--auto') o.auto = true;
    else if (a === '--forzar') o.forzar = true;
    else if (a.startsWith('--forzar=')) {
      const rutas = a.slice('--forzar='.length).split(',').map((r) => r.trim()).filter(Boolean);
      if (!rutas.length) throw new InstalacionInvalida('--forzar= necesita al menos una ruta (o usa --forzar solo para todo)');
      o.forzar = o.forzar === true ? true : [...(o.forzar || []), ...rutas];
    }
    else if (['--destino', '--tipo', '--proyecto', '--ficha', '--respaldo'].includes(a)) { o[a.slice(2)] = valor(i, a); i++; }
    else throw new InstalacionInvalida(`opción desconocida: ${a}`);
  }
  if (o.tipo) o.tipo = o.tipo.toUpperCase();
  return o;
}

async function preguntarTipo() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const r = await rl.question('Tipo de proyecto — A: portafolio estático, B: sistema con servicios, C: herramientas y software de sistemas [A/B/C]: ');
    return r.trim().toUpperCase();
  } finally { rl.close(); }
}

export async function main(args, { stdout = process.stdout, stderr = process.stderr, interactivo = process.stdin.isTTY, ahora = new Date() } = {}) {
  try {
    const o = leerArgumentos(args);
    if (o.auto) {
      if (o.destino || o.tipo || o.proyecto || o.ficha || o.respaldo) throw new InstalacionInvalida('--auto solo se aplica al propio repositorio del kit: no admite --destino, --tipo, --proyecto, --ficha ni --respaldo');
      if (Array.isArray(o.forzar)) throw new InstalacionInvalida('--auto solo admite --forzar sin rutas (quita los sobrantes)');
      const plan = planAuto();
      stdout.write(`${describirAuto(plan, { dryRun: o.dryRun, diff: o.diff })}
`);
      if (o.dryRun || o.diff) return 0;
      const r = aplicarAuto(plan, { forzar: o.forzar === true });
      stdout.write(`Hecho: ${r.escritos.length} escritos, ${r.borrados.length} borrados.
`);
      return 0;
    }
    if (!o.destino) throw new InstalacionInvalida('falta --destino <carpeta>');
    if (!o.tipo) {
      if (!interactivo) throw new InstalacionInvalida('sin terminal interactiva hay que pasar --tipo A|B|C');
      o.tipo = await preguntarTipo();
    }
    const plan = planificar({ destino: o.destino, tipo: o.tipo, proyecto: o.proyecto, fichaRuta: o.ficha, respaldo: o.respaldo, forzar: o.forzar, ahora });
    stdout.write(`${describirPlan(plan, { dryRun: o.dryRun || o.diff, diff: o.diff })}\n`);
    if (o.dryRun || o.diff || plan.pendienteEtapa2) return 0;
    const r = aplicar(plan);
    stdout.write(`Hecho: ${r.escritos.length} escritos, ${r.omitidos.length} omitidos. Respaldo en ${plan.respaldo}\n`);
    if (r.rechazados.length) {
      stderr.write(`RECHAZADO: ${r.rechazados.length} archivo(s) de material privado NO se copiaron porque git no los ignora en el destino (kit/casos-privados/ nunca se versiona). El resto se instaló.\n`);
      return 3;
    }
    return 0;
  } catch (e) {
    stderr.write(`${e.message}\n`);
    return e instanceof InstalacionInvalida || e instanceof FichaInvalida ? 2 : 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = await main(process.argv.slice(2));
}
