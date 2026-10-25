// Comprobación de salud posdespliegue, reutilizable (tipos A y B). Solo lecturas (GET) con fetch, un bucle acotado y sin
// escribir nada. Comprueba por ruta: estado HTTP, texto que debe o no debe aparecer, cabeceras de seguridad esperadas y tiempo de
// respuesta (mediana de varias muestras); y, aparte, que los enlaces críticos respondan. Se configura por proyecto en
// ops/salud.config.json (ver ops/salud.config.ejemplo.json). Sin red de terceros: solo el origen indicado.
// Se ejecuta solo si la ficha lo permite (ops.salud.permitida) y el origen es una de sus urlsPublicas o la propia máquina.
// Uso: node scripts/salud.mjs <https://direccion-publica> [--config ops/salud.config.json] [--json]
// Salida: 0 todo bien, 1 algún fallo de salud, 2 uso o permiso (la ficha no lo permite, config inválida, dirección no válida).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

export class SaludInvalida extends Error {}

export const CABECERAS_POR_DEFECTO = Object.freeze(['x-content-type-options', 'referrer-policy', 'x-frame-options', 'permissions-policy', 'content-security-policy']);
const LIMITES = { muestras: [1, 15], timeoutMs: [200, 60000], enlacesMax: [0, 50] };
const MAX_TEXTO = 1024 * 1024;
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

export const mediana = (xs) => {
  if (!xs.length) return NaN;
  const o = [...xs].sort((a, b) => a - b);
  const m = o.length >> 1;
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

const entre = (n, [min, max]) => Number.isInteger(n) && n >= min && n <= max;

/** Valida y completa la configuración. Lanza SaludInvalida con todos los problemas juntos. */
export function normalizarConfig(c = {}) {
  const errores = [];
  const cfg = {
    muestras: c.muestras ?? 5, timeoutMs: c.timeoutMs ?? 10000, medianaMaxMs: c.medianaMaxMs ?? 1500,
    rutas: c.rutas ?? [{ ruta: '/', estado: 200 }], cabeceras: c.cabeceras ?? [...CABECERAS_POR_DEFECTO], cabecerasValores: c.cabecerasValores ?? {},
    cspSinUnsafeInline: c.cspSinUnsafeInline ?? true, enlaces: c.enlaces ?? [], descubrirEnlaces: c.descubrirEnlaces ?? null,
  };
  if (!entre(cfg.muestras, LIMITES.muestras)) errores.push(`muestras debe ser un entero de ${LIMITES.muestras.join(' a ')}`);
  if (!entre(cfg.timeoutMs, LIMITES.timeoutMs)) errores.push(`timeoutMs debe ser un entero de ${LIMITES.timeoutMs.join(' a ')}`);
  if (!(Number.isFinite(cfg.medianaMaxMs) && cfg.medianaMaxMs > 0)) errores.push('medianaMaxMs debe ser un número positivo');
  if (!Array.isArray(cfg.rutas) || !cfg.rutas.length) errores.push('rutas debe ser una lista con al menos una ruta');
  else cfg.rutas.forEach((r, i) => {
    if (typeof r?.ruta !== 'string' || !r.ruta.startsWith('/')) errores.push(`rutas[${i}].ruta debe empezar por «/»`);
    if (r.estado !== undefined && !(Number.isInteger(r.estado) && r.estado >= 100 && r.estado <= 599)) errores.push(`rutas[${i}].estado debe ser un código HTTP`);
    for (const k of ['contiene', 'noContiene']) if (r[k] !== undefined && !(Array.isArray(r[k]) && r[k].every((x) => typeof x === 'string' && x))) errores.push(`rutas[${i}].${k} debe ser una lista de textos`);
  });
  if (!Array.isArray(cfg.cabeceras) || cfg.cabeceras.some((h) => typeof h !== 'string' || !/^[a-z0-9-]+$/i.test(h))) errores.push('cabeceras debe ser una lista de nombres de cabecera');
  if (!cfg.enlaces || !Array.isArray(cfg.enlaces)) errores.push('enlaces debe ser una lista');
  else cfg.enlaces.forEach((e, i) => { if (typeof (e?.ruta ?? e) !== 'string' || !(e?.ruta ?? e).startsWith('/')) errores.push(`enlaces[${i}] debe ser una ruta que empiece por «/» o { ruta, estado }`); });
  if (cfg.descubrirEnlaces !== null && !(typeof cfg.descubrirEnlaces?.desde === 'string' && entre(cfg.descubrirEnlaces.max ?? 20, LIMITES.enlacesMax))) errores.push('descubrirEnlaces debe ser { desde: "/ruta", max: 0 a 50 }');
  if (errores.length) throw new SaludInvalida(`salud.config inválida:\n- ${errores.join('\n- ')}`);
  return cfg;
}

/** El origen (https, o http solo en la propia máquina) sin ruta ni credenciales. */
export function origenSeguro(texto) {
  let u;
  try { u = new URL(texto); } catch { throw new SaludInvalida(`dirección no válida: «${texto}»`); }
  const local = LOOPBACK.has(u.hostname);
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) throw new SaludInvalida('la dirección debe ser https (http solo para localhost, 127.0.0.1 o [::1])');
  if (u.username || u.password) throw new SaludInvalida('la dirección no puede llevar usuario ni contraseña');
  return u.origin;
}

