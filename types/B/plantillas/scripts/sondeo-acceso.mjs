// Sondeo de acceso para la skill «evaluar-viabilidad»: por cada dependencia externa de un JSON, hace UNA petición de solo lectura
// (GET o HEAD) sin credenciales y escribe un BORRADOR de evidencias para DECISION-VIABILIDAD.md: estado HTTP, latencia, tipo de
// contenido, forma de la respuesta, si exige autenticación y si responde desde la red de quien lo ejecuta.
// NO verifica términos de uso, licencias ni legalidad: eso lo lee una persona. Un sondeo que sale bien no es un GO.
// Sin credenciales: ni el JSON ni la salida las llevan (el archivo rechaza claves desconocidas y URLs con usuario o con claves en la
// consulta; la salida omite la consulta). Una dependencia que exige credencial se sondea SIN ella: se comprueba que la pide.
// Se ejecuta solo si la ficha lo permite (ops.sondeoAcceso.permitida). No esquiva ningún control de acceso.
// Uso: node scripts/sondeo-acceso.mjs [ops/dependencias.json] [--salida ops/EVIDENCIAS-BORRADOR.md]
// Salida: 0 borrador escrito y todo lo esperado se cumplió, 1 borrador escrito con algo inesperado, 2 uso, permiso o archivo inválido.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

export class SondeoInvalido extends Error {}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
const CLAVES_DEP = new Set(['nombre', 'tipo', 'importancia', 'url', 'metodo', 'espera', 'requiereCredencial', 'nota']);
const CLAVES_ESPERA = new Set(['estado', 'tipoContenido']);
const TIPOS = ['datos', 'API', 'acceso', 'convenio', 'licencia', 'costo', 'legalidad', 'plataforma'];
const IMPORTANCIAS = ['crítica', 'importante', 'accesoria'];
const CONSULTA_SECRETA = /(^|[?&;])[^=&]*(key|token|secret|passw|pwd|auth|credential|signature|sig|session)[^=&]*=/i;
const PRIVADA = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|0\.|127\.)/;
const MAX_DEPENDENCIAS = 30;
const MAX_CUERPO = 256 * 1024;

/** Valida el JSON de dependencias. Lanza SondeoInvalido con todos los problemas juntos. Devuelve la lista normalizada. */
export function validarDependencias(datos) {
  const errores = [];
  if (!datos || typeof datos !== 'object' || !Array.isArray(datos.dependencias)) throw new SondeoInvalido('el archivo debe ser { "dependencias": [ ... ] }');
  for (const k of Object.keys(datos)) if (!['dependencias', '_ayuda'].includes(k)) errores.push(`clave desconocida «${k}» (el archivo no lleva credenciales ni cabeceras)`);
  if (!datos.dependencias.length) errores.push('dependencias está vacía');
  if (datos.dependencias.length > MAX_DEPENDENCIAS) errores.push(`demasiadas dependencias (máximo ${MAX_DEPENDENCIAS}): un sondeo no es un rastreo`);
  const lista = datos.dependencias.map((d, i) => {
    const q = `dependencias[${i}]`;
    if (!d || typeof d !== 'object') { errores.push(`${q} debe ser un objeto`); return null; }
    for (const k of Object.keys(d)) if (!CLAVES_DEP.has(k)) errores.push(`${q}: clave desconocida «${k}» (no se admiten credenciales, cabeceras ni cuerpos)`);
    for (const k of Object.keys(d.espera ?? {})) if (!CLAVES_ESPERA.has(k)) errores.push(`${q}.espera: clave desconocida «${k}»`);
    if (typeof d.nombre !== 'string' || !d.nombre.trim()) errores.push(`${q}.nombre es obligatorio`);
    if (d.tipo !== undefined && !TIPOS.includes(d.tipo)) errores.push(`${q}.tipo debe ser uno de ${TIPOS.join(', ')}`);
    if (d.importancia !== undefined && !IMPORTANCIAS.includes(d.importancia)) errores.push(`${q}.importancia debe ser ${IMPORTANCIAS.join(', ')}`);
    if ((d.metodo ?? 'GET') !== 'GET' && d.metodo !== 'HEAD') errores.push(`${q}.metodo debe ser GET o HEAD (solo lectura)`);
    if (d.requiereCredencial !== undefined && typeof d.requiereCredencial !== 'boolean') errores.push(`${q}.requiereCredencial debe ser true o false`);
    if (d.espera?.estado !== undefined && !(Number.isInteger(d.espera.estado) && d.espera.estado >= 100 && d.espera.estado <= 599)) errores.push(`${q}.espera.estado debe ser un código HTTP`);
    if (d.espera?.tipoContenido !== undefined && typeof d.espera.tipoContenido !== 'string') errores.push(`${q}.espera.tipoContenido debe ser un texto (p. ej. application/json)`);
    try { urlSegura(d.url); } catch (e) { errores.push(`${q}.url: ${e.message}`); }
    return d;
  });
  if (errores.length) throw new SondeoInvalido(`dependencias inválidas:\n- ${errores.join('\n- ')}`);
  return lista;
}

