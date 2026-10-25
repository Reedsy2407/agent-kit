// Genera `.claude/settings.local.json` (permisos y registro de hooks) y `.claude/kit.json` a partir de la ficha
// «Infra del proyecto». Falla si una autorización queda tapada por una denegación (una denegación gana a una
// autorización) o si la ficha contiene algo con forma de secreto (ADR 0005).
// Uso: node infra/generate-settings.mjs --ficha <archivo> --destino <carpeta>
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SECRETOS } from '../core/hooks/guard-write.mjs';
import { IDS_PRESETS, checksDePreset, permisosDePreset, avisoDePreset } from './presets.mjs';

export class FichaInvalida extends Error {
  constructor(errores) {
    super(`Ficha inválida:\n- ${errores.join('\n- ')}`);
    this.errores = errores;
  }
}

/** Permisos mínimos comunes a cualquier proyecto. */
export const ALLOW_BASE = [
  'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git show:*)', 'Bash(git branch:*)',
  'Bash(git rev-list:*)', 'Bash(git rev-parse:*)', 'Bash(git add:*)', 'Bash(git commit:*)', 'Bash(git switch:*)',
  'Bash(git merge --squash:*)', 'Bash(git pull --ff-only:*)', 'Bash(git push:*)',
  'Bash(node --test:*)', 'Bash(node .claude/hooks/premerge-check.mjs:*)', 'Bash(node .claude/hooks/escaneo-secretos.mjs:*)',
];

export const DENY_BASE = [
  'Bash(git rebase:*)', 'Bash(git push --force:*)', 'Bash(git push -f:*)', 'Bash(git push * --force*)', 'Bash(git push * -f)',
  'Bash(git push --force-with-lease:*)', 'Bash(git push * --force-with-lease*)',
  'Bash(curl * -X *)', 'Bash(curl * --request*)', 'Bash(curl * -d *)', 'Bash(curl * --data*)', 'Bash(curl * -F *)',
  'Bash(curl * --form*)', 'Bash(curl * -T *)', 'Bash(curl * --upload-file*)',
  'Bash(docker system prune:*)', 'Bash(docker volume rm:*)', 'Bash(docker volume prune:*)',
  'Bash(rm * ..*)',
  'Bash(gh auth token:*)', 'Bash(gh secret:*)', 'Bash(gh repo delete:*)',
  'Read(./.env)', 'Read(./.env.*)',
];

const HOOKS_BASH = ['guard-shell', 'guard-commit', 'guard-merge'];
const HOOKS_ESCRITURA = ['guard-write'];

const entradaHook = (nombre) => ({
  type: 'command',
  command: 'node',
  args: [`\${CLAUDE_PROJECT_DIR}/.claude/hooks/${nombre}.mjs`],
  timeout: 30,
});

export function bloqueHooks() {
  return {
    PreToolUse: [
      { matcher: 'Bash', hooks: HOOKS_BASH.map(entradaHook) },
      { matcher: 'Write|Edit|MultiEdit|NotebookEdit', hooks: HOOKS_ESCRITURA.map(entradaHook) },
    ],
  };
}

// --- Reglas -----------------------------------------------------------------------------------------------

export function analizarRegla(regla) {
  const m = /^([A-Za-z_][\w]*)(?:\((.*)\))?$/s.exec(regla);
  return m ? { herramienta: m[1], contenido: m[2] ?? null } : null;
}

/** `x:*` y `x *` significan lo mismo: «x» o «x» seguido de espacio y cualquier cosa. */
function normalizar(contenido) {
  return contenido.replace(/:\*$/, ' *');
}

function aRegex(contenido) {
  const n = normalizar(contenido);
  const escapado = n.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const conFinal = escapado.endsWith(' *') ? `${escapado.slice(0, -2)}( .*)?` : escapado;
  return new RegExp(`^${conFinal.replace(/\*/g, '.*')}$`);
}

/** ¿Deja pasar el conjunto de permisos este comando de Bash? Una denegación gana; sin autorización que case, pide permiso (false). */
export function permiteComando(allow, deny, comando) {
  const casa = (regla) => { const r = analizarRegla(regla); return r?.herramienta === 'Bash' && r.contenido !== null && aRegex(r.contenido).test(comando); };
  if (deny.some(casa)) return false;
  return allow.some(casa);
}

/** Lo más corto que una autorización deja pasar: sin comodines. */
function literalDe(contenido) {
  return normalizar(contenido).replace(/ \*$/, '').replace(/\*/g, '');
}

