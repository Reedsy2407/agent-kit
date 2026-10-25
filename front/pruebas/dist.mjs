// Lista permitida de la carpeta de publicación: solo entra lo que la configuración nombra, y nunca lo que no debe
// publicarse (carpetas del kit, de diseño, de pruebas o de herramientas, documentos del agente, manifiestos, capturas).
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export const id = 'dist';
export const nombre = 'carpeta de publicación (lista permitida)';
export const requiereNavegador = false;

export const PROHIBIDOS_BASE = [
  '^(design|kit|tests?|tasks|scripts|\\.claude)(/|$)',
  '(^|/)(\\.git|\\.wrangler|node_modules)(/|$)',
  '(^|/)(CLAUDE|HANDOFF|README)\\.md$',
  '(^|/)package(-lock)?\\.json$',
  '(^|/)wrangler\\.jsonc?$',
  '(^|/)\\.env',
  '(captura|screenshot)',
  '\\.(map|log)$',
];

/** Patrón tipo glob (`*` dentro de un nivel, `**` entre niveles) → expresión. */
export function globARegex(glob) {
  const re = glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*');
  return new RegExp(`^${re}$`);
}

export function listarArchivos(dir, base = dir, salida = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) listarArchivos(p, base, salida);
    else salida.push(relative(base, p).replaceAll('\\', '/'));
  }
  return salida;
}

/** { fuera: no permitidos, prohibidos: los que además nunca deben publicarse, faltan: patrones sin ningún archivo }. */
export function evaluarDist(archivos, { permitidos, prohibidos = [] }) {
  const ok = permitidos.map(globARegex);
  const mal = [...PROHIBIDOS_BASE, ...prohibidos].map((r) => new RegExp(r, 'i'));
  return {
    fuera: archivos.filter((f) => !ok.some((re) => re.test(f))),
    prohibidos: archivos.filter((f) => mal.some((re) => re.test(f))),
    faltan: permitidos.filter((g) => !g.includes('*') && !archivos.includes(g)),
  };
}

export async function run({ report, config, proyecto = process.cwd() }) {
  const dir = resolve(proyecto, config.dist.carpeta);
  if (!existsSync(dir)) { report.info(`carpeta de publicación (${config.dist.carpeta})`, 'no existe: se omite (genérala y repite)'); return; }
  const r = evaluarDist(listarArchivos(dir), config.dist);
  report.check(`${config.dist.carpeta}/: solo archivos de la lista permitida`, r.fuera.length === 0, r.fuera.slice(0, 5).join(', '));
  report.check(`${config.dist.carpeta}/: nada que no deba publicarse`, r.prohibidos.length === 0, r.prohibidos.slice(0, 5).join(', '));
  report.check(`${config.dist.carpeta}/: están los archivos obligatorios`, r.faltan.length === 0, r.faltan.join(', '));
}