/** ¿Permite la ficha esta operación sobre este origen? Devuelve null si sí, o el motivo. */
export function permisoDeFicha(ficha, clave, origen) {
  if (!ficha || typeof ficha !== 'object') return 'no hay ficha: la operación solo corre si kit/FICHA-INFRA.json la permite';
  if (ficha.ops?.[clave]?.permitida !== true) return `la ficha no permite esta operación (ops.${clave}.permitida debe ser true)`;
  if (LOOPBACK.has(new URL(origen).hostname)) return null;
  const permitidos = (ficha.urlsPublicas ?? []).map((u) => { try { return new URL(u).origin; } catch { return null; } });
  return permitidos.includes(origen) ? null : 'el origen no está en urlsPublicas de la ficha';
}

async function pedir(fetchFn, url, timeoutMs, metodo = 'GET') {
  const t0 = performance.now();
  const r = await fetchFn(url, { method: metodo, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'agent-kit-salud/1' } });
  const texto = metodo === 'GET' ? (await r.text()).slice(0, MAX_TEXTO) : '';
  return { estado: r.status, ms: performance.now() - t0, cabeceras: r.headers, texto };
}

const quitarHash = (u) => u.split('#')[0];

/** Enlaces internos (mismo origen) de un HTML, únicos y acotados. */
export function enlacesInternos(html, origen, desde, max) {
  const salida = [];
  for (const m of html.matchAll(/<a\s[^>]*href\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    const href = (m[2] ?? m[3] ?? '').trim();
    if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    let u;
    try { u = new URL(href, origen + desde); } catch { continue; }
    if (u.origin !== origen) continue;
    const r = quitarHash(u.pathname + u.search);
    if (!salida.includes(r)) salida.push(r);
    if (salida.length >= max) break;
  }
  return salida;
}

/**
 * Corre la comprobación contra `origen`. Devuelve { ok, fallos[], lineas[] } y no lanza por un fallo de salud (sí por uso inválido).
 * `fetchFn` se inyecta para las pruebas.
 */
export async function comprobarSalud({ origen, config, fetchFn = fetch }) {
  const cfg = normalizarConfig(config);
  const fallos = [];
  const lineas = [];
  const guarda = (ruta, que) => fallos.push(`${ruta}: ${que}`);
  const intenta = async (ruta, f) => { try { return await f(); } catch (e) { guarda(ruta, `no respondió (${e.name === 'TimeoutError' ? `más de ${cfg.timeoutMs} ms` : e.message})`); return null; } };

  for (const r of cfg.rutas) {
    const esperado = r.estado ?? 200;
    const muestras = [];
    let primera = null;
    for (let i = 0; i < (r.muestras ?? cfg.muestras); i++) {
      const x = await intenta(r.ruta, () => pedir(fetchFn, origen + r.ruta, cfg.timeoutMs));
      if (!x) break;
      muestras.push(x.ms);
      primera ??= x;
    }
    if (!primera) continue;
    if (primera.estado !== esperado) { guarda(r.ruta, `respondió ${primera.estado}, se esperaba ${esperado}`); continue; }
    const med = mediana(muestras);
    const tope = r.medianaMaxMs ?? cfg.medianaMaxMs;
    lineas.push(`${r.ruta}  ${primera.estado}  mediana ${Math.round(med)} ms (${muestras.length} muestra(s), tope ${tope} ms)`);
    if (med > tope) guarda(r.ruta, `mediana de ${Math.round(med)} ms por encima del tope de ${tope} ms`);
    const texto = primera.texto.toLowerCase();
    for (const t of r.contiene ?? []) if (!texto.includes(t.toLowerCase())) guarda(r.ruta, `no contiene el texto esperado «${t}»`);
    for (const t of r.noContiene ?? []) if (texto.includes(t.toLowerCase())) guarda(r.ruta, `contiene texto que no debe aparecer («${t}»)`);
    if (r.cabeceras !== false) {
      for (const h of cfg.cabeceras) if (!primera.cabeceras.get(h)) guarda(r.ruta, `falta la cabecera ${h}`);
      for (const [h, v] of Object.entries(cfg.cabecerasValores)) { const real = primera.cabeceras.get(h); if (real && !real.toLowerCase().includes(String(v).toLowerCase())) guarda(r.ruta, `la cabecera ${h} no contiene «${v}»`); }
      const csp = primera.cabeceras.get('content-security-policy') ?? '';
      const scripts = csp.split(';').map((s) => s.trim()).find((s) => s.startsWith('script-src')) ?? '';
      if (cfg.cspSinUnsafeInline && /'unsafe-inline'/.test(scripts)) guarda(r.ruta, "la CSP permite 'unsafe-inline' en scripts");
    }
  }

  let enlaces = cfg.enlaces.map((e) => (typeof e === 'string' ? { ruta: e, estado: 200 } : { ruta: e.ruta, estado: e.estado ?? 200 }));
  if (cfg.descubrirEnlaces) {
    const d = cfg.descubrirEnlaces;
    const pagina = await intenta(d.desde, () => pedir(fetchFn, origen + d.desde, cfg.timeoutMs));
    if (pagina) for (const ruta of enlacesInternos(pagina.texto, origen, d.desde, d.max ?? 20)) if (!enlaces.some((e) => e.ruta === ruta)) enlaces.push({ ruta, estado: 200 });
  }
  for (const e of enlaces) {
    const x = await intenta(e.ruta, () => pedir(fetchFn, origen + e.ruta, cfg.timeoutMs, 'HEAD').then((h) => (h.estado === 405 || h.estado === 501 ? pedir(fetchFn, origen + e.ruta, cfg.timeoutMs) : h)));
    if (!x) continue;
    if (x.estado !== e.estado) guarda(`enlace ${e.ruta}`, `respondió ${x.estado}, se esperaba ${e.estado}`);
  }
  if (enlaces.length) lineas.push(`${enlaces.length} enlace(s) crítico(s) comprobados`);
  return { ok: fallos.length === 0, fallos, lineas };
}

function argumento(args, nombre) {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
}

export async function main(args, { stdout = process.stdout, stderr = process.stderr, fetchFn = fetch, cwd = process.cwd() } = {}) {
  try {
    if (args.includes('--ficha')) throw new SaludInvalida('--ficha no existe: la ficha es siempre kit/FICHA-INFRA.json del proyecto (una ficha elegida a mano no autoriza nada)');
    const base = args.find((a) => !a.startsWith('--') && a !== argumento(args, '--config'));
    if (!base) throw new SaludInvalida('Uso: node scripts/salud.mjs <https://direccion-publica> [--config ops/salud.config.json] [--json]');
    const origen = origenSeguro(base);
    const fichaRuta = resolve(cwd, 'kit/FICHA-INFRA.json');
    let ficha = null;
    if (existsSync(fichaRuta)) { try { ficha = JSON.parse(readFileSync(fichaRuta, 'utf8')); } catch { throw new SaludInvalida(`${fichaRuta} no es JSON válido`); } }
    const motivo = permisoDeFicha(ficha, 'salud', origen);
    if (motivo) throw new SaludInvalida(`NO SE EJECUTA: ${motivo}.`);
    const configRel = argumento(args, '--config') ?? ficha.ops.salud.config ?? 'ops/salud.config.json';
    if (typeof configRel !== 'string' || isAbsolute(configRel) || /^[a-zA-Z]:/.test(configRel) || configRel.split(/[\\/]/).includes('..')) throw new SaludInvalida('la configuración debe ser una ruta relativa dentro del proyecto');
    const configRuta = resolve(cwd, configRel);
    let config = {};
    if (existsSync(configRuta)) { try { config = JSON.parse(readFileSync(configRuta, 'utf8')); } catch { throw new SaludInvalida(`${configRuta} no es JSON válido`); } }
    const r = await comprobarSalud({ origen, config, fetchFn });
    if (args.includes('--json')) stdout.write(`${JSON.stringify({ origen, ok: r.ok, fallos: r.fallos, lineas: r.lineas })}\n`);
    else {
      for (const l of r.lineas) stdout.write(`${l}\n`);
      if (r.ok) stdout.write(`Salud correcta en ${origen}\n`);
      else stderr.write(`Salud: ${r.fallos.length} fallo(s) en ${origen}\n- ${r.fallos.join('\n- ')}\n`);
    }
    return r.ok ? 0 : 1;
  } catch (e) {
    if (!(e instanceof SaludInvalida)) throw e;
    stderr.write(`${e.message}\n`);
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = await main(process.argv.slice(2));