/** Devuelve las autorizaciones que alguna denegación tapa (una denegación gana a una autorización). */
export function detectarTapadas(allow, deny) {
  const tapadas = [];
  for (const a of allow) {
    const ra = analizarRegla(a);
    if (!ra) continue;
    for (const d of deny) {
      const rd = analizarRegla(d);
      if (!rd || rd.herramienta !== ra.herramienta) continue;
      if (rd.contenido === null) { tapadas.push({ allow: a, deny: d }); break; }
      if (ra.contenido === null) continue;
      if (aRegex(rd.contenido).test(literalDe(ra.contenido))) { tapadas.push({ allow: a, deny: d }); break; }
    }
  }
  return tapadas;
}

// --- Ficha ------------------------------------------------------------------------------------------------

function cadenas(obj, ruta = '', salida = []) {
  if (typeof obj === 'string') salida.push([ruta, obj]);
  else if (Array.isArray(obj)) obj.forEach((v, i) => cadenas(v, `${ruta}[${i}]`, salida));
  else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) cadenas(v, ruta ? `${ruta}.${k}` : k, salida);
  return salida;
}

function listaReglas(ficha, errores) {
  const trozos = [
    ['despliegue.permitidos', ficha.despliegue?.permitidos, 'allow'], ['despliegue.denegados', ficha.despliegue?.denegados, 'deny'],
    ['despliegue.permitidosTrasPrimerDespliegue', ficha.despliegue?.permitidosTrasPrimerDespliegue, 'condicional'],
    ['baseDeDatos.puntoDeRestauracion.permitidos', ficha.baseDeDatos?.puntoDeRestauracion?.permitidos, 'allow'],
    ['baseDeDatos.puntoDeRestauracion.denegados', ficha.baseDeDatos?.puntoDeRestauracion?.denegados, 'deny'],
    ['logs.permitidos', ficha.logs?.permitidos, 'allow'],
    ['permisos.permitidos', ficha.permisos?.permitidos, 'allow'], ['permisos.denegados', ficha.permisos?.denegados, 'deny'],
  ];
  const allow = [];
  const deny = [];
  const condicional = [];
  for (const [donde, lista, tipo] of trozos) {
    if (lista === undefined) continue;
    if (!Array.isArray(lista)) { errores.push(`${donde} debe ser una lista`); continue; }
    for (const regla of lista) {
      if (typeof regla !== 'string' || !analizarRegla(regla)) { errores.push(`${donde}: «${regla}» no es una regla de permisos (Herramienta o Herramienta(patrón))`); continue; }
      (tipo === 'allow' ? allow : tipo === 'deny' ? deny : condicional).push(regla);
    }
  }
  return { allow, deny, condicional };
}

/** Acciones de operación (ADR 0015). Las reversibles se autorizan; las que pueden perder datos o secretos preguntan siempre. */
export const ACCIONES_OPS = Object.freeze({ estado: 'allow', arranque: 'allow', parada: 'allow', reversa: 'ask', rotacion: 'ask' });
export const OPS_SCRIPTS = Object.freeze({ salud: 'scripts/salud.mjs', sondeoAcceso: 'scripts/sondeo-acceso.mjs' });

const rutaRelativaSegura = (r) => typeof r === 'string' && r !== '' && !/^([a-zA-Z]:|[\\/])/.test(r) && !r.split(/[\\/]/).includes('..');

/**
 * Reglas que aporta el bloque `ops` de la ficha. Una acción de operación solo existe si la ficha la declara con
 * `permitida: true`; los scripts de salud y de sondeo, igual. Nada de esto se autoriza por defecto.
 */
export function reglasDeOps(ficha, errores = []) {
  const allow = [];
  const ask = [];
  const ops = ficha.ops;
  if (ops === undefined || ops === null) return { allow, ask };
  if (typeof ops !== 'object' || Array.isArray(ops)) { errores.push('ops debe ser un objeto'); return { allow, ask }; }
  for (const [clave, script] of Object.entries(OPS_SCRIPTS)) {
    const b = ops[clave];
    if (b === undefined) continue;
    if (!b || typeof b !== 'object') { errores.push(`ops.${clave} debe ser un objeto { permitida, config }`); continue; }
    if (typeof b.permitida !== 'boolean') errores.push(`ops.${clave}.permitida debe ser true o false`);
    if (b.config !== undefined && !rutaRelativaSegura(b.config)) errores.push(`ops.${clave}.config debe ser una ruta relativa dentro del proyecto`);
    if (b.permitida === true) allow.push(`Bash(node ${script}:*)`, `Bash(timeout * node ${script}:*)`);
  }
  for (const [nombre, a] of Object.entries(ops.acciones ?? {})) {
    if (!(nombre in ACCIONES_OPS)) { errores.push(`ops.acciones.${nombre} no existe (usa ${Object.keys(ACCIONES_OPS).join(', ')})`); continue; }
    if (!a || typeof a !== 'object' || typeof a.permitida !== 'boolean') { errores.push(`ops.acciones.${nombre} debe ser { permitida: true|false, comandos: [...] }`); continue; }
    const comandos = a.comandos ?? [];
    if (!Array.isArray(comandos) || comandos.some((c) => typeof c !== 'string' || !analizarRegla(c))) { errores.push(`ops.acciones.${nombre}.comandos debe ser una lista de reglas de permisos`); continue; }
    if (a.permitida === true) (ACCIONES_OPS[nombre] === 'ask' ? ask : allow).push(...comandos);
  }
  return { allow, ask };
}