/** URL permitida: https (http solo en la propia máquina), sin usuario ni contraseña, sin claves en la consulta, sin redes privadas. */
export function urlSegura(texto) {
  let u;
  try { u = new URL(texto); } catch { throw new Error(`no es una URL válida`); }
  const local = LOOPBACK.has(u.hostname);
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) throw new Error('debe ser https (http solo para localhost, 127.0.0.1 o [::1])');
  if (u.username || u.password) throw new Error('lleva usuario o contraseña: las credenciales no van en el archivo');
  if (CONSULTA_SECRETA.test(u.search)) throw new Error('la consulta parece llevar una credencial (clave, token, firma…): no va en el archivo');
  if (!local && (PRIVADA.test(u.hostname) || u.hostname.startsWith('['))) throw new Error('es una dirección de red privada, local o IPv6 literal: el sondeo solo mira servicios públicos por nombre o por IPv4 pública');
  return u;
}

/** Forma de una respuesta JSON sin copiar datos: tipo, tamaño y nombres de las primeras claves. */
export function formaDeJson(valor) {
  if (Array.isArray(valor)) return `lista de ${valor.length} elemento(s)${valor.length && valor[0] && typeof valor[0] === 'object' && !Array.isArray(valor[0]) ? `; cada elemento es un objeto con claves como ${Object.keys(valor[0]).slice(0, 8).join(', ')}` : ''}`;
  if (valor && typeof valor === 'object') { const k = Object.keys(valor); return `objeto con ${k.length} clave(s)${k.length ? `: ${k.slice(0, 8).join(', ')}${k.length > 8 ? '…' : ''}` : ''}`; }
  return `valor ${typeof valor}`;
}

async function leerAcotado(res) {
  if (!res.body) return '';
  const lector = res.body.getReader();
  const trozos = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.length;
    if (total > MAX_CUERPO) { await lector.cancel(); return null; }
    trozos.push(value);
  }
  return Buffer.concat(trozos).toString('utf8');
}

