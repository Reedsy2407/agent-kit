// Auto-aplicación del kit (ADR 0014): el propio repositorio usa sus hooks y su sello. No hay una segunda copia que mantener a
// mano: `.claude/hooks`, `.claude/agents`, `.claude/skills`, `.claude/kit.json`, `kit/FICHA-INFRA.json` y
// `.claude/settings.local.generado.json` se GENERAN desde `core/` y `infra/ficha-kit.json`, y una prueba falla si se desvían.
// Nunca toca `.claude/settings.local.json` (lo copia el humano: los hooks no dejan que el agente edite sus propias reglas).
// Uso: node install/install.mjs --auto [--dry-run] [--diff] [--forzar]   (solo sobre el propio repositorio del kit)
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarSettings, generarKitConfig, validarFicha } from '../infra/generate-settings.mjs';
import { diffDeArchivos, resumenDeDiff } from './diff.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const FUENTES_AUTO = Object.freeze([
  { origen: 'core/hooks', destino: '.claude/hooks', excluir: ['test'] },
  { origen: 'core/agents', destino: '.claude/agents', excluir: [] },
  { origen: 'core/skills', destino: '.claude/skills', excluir: [] },
]);
export const FICHA_FUENTE = 'infra/ficha-kit.json';
export const SETTINGS_GENERADO = '.claude/settings.local.generado.json';

function listar(dir, excluir = []) {
  const salida = [];
  for (const nombre of readdirSync(dir).sort()) {
    if (excluir.includes(nombre)) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...listar(ruta, excluir).map((r) => `${nombre}/${r}`));
    else salida.push(nombre);
  }
  return salida;
}

/** Lo que `--auto` generaría: [{ destino, contenido }]. Todo sale de core/ y de la ficha del kit. */
export function entradasAuto(raizKit = RAIZ) {
  const entradas = [];
  for (const f of FUENTES_AUTO) {
    const base = join(raizKit, f.origen);
    for (const sub of listar(base, f.excluir)) entradas.push({ destino: `${f.destino}/${sub}`, contenido: readFileSync(join(base, sub)) });
  }
  const ficha = JSON.parse(readFileSync(join(raizKit, FICHA_FUENTE), 'utf8'));
  validarFicha(ficha);
  const json = (x) => Buffer.from(`${JSON.stringify(x, null, 2)}\n`);
  entradas.push({ destino: 'kit/FICHA-INFRA.json', contenido: json(ficha) });
  entradas.push({ destino: '.claude/kit.json', contenido: json(generarKitConfig(ficha)) });
  entradas.push({ destino: SETTINGS_GENERADO, contenido: json(generarSettings(ficha)) });
  return entradas;
}

/** Compara con lo que hay en el destino: crear / igual / sobrescribir, y «sobrante» (un archivo del kit que ya no está en core/). */
export function planAuto({ destino = RAIZ, raizKit = RAIZ } = {}) {
  const raiz = resolve(destino);
  const acciones = entradasAuto(raizKit).map((e) => {
    const ruta = join(raiz, e.destino);
    const anterior = existsSync(ruta) ? readFileSync(ruta) : null;
    return { ...e, ruta, anterior, accion: anterior === null ? 'crear' : anterior.equals(e.contenido) ? 'igual' : 'sobrescribir' };
  });
  const previstos = new Set(acciones.map((a) => a.destino));
  for (const f of FUENTES_AUTO) {
    const dir = join(raiz, f.destino);
    if (!existsSync(dir)) continue;
    for (const sub of listar(dir)) {
      const destinoRel = `${f.destino}/${sub}`;
      if (!previstos.has(destinoRel)) acciones.push({ destino: destinoRel, ruta: join(dir, sub), contenido: null, anterior: readFileSync(join(dir, sub)), accion: 'sobrante' });
    }
  }
  return { raiz, acciones, desviado: acciones.filter((a) => a.accion !== 'igual') };
}

export function describirAuto(plan, { dryRun, diff }) {
  const l = [`${dryRun || diff ? 'AUTO-APLICACIÓN (dry-run: no se escribe nada)' : 'AUTO-APLICACIÓN'} — ${plan.raiz}`];
  const etiqueta = { crear: 'crear', igual: 'igual (sin cambios)', sobrescribir: 'sobrescribir', sobrante: 'SOBRANTE (ya no está en core/)' };
  for (const a of plan.acciones.filter((x) => diff || x.accion !== 'igual')) l.push(`  ${etiqueta[a.accion].padEnd(30)} ${a.destino}`);
  const iguales = plan.acciones.filter((a) => a.accion === 'igual').length;
  l.push(`  ${iguales} archivo(s) ya al día; ${plan.desviado.length} por cambiar.`);
  if (diff) for (const a of plan.desviado.filter((x) => x.contenido)) l.push(`--- ${a.destino}  [${resumenDeDiff(a.anterior, a.contenido)}]`, diffDeArchivos(a.anterior, a.contenido));
  if (plan.desviado.some((a) => a.accion === 'sobrante')) l.push('Los sobrantes no se borran solos: usa --forzar para quitarlos, o bórralos tú.');
  l.push('Paso manual del humano: copiar .claude/settings.local.generado.json sobre .claude/settings.local.json (esta orden nunca lo toca).');
  return l.join('\n');
}

/** Escribe lo que falte o difiera. Los sobrantes solo se borran con `forzar`. */
export function aplicarAuto(plan, { forzar = false } = {}) {
  const escritos = [];
  const borrados = [];
  for (const a of plan.acciones) {
    if (a.accion === 'crear' || a.accion === 'sobrescribir') {
      mkdirSync(dirname(a.ruta), { recursive: true });
      writeFileSync(a.ruta, a.contenido);
      escritos.push(a.destino);
    } else if (a.accion === 'sobrante' && forzar) {
      rmSync(a.ruta, { force: true });
      borrados.push(a.destino);
    }
  }
  return { escritos, borrados };
}