export function validarFicha(ficha) {
  const errores = [];
  if (!ficha || typeof ficha !== 'object') throw new FichaInvalida(['la ficha debe ser un objeto JSON']);
  if (ficha.version !== 1) errores.push('version debe ser 1');
  if (!ficha.proyecto || typeof ficha.proyecto !== 'string') errores.push('proyecto es obligatorio');
  if (!['A', 'B', 'kit'].includes(ficha.tipo)) errores.push('tipo debe ser "A", "B" o "kit" (el propio kit, ADR 0014)');
  for (const [ruta, valor] of cadenas(ficha)) {
    if (ruta === '_ayuda') continue;
    for (const [re, que] of SECRETOS) if (re.test(valor)) errores.push(`${ruta} parece contener ${que}: la ficha no lleva secretos`);
  }
  for (const url of ficha.urlsPublicas ?? []) if (!/^https:\/\/[^\s*]+$/.test(url)) errores.push(`urlsPublicas: «${url}» debe ser una URL https sin comodines`);
  const kit = ficha.kit ?? {};
  if (kit.maxBranchCommits !== undefined && !(Number.isInteger(kit.maxBranchCommits) && kit.maxBranchCommits > 0)) errores.push('kit.maxBranchCommits debe ser un entero positivo');
  for (const m of kit.modules ?? []) if (!m.path || !(Number.isInteger(m.max) && m.max > 0)) errores.push('kit.modules: cada módulo necesita path y max entero positivo');
  if (kit.autoria?.correosPermitidos !== undefined && !(Array.isArray(kit.autoria.correosPermitidos) && kit.autoria.correosPermitidos.every((c) => typeof c === 'string'))) errores.push('kit.autoria.correosPermitidos debe ser una lista de correos o de dominios (@ejemplo.org)');
  if (kit.front !== undefined && kit.front !== null) {
    const { config, comando } = kit.front;
    if (typeof config !== 'string' || !config || /^([a-zA-Z]:|[\\/])/.test(config) || config.split(/[\\/]/).includes('..')) errores.push('kit.front.config debe ser una ruta relativa dentro del proyecto (p. ej. tests/front/front.config.json)');
    if (typeof comando !== 'string' || !comando.trim()) errores.push('kit.front.comando debe ser el comando que corre las pruebas de front');
  }
  if (kit.preset !== undefined && kit.preset !== '' && kit.preset !== null && !IDS_PRESETS.includes(kit.preset)) errores.push(`kit.preset «${kit.preset}» no existe (usa ${IDS_PRESETS.join(', ')} o déjalo vacío)`);
  for (const c of kit.checks ?? []) if (!Array.isArray(c.commands) || !c.commands.length) errores.push('kit.checks: cada comprobación necesita una lista de commands');
  for (const c of kit.checks ?? []) if (c.timeoutSeconds !== undefined && !(Number.isInteger(c.timeoutSeconds) && c.timeoutSeconds > 0 && c.timeoutSeconds <= 7200)) errores.push('kit.checks: timeoutSeconds debe ser un entero de 1 a 7200');
  const { allow, deny, condicional } = listaReglas(ficha, errores);
  const ops = reglasDeOps(ficha, errores);
  const hecho = ficha.despliegue?.primerDespliegueHecho;
  if (hecho !== undefined && typeof hecho !== 'boolean') errores.push('despliegue.primerDespliegueHecho debe ser true o false');
  /* Las autorizaciones de después del primer despliegue humano solo cuentan si ya se hizo; se validan siempre contra las denegaciones. */
  const activas = hecho === true ? condicional : [];
  const urlAllow = (ficha.urlsPublicas ?? []).map((u) => `Bash(curl * ${u.replace(/\/$/, '')}/*)`);
  const todasAllow = [...ALLOW_BASE, ...permisosDePreset(kit.preset), ...urlAllow, ...allow, ...activas, ...ops.allow];
  const todasDeny = [...DENY_BASE, ...deny];
  for (const t of detectarTapadas([...todasAllow, ...condicional, ...ops.ask], todasDeny))
    errores.push(`la autorización ${t.allow} queda tapada por la denegación ${t.deny} (una denegación gana a una autorización): haz la denegación más específica`);
  if (errores.length) throw new FichaInvalida(errores);
  return { allow: todasAllow, deny: todasDeny, ask: ops.ask };
}