/** Una petición de solo lectura, sin credenciales y sin seguir redirecciones. Devuelve las observaciones (sin el cuerpo). */
export async function sondear(dep, { fetchFn = fetch, timeoutMs = 10000 } = {}) {
  const u = urlSegura(dep.url);
  const metodo = dep.metodo ?? 'GET';
  const obs = { nombre: dep.nombre, url: u.origin + u.pathname, consultaOmitida: Boolean(u.search), metodo, advertencias: [] };
  const t0 = performance.now();
  let res;
  try {
    res = await fetchFn(u.href, { method: metodo, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json, */*;q=0.5', 'user-agent': 'agent-kit-sondeo/1' } });
  } catch (e) {
    obs.error = e.name === 'TimeoutError' ? `sin respuesta en ${timeoutMs} ms` : `no se pudo conectar (${e.cause?.code ?? e.message})`;
    obs.ms = Math.round(performance.now() - t0);
    return obs;
  }
  obs.estado = res.status;
  obs.tipoContenido = (res.headers.get('content-type') ?? '').split(';')[0].trim() || null;
  obs.autenticacion = res.headers.get('www-authenticate') ? 'lo pide la propia respuesta (cabecera WWW-Authenticate)' : null;
  let cuerpo = '';
  if (metodo === 'GET' && res.status < 300) cuerpo = await leerAcotado(res);
  else await res.body?.cancel?.();
  obs.ms = Math.round(performance.now() - t0);
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('location');
    let destino = '(sin cabecera Location)';
    try { destino = new URL(loc, u).origin; } catch { /* queda el texto por defecto */ }
    obs.redireccion = destino;
    obs.advertencias.push(`redirige a ${destino}: no se sigue; sondea esa dirección si es la real`);
  }
  if (cuerpo === null) obs.advertencias.push(`la respuesta pasa de ${MAX_CUERPO / 1024} KB: no se analizó su forma`);
  else if (metodo === 'GET' && res.status < 300) {
    if (/json/i.test(obs.tipoContenido ?? '') || /^\s*[[{]/.test(cuerpo)) {
      try { obs.forma = formaDeJson(JSON.parse(cuerpo)); } catch { obs.advertencias.push('dice ser JSON pero no se puede interpretar'); }
    } else obs.forma = cuerpo.length ? `contenido no JSON (${obs.tipoContenido ?? 'tipo desconocido'})` : 'respuesta vacía';
  }
  if (res.status === 401) obs.autenticacion ??= 'responde 401: exige autenticación';
  if (res.status === 403) obs.autenticacion ??= 'responde 403: acceso denegado sin credenciales (puede exigir autenticación o permisos)';
  if (res.status === 403 || res.status === 451) obs.advertencias.push('posible bloqueo por región o por política del servicio (no confirmado): repite el sondeo desde la región donde correrá el sistema');
  if (res.status === 429) obs.advertencias.push('límite de peticiones alcanzado: conviene revisar la cuota');
  if (res.status >= 500) obs.advertencias.push('error del servidor: no es evidencia de acceso');
  obs.region = res.status < 400 ? 'respondió a quien ejecuta el sondeo; no prueba que responda desde la región de producción' : 'no respondió con éxito desde la red de quien ejecuta; no se sabe si desde otra región sí';
  /* Lo esperado */
  const espera = dep.espera ?? {};
  const fallos = [];
  if (espera.estado !== undefined && obs.estado !== espera.estado) fallos.push(`se esperaba el estado ${espera.estado} y respondió ${obs.estado}`);
  if (espera.tipoContenido && !(obs.tipoContenido ?? '').toLowerCase().includes(espera.tipoContenido.toLowerCase())) fallos.push(`se esperaba contenido ${espera.tipoContenido} y llegó ${obs.tipoContenido ?? 'sin tipo'}`);
  if (dep.requiereCredencial === true && ![401, 403].includes(obs.estado)) fallos.push('se declaró que exige credencial pero respondió sin pedirla (¿es público, o la credencial es de otro nivel?)');
  if (dep.requiereCredencial === false && [401, 403].includes(obs.estado)) fallos.push('se declaró público pero exige autenticación');
  obs.fallos = fallos;
  return obs;
}

const celda = (t) => String(t ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

/** Borrador en Markdown con la tabla de dependencias de la plantilla DECISION-VIABILIDAD.md y el detalle por dependencia. */
export function redactarBorrador(deps, observaciones, { fecha, ejecutor = 'este equipo' }) {
  const l = [];
  l.push('# Borrador de evidencias de acceso (sondeo automático)', '');
  l.push(`Generado el ${fecha} por \`scripts/sondeo-acceso.mjs\` desde ${ejecutor}.`, '');
  l.push('> **Advertencia: este sondeo NO verifica los términos de uso, las licencias ni la legalidad.** Solo mide si una petición de lectura, sin credenciales, obtiene respuesta. Que responda no significa que se pueda usar así, a ese volumen ni para ese fin: eso lo lee una persona (skill `evaluar-viabilidad`, sección 2). El veredicto lo da esa skill, no este borrador.', '');
  l.push('## Tabla para `DECISION-VIABILIDAD.md`', '');
  l.push('| Dependencia | Tipo | Importancia | Evidencia de acceso | Fecha | Estado |', '|---|---|---|---|---|---|');
  deps.forEach((d, i) => {
    const o = observaciones[i];
    const ev = o.error ? `sondeo fallido: ${o.error}` : `${o.metodo} ${o.url} → ${o.estado} en ${o.ms} ms; ${o.tipoContenido ?? 'sin tipo de contenido'}${o.forma ? `; ${o.forma}` : ''}`;
    const estado = !o.error && !o.fallos.length && o.estado < 400 ? 'sondeo correcto; faltan términos de uso, credencial y legalidad' : 'sin verificar';
    l.push(`| ${celda(d.nombre)} | ${celda(d.tipo ?? '')} | ${celda(d.importancia ?? '')} | ${celda(ev)} | ${fecha} | ${estado} |`);
  });
  l.push('', '## Detalle por dependencia', '');
  deps.forEach((d, i) => {
    const o = observaciones[i];
    l.push(`### ${d.nombre}`, '');
    l.push(`- Dirección sondeada: \`${o.url}\` (${o.metodo})${o.consultaOmitida ? '; la consulta de la URL se omite en este informe' : ''}`);
    if (o.error) l.push(`- Resultado: **${o.error}** (${o.ms} ms)`);
    else {
      l.push(`- Estado HTTP: **${o.estado}** · latencia: ${o.ms} ms · tipo de contenido: ${o.tipoContenido ?? 'ninguno'}`);
      if (o.forma) l.push(`- Forma de la respuesta: ${o.forma}`);
      l.push(`- Autenticación: ${o.autenticacion ?? 'no se pidió en esta petición'}`);
      l.push(`- Región: ${o.region}`);
    }
    for (const w of o.advertencias) l.push(`- Aviso: ${w}`);
    for (const f of o.fallos ?? []) l.push(`- **No coincide con lo esperado:** ${f}`);
    if (d.nota) l.push(`- Nota del proyecto: ${d.nota}`);
    l.push('');
  });
  l.push('## Lo que este borrador no cubre', '');
  l.push('- Términos de uso leídos, cuotas, redistribución y automatización permitidas.', '- Convenios o contratos, y la credencial obtenida (solo se anota que existe, nunca su valor).', '- Legalidad y tratamiento de datos personales.', '- Que el servicio responda desde la región de producción y a la frecuencia real de uso.', '- Nivel de detalle suficiente para el negocio (un dato agregado no sustituye uno por cliente).', '');
  return l.join('\n');
}

function argumento(args, nombre) {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
}

const leerJson = (ruta, que) => { try { return JSON.parse(readFileSync(ruta, 'utf8')); } catch (e) { throw new SondeoInvalido(`${que} (${ruta}) no se puede leer como JSON: ${e.code === 'ENOENT' ? 'no existe' : 'JSON inválido'}`); } };

export async function main(args, { stdout = process.stdout, stderr = process.stderr, fetchFn = fetch, cwd = process.cwd(), ahora = () => new Date() } = {}) {
  try {
    if (args.includes('--ficha')) throw new SondeoInvalido('--ficha no existe: la ficha es siempre kit/FICHA-INFRA.json del proyecto (una ficha elegida a mano no autoriza nada)');
    const valores = new Set([argumento(args, '--salida')]);
    const depsRuta = args.find((a) => !a.startsWith('--') && !valores.has(a)) ?? 'ops/dependencias.json';
    const fichaRuta = resolve(cwd, 'kit/FICHA-INFRA.json');
    if (isAbsolute(depsRuta) || /^[a-zA-Z]:/.test(depsRuta) || depsRuta.split(/[\\/]/).includes('..')) throw new SondeoInvalido('el archivo de dependencias debe ser una ruta relativa dentro del proyecto');
    if (!existsSync(fichaRuta)) throw new SondeoInvalido('NO SE EJECUTA: no hay ficha (kit/FICHA-INFRA.json); el sondeo solo corre si la ficha lo permite.');
    const ficha = leerJson(fichaRuta, 'la ficha');
    if (ficha?.ops?.sondeoAcceso?.permitida !== true) throw new SondeoInvalido('NO SE EJECUTA: la ficha no permite el sondeo (ops.sondeoAcceso.permitida debe ser true).');
    const salida = argumento(args, '--salida');
    if (salida !== undefined && (isAbsolute(salida) || /^[a-zA-Z]:/.test(salida) || salida.split(/[\\/]/).includes('..'))) throw new SondeoInvalido('--salida debe ser una ruta relativa dentro del proyecto');
    if (salida !== undefined && existsSync(resolve(cwd, salida))) throw new SondeoInvalido(`${salida} ya existe: no se sobrescribe (bórralo tú o elige otra ruta)`);
    const deps = validarDependencias(leerJson(resolve(cwd, depsRuta), 'el archivo de dependencias'));
    const observaciones = [];
    for (const d of deps) observaciones.push(await sondear(d, { fetchFn }));
    const borrador = redactarBorrador(deps, observaciones, { fecha: ahora().toISOString().slice(0, 10) });
    if (salida !== undefined) { writeFileSync(resolve(cwd, salida), borrador); stdout.write(`Borrador escrito en ${salida}\n`); } else stdout.write(`${borrador}\n`);
    const inesperado = observaciones.filter((o) => o.error || o.fallos.length);
    if (inesperado.length) stderr.write(`Sondeo: ${inesperado.length} dependencia(s) con resultado inesperado: ${inesperado.map((o) => o.nombre).join(', ')}\n`);
    return inesperado.length ? 1 : 0;
  } catch (e) {
    if (!(e instanceof SondeoInvalido)) throw e;
    stderr.write(`${e.message}\n`);
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = await main(process.argv.slice(2));
