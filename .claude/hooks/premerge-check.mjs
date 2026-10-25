// Comprobación previa al merge (no es un hook: la lanza el constructor). Corre las comprobaciones que la ficha
// asigna a las rutas tocadas, más gitleaks si hay binario, y deja un sello con el hash del árbol de HEAD en
// `<.git>/kit-premerge.json`. El hook guard-merge exige ese sello para integrar o empujar la rama base (ADR 0007).
// Si la ficha configura pruebas de front (kit.front) y existe su configuración, también las corre.
// Sin gitleaks corre escaneo-secretos.mjs; si tampoco puede, el sello lo dice («SIN ESCANEO DE SECRETOS»). Avisa de correos personales en el historial.
// Uso: node .claude/hooks/premerge-check.mjs
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cargarConfig, git as gitReal } from './lib/common.mjs';
import { ARCHIVO_SELLO } from './guard-merge.mjs';
import { escanear } from './escaneo-secretos.mjs';
import { revisarAutoria } from './lib/autoria.mjs';

const real = {
  spawn: (cmd, opts) => spawnSync(cmd, { shell: true, stdio: ['ignore', 'inherit', 'inherit'], ...opts }),
  escribir: (ruta, texto) => writeFileSync(ruta, texto),
  borrar: (ruta) => rmSync(ruta, { force: true }),
  log: (t) => process.stdout.write(`${t}\n`),
  ahora: () => new Date().toISOString(),
  escanear: (dir) => escanear(dir),
};

/** Archivos que cambia la rama respecto de la base (o el último commit, si ya se está en la base). */
export function archivosCambiados(git, base) {
  const rama = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const hayBase = git(['rev-parse', '--verify', '--quiet', base]) !== null;
  const rango = rama !== base && hayBase ? [`${base}...HEAD`] : ['HEAD~1', 'HEAD'];
  const salida = git(['diff', '--name-only', ...rango]);
  return salida === null ? null : salida.split('\n').filter(Boolean);
}

export function comprobacionesAplicables(checks, cambiados) {
  return checks.filter((c) => !c.paths?.length || cambiados === null || c.paths.some((p) => cambiados.some((f) => f.startsWith(p))));
}

/** Las pruebas de front configuradas en la ficha (kit.front) cuentan como una comprobación más, pero solo si existe su configuración. */
export function comprobacionesDeFront(config, projectDir) {
  const f = config.front;
  if (!f?.config || !f?.comando) return [];
  return existsSync(join(projectDir, f.config)) ? [{ commands: [f.comando] }] : [];
}