const sinDuplicados = (lista) => [...new Set(lista)];

/* Listas que son del proyecto: si ya tiene alguna, gana la suya entera (añadirle las del kit sería meterle comprobaciones o ámbitos que no pidió). */
const LISTAS_DEL_PROYECTO = new Set(['kit.checks', 'kit.modules', 'kit.commitScopes']);
/* Valores que describen la plantilla y no al proyecto: se renuevan con el kit. */
const DEL_KIT = new Set(['_ayuda', 'version']);
const esObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

/**
 * Fusiona la ficha que ya tiene un proyecto con la plantilla del kit sin perder nada del proyecto (ADR 0005):
 * los valores del proyecto mandan; las entradas nuevas de la plantilla se añaden; las listas de permisos, denegaciones, pasos
 * manuales, etc. se unen (primero lo del proyecto); `kit.checks`, `kit.modules` y `kit.commitScopes` son del proyecto si ya
 * tiene alguno. No se quita nada que el proyecto tenga.
 */
export function fusionarFicha(plantilla, existente, ruta = '') {
  const salida = {};
  for (const k of new Set([...Object.keys(plantilla), ...Object.keys(existente)])) {
    const aqui = ruta ? `${ruta}.${k}` : k;
    const p = plantilla[k];
    const e = existente[k];
    if (!(k in existente) || DEL_KIT.has(k)) salida[k] = k in plantilla ? p : e;
    else if (!(k in plantilla)) salida[k] = e;
    else if (esObj(p) && esObj(e)) salida[k] = fusionarFicha(p, e, aqui);
    else if (Array.isArray(p) && Array.isArray(e)) {
      if (LISTAS_DEL_PROYECTO.has(aqui)) salida[k] = e.length ? e : p;
      else {
        const vistos = new Set(e.map((x) => JSON.stringify(x)));
        salida[k] = [...e, ...p.filter((x) => !vistos.has(JSON.stringify(x)))];
      }
    } else salida[k] = e;
  }
  return salida;
}

export function generarSettings(ficha) {
  const { allow, deny, ask } = validarFicha(ficha);
  return {
    permissions: { allow: sinDuplicados(allow), ...(ask.length ? { ask: sinDuplicados(ask) } : {}), deny: sinDuplicados(deny) },
    hooks: bloqueHooks(),
  };
}

export function generarKitConfig(ficha) {
  validarFicha(ficha);
  const kit = ficha.kit ?? {};
  return {
    baseBranch: kit.baseBranch ?? 'main',
    maxBranchCommits: kit.maxBranchCommits ?? 10,
    modules: kit.modules ?? [],
    commitScopes: kit.commitScopes ?? [],
    checks: kit.checks?.length ? kit.checks : checksDePreset(kit.preset),
    preset: kit.preset ? { id: kit.preset, aviso: avisoDePreset(kit.preset) } : null,
    gitleaks: kit.gitleaks ?? true,
    autoria: { correosPermitidos: kit.autoria?.correosPermitidos ?? [] },
    front: kit.front ?? null,
    ops: { salud: ficha.ops?.salud?.permitida === true, sondeoAcceso: ficha.ops?.sondeoAcceso?.permitida === true },
  };
}

/** Escribe .claude/kit.json y .claude/settings.local.json (o .generado.json si ya existe uno). Devuelve lo escrito. */
export function escribirGenerados(ficha, destino) {
  const dir = join(destino, '.claude');
  mkdirSync(dir, { recursive: true });
  const kit = join(dir, 'kit.json');
  writeFileSync(kit, `${JSON.stringify(generarKitConfig(ficha), null, 2)}\n`);
  const existente = existsSync(join(dir, 'settings.local.json'));
  const settings = join(dir, existente ? 'settings.local.generado.json' : 'settings.local.json');
  writeFileSync(settings, `${JSON.stringify(generarSettings(ficha), null, 2)}\n`);
  return { kit, settings, existente };
}

function argumento(args, nombre) {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const fichaRuta = argumento(args, '--ficha');
  const destino = argumento(args, '--destino');
  if (!fichaRuta || !destino) {
    process.stderr.write('Uso: node infra/generate-settings.mjs --ficha <archivo> --destino <carpeta>\n');
    process.exit(2);
  }
  try {
    const r = escribirGenerados(JSON.parse(readFileSync(resolve(fichaRuta), 'utf8')), resolve(destino));
    process.stdout.write(`Escrito ${r.kit}\nEscrito ${r.settings}${r.existente ? ' (ya había un settings.local.json: revísalo y cópialo a mano)' : ''}\n`);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}
