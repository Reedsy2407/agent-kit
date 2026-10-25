// Hace cumplir la integración: nunca rebase, el merge es siempre `--squash`, y no se integra ni se empuja la rama
// base sin el sello de pre-merge (lint, tests, build y gitleaks en verde sobre este mismo contenido).
// Por qué: el merge de una etapa llegó a la rama base con errores de lint que la verificación local no había corrido.
// Excepción al «falla abierto» (ADR 0002): si no puede decidir, bloquea (ADR 0007).
import { pathToFileURL } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { run, analizar, primeraPalabra } from './lib/common.mjs';

export const ARCHIVO_SELLO = 'kit-premerge.json';

function leerSelloDeGit(ctx) {
  const dir = ctx.git(['rev-parse', '--absolute-git-dir']);
  if (!dir) return null;
  const archivo = join(dir, ARCHIVO_SELLO);
  return existsSync(archivo) ? JSON.parse(readFileSync(archivo, 'utf8')) : null;
}

function exigirSello(ctx, treeish, accion) {
  const arbol = ctx.git(['rev-parse', `${treeish}^{tree}`]);
  if (!arbol) return `No pude resolver «${treeish}» para ${accion}; sin eso no se puede comprobar el sello de pre-merge.`;
  let sello;
  try { sello = (ctx.leerSello ?? leerSelloDeGit)(ctx); } catch { sello = null; }
  const como = 'Corre `node .claude/hooks/premerge-check.mjs` (lint, tests, build y gitleaks) y repite.';
  if (!sello?.ok) return `Falta el sello de pre-merge para ${accion}. ${como}`;
  if (sello.tree !== arbol) return `El sello de pre-merge es de otro contenido (cambió algo desde la última comprobación). ${como}`;
  return null;
}

function apuntaALaBase(seg, ctx) {
  const base = ctx.config.baseBranch;
  const args = seg.replace(/^git\s+(-\S+\s+)*push\s*/, '').split(/\s+/).filter((a) => a && !a.startsWith('-'));
  const rama = ctx.git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const refspecs = args.slice(1);
  if (refspecs.length === 0) return rama === base;
  return refspecs.some((r) => r.replace(/^\+/, '').split(':').pop() === base || r === base);
}

export function evaluar(input, ctx) {
  if (input.tool_name !== 'Bash') return null;
  const { segs } = analizar(input.tool_input?.command ?? '');
  const base = ctx.config.baseBranch;

  for (const seg of segs) {
    const w = primeraPalabra(seg);

    if (w === 'git') {
      const sub = seg.replace(/^git\s+((-\S+|\S+=\S+)\s+)*/, '').split(/\s+/)[0];
      const resto = seg.slice(seg.indexOf(sub) + sub.length).trim();

      if (sub === 'rebase') return 'Nunca rebase: la integración es `git merge --squash` (un commit por etapa en la rama base).';
      if (sub === 'pull' && /(^|\s)(--rebase|-r)(\s|$)/.test(resto)) return 'Nunca rebase, tampoco con `git pull --rebase`. Usa `git pull --ff-only`.';
      if (sub === 'config' && /pull\.rebase/.test(resto)) return 'No configures pull.rebase: la integración no usa rebase.';

      if (sub === 'merge') {
        if (/(^|\s)--(abort|quit|continue)(\s|$)/.test(resto)) continue;
        if (!/(^|\s)--squash(\s|$)/.test(resto)) return 'El merge es siempre `git merge --squash <rama>`: un solo commit por etapa, nunca con los commits de la rama.';
        const origen = resto.split(/\s+/).filter((a) => a && !a.startsWith('-')).pop();
        if (!origen) return 'Indica la rama de origen del merge.';
        const motivo = exigirSello(ctx, origen, `integrar «${origen}»`);
        if (motivo) return motivo;
      }

      if (sub === 'push') {
        if (/(^|\s)(--delete|-d)(\s|$)/.test(resto) && new RegExp(`(^|\\s)${base}(\\s|$)`).test(resto)) return `No se borra la rama ${base}.`;
        if (new RegExp(`(^|\\s):${base}(\\s|$)`).test(resto)) return `No se borra la rama ${base}.`;
        if (apuntaALaBase(seg, ctx)) {
          const motivo = exigirSello(ctx, 'HEAD', `empujar ${base}`);
          if (motivo) return motivo;
        }
      }
    }

    if (w === 'gh' && /^gh\s+pr\s+merge\b/.test(seg)) {
      if (/(^|\s)--(rebase|merge)(\s|$)|\s-[rm](\s|$)/.test(seg)) return 'Solo `gh pr merge --squash`: nunca rebase ni merge con los commits de la rama.';
      if (!/(^|\s)(--squash|-s)(\s|$)/.test(seg)) return 'Indica `--squash` en `gh pr merge`.';
      const motivo = exigirSello(ctx, 'HEAD', 'integrar el PR');
      if (motivo) return motivo;
    }
  }
  return null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) run(evaluar, { failClosed: true });