export function ejecutar({ projectDir, config, git, io = real }) {
  const dirGit = git(['rev-parse', '--absolute-git-dir']);
  if (!dirGit) return { ok: false, motivo: 'No es un repositorio git.' };
  const sello = join(dirGit, ARCHIVO_SELLO);
  io.borrar(sello);

  if (git(['status', '--porcelain'])) return { ok: false, motivo: 'Hay cambios sin commitear: el sello es de un commit. Haz commit (o descarta) y repite.' };
  const arbol = git(['rev-parse', 'HEAD^{tree}']);
  if (!arbol) return { ok: false, motivo: 'El repositorio no tiene commits.' };

  /* Un sello sin comprobaciones no prueba nada: se exige al menos las pruebas del proyecto. */
  if (!config.checks?.length) return { ok: false, motivo: 'La ficha no define comprobaciones (kit.checks): un sello sin pruebas no prueba nada. Añade al menos las pruebas del proyecto.' };

  const cambiados = archivosCambiados(git, config.baseBranch);
  const front = comprobacionesDeFront(config, projectDir);
  const lista = [...comprobacionesAplicables(config.checks, cambiados), ...front];
  if (config.front?.config && !front.length) io.log(`front: no existe ${config.front.config}; no se ejecutan pruebas de front (dilo en el informe si el proyecto tiene interfaz).`);
  const resultados = [];
  if (config.preset?.aviso) io.log(`AVISO: ${config.preset.aviso}`);
  const total = lista.reduce((n, c) => n + c.commands.length, 0);
  let i = 0;
  for (const c of lista) {
    for (const comando of c.commands) {
      i += 1;
      io.log(`[${i}/${total}] ${comando}`);
      const r = io.spawn(comando, { cwd: resolve(projectDir, c.cwd ?? '.'), timeout: (c.timeoutSeconds ?? config.checkTimeoutSeconds ?? 900) * 1000 });
      resultados.push({ comando, estado: r.status });
      if (r.status !== 0) return { ok: false, motivo: `Falló «${comando}» (salida ${r.status ?? 'timeout'}). Arréglalo y repite.`, resultados };
    }
  }

  let gitleaks = 'desactivado';
  let escaneo = 'ninguno';
  if (config.gitleaks) {
    const hay = io.spawn('gitleaks version', { stdio: 'ignore' }).status === 0;
    if (!hay) {
      gitleaks = 'sin binario';
      io.log('gitleaks: no hay binario (no se instala nada); corre el escaneo de secretos propio…');
      let r;
      try { r = io.escanear(projectDir); } catch (e) { r = { ok: true, error: e.message }; }
      if (r.error || r.motivo) {
        io.log('SIN ESCANEO DE SECRETOS: gitleaks no está y el escaneo propio no pudo correr; dilo en el informe de cierre.');
      } else if (!r.ok) {
        return { ok: false, motivo: `El escaneo de secretos encontró ${r.hallazgos.length} hallazgo(s) (valores no mostrados): ${r.hallazgos.join('; ')}. Arréglalo y repite.`, resultados };
      } else {
        escaneo = 'propio';
        io.log(`escaneo de secretos propio: limpio (${r.archivos} archivos, ${r.commits} commits).`);
      }
    } else {
      const cfg = existsSync(join(projectDir, '.gitleaks.toml')) ? ' --config .gitleaks.toml' : '';
      io.log('gitleaks: analizando el historial…');
      const r = io.spawn(`gitleaks git .${cfg} --redact --no-banner`, { cwd: projectDir, timeout: 300000 });
      if (r.status !== 0) return { ok: false, motivo: 'gitleaks encontró algo. Arréglalo (o allowlistea por commit+archivo+línea) y repite.', resultados };
      gitleaks = 'limpio';
      escaneo = 'gitleaks';
    }
  }
  if (escaneo === 'ninguno') io.log('SIN ESCANEO DE SECRETOS en este sello (gitleaks desactivado o sin herramienta): dilo en el informe de cierre.');

  const autoria = revisarAutoria(git, config.autoria?.correosPermitidos ?? []);
  if (!autoria.ok) io.log(`AVISO de autoría: el historial tiene correos que no son noreply ni públicos indicados: ${autoria.personales.join(', ')}. Antes del primer push de un proyecto nuevo, el humano decide (reescribir la autoría exige su autorización explícita y una rama de respaldo local que nunca se sube).`);

  io.escribir(sello, `${JSON.stringify({ ok: true, tree: arbol, at: io.ahora(), comprobaciones: resultados.map((r) => r.comando), front: front.length ? 'ejecutado' : 'no configurado', preset: config.preset ? { id: config.preset.id, verificado: !config.preset.aviso } : null, gitleaks, escaneo, autoria: autoria.ok ? 'ok' : 'personal' })}\n`);
  return { ok: true, tree: arbol, gitleaks, escaneo, autoria, front: front.length ? 'ejecutado' : 'no configurado', resultados };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const r = ejecutar({ projectDir, config: cargarConfig(projectDir), git: (a) => gitReal(a, projectDir) });
  process.stdout.write(r.ok ? `Sello de pre-merge listo (árbol ${r.tree.slice(0, 10)}, gitleaks: ${r.gitleaks}, escaneo de secretos: ${r.escaneo === 'ninguno' ? 'SIN ESCANEO DE SECRETOS' : r.escaneo}, autoría: ${r.autoria.ok ? 'ok' : 'AVISO correo personal'}).\n` : `SIN SELLO: ${r.motivo}\n`);
  process.exit(r.ok ? 0 : 1);
}
