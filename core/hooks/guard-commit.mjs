// Hace cumplir las reglas de commits: Conventional Commits con scope real, sin coautor ni firma de la herramienta,
// tope de commits por rama de etapa y por módulo, y ningún commit de solo registro dentro de una etapa.
// Por qué: el proyecto de origen llegó a 195 commits en 19 días y el 42 % era solo registro.
import { pathToFileURL } from 'node:url';
import { run, analizar, primeraPalabra } from './lib/common.mjs';

const FIRMAS = [
  [/co-authored-by\s*:/i, 'la línea Co-Authored-By'],
  [/generated with\s+\[?claude/i, 'la firma «Generated with Claude»'],
  [/noreply@anthropic\.com/i, 'el correo noreply@anthropic.com'],
];
const TIPOS = ['feat', 'fix', 'docs', 'chore', 'test', 'perf'];

/** Primer mensaje que se puede leer del comando: cuerpo de heredoc o primer -m. */
export function extraerMensaje(cmd) {
  const h = cmd.match(/<<-?\s*['"]?(\w+)['"]?[^\n]*\n([\s\S]*?)\n\s*\1\b/);
  if (h) return h[2].trim();
  const m = cmd.match(/(?:^|\s)(?:-[a-zA-Z]*m|--message)(?:\s+|=)("(?:[^"\\]|\\.)*"|'[^']*'|\S+)/);
  if (!m) return null;
  return m[1].replace(/^["']|["']$/g, '');
}

export function validarAsunto(asunto, config) {
  const tipos = config.commitTypes ?? TIPOS;
  const m = asunto.match(/^(\w+)(?:\(([^)]*)\))?(!)?: (.+)$/);
  if (!m) return `El asunto «${asunto}» no sigue Conventional Commits: \`tipo(scope): descripción corta en minúsculas, sin punto final\`.`;
  const [, tipo, scope, , desc] = m;
  if (!tipos.includes(tipo)) return `Tipo «${tipo}» no válido. Tipos: ${tipos.join(', ')}.`;
  if (scope !== undefined) {
    const lista = scope.split(',').map((s) => s.trim());
    if (lista.some((s) => !/^[a-z0-9][a-z0-9._-]*$/.test(s))) return `Scope «${scope}» no válido: nombres de módulo en minúsculas, separados por coma si toca más de uno.`;
    const permitidos = config.commitScopes ?? [];
    if (permitidos.length && lista.some((s) => !permitidos.includes(s))) return `Scope «${scope}» fuera de los módulos reales (${permitidos.join(', ')}). Una entidad interna no es un scope: va en la descripción.`;
  }
  if (/\(task\s*\d+\)/i.test(desc)) return 'Sin sufijos «(Task N)»: el número de tarea es contexto de la sesión de planificación.';
  if (/[.]$/.test(desc)) return 'La descripción no lleva punto final.';
  if (/^[A-ZÁÉÍÓÚÑ]/.test(desc)) return 'La descripción empieza en minúscula.';
  if (asunto.length > 100) return 'El asunto pasa de 100 caracteres: acórtalo y deja el detalle en el cuerpo.';
  return null;
}

function archivosEnStage(ctx) {
  const salida = ctx.git(['diff', '--cached', '--name-only']);
  return salida ? salida.split('\n').filter(Boolean) : [];
}

function reglasDeConteo(ctx, amend) {
  const { baseBranch, maxBranchCommits, modules = [], soloRegistro = ['tasks/', 'docs/'] } = ctx.config;
  const rama = ctx.git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const hayBase = ctx.git(['rev-parse', '--verify', '--quiet', baseBranch]) !== null;
  const enStage = archivosEnStage(ctx);

  if (rama && rama !== baseBranch && rama !== 'HEAD' && hayBase) {
    if (!amend) {
      const n = Number(ctx.git(['rev-list', '--count', `${baseBranch}..HEAD`]) ?? 0);
      if (n >= maxBranchCommits)
        return `La rama «${rama}» ya tiene ${n} commits (tope ${maxBranchCommits}). Júntalos por rebanada (\`git reset --soft ${baseBranch}\` y recommitea) o avisa al humano antes de pasar el límite.`;
    }
    if (enStage.length && enStage.every((f) => soloRegistro.some((p) => f.startsWith(p))))
      return `Commit de solo registro (${soloRegistro.join(', ')}) dentro de una etapa. Va dentro del commit de la rebanada que lo motiva.`;
  }
  if (!amend) {
    for (const mod of modules) {
      if (!enStage.some((f) => f.startsWith(mod.path))) continue;
      const n = Number(ctx.git(hayBase ? ['rev-list', '--count', baseBranch, '--', mod.path] : ['rev-list', '--count', 'HEAD', '--', mod.path]) ?? 0);
      if (n >= mod.max) return `El módulo «${mod.path}» ya lleva ${n} commits en ${baseBranch} (tope ${mod.max} en toda su vida). Avisa al humano antes de pasarlo; no se ajusta en silencio.`;
    }
  }
  return null;
}

export function evaluar(input, ctx) {
  if (input.tool_name !== 'Bash') return null;
  const cmd = input.tool_input?.command ?? '';
  const { segs } = analizar(cmd);
  const seg = segs.find((s) => primeraPalabra(s) === 'git' && /^git(\s+-[cC]\s+\S+)*\s+commit\b/.test(s));
  if (!seg) return null;

  for (const [re, que] of FIRMAS) if (re.test(cmd)) return `Los mensajes de commit no llevan ${que}: sin coautor ni referencias a la herramienta.`;

  const amend = /\s--amend\b/.test(seg);
  const sinEditor = /\s(--message|-F|--file|-C|--reuse-message|--no-edit)(\s|=|$)/.test(` ${seg}`) || /\s-[a-zA-Z]*m(\s|$)/.test(` ${seg}`);
  if (!sinEditor) return 'Un `git commit` sin -m abre un editor y espera para siempre. Pasa el mensaje con -m.';

  const mensaje = extraerMensaje(cmd);
  if (mensaje) {
    const asunto = mensaje.split('\n')[0].trim();
    const problema = validarAsunto(asunto, ctx.config);
    if (problema) return problema;
  }
  return reglasDeConteo(ctx, amend);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) run(evaluar);
