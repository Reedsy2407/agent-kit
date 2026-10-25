// Limita el `Bash` del subagente revisor a lectura y verificación: git de solo lectura y ejecutores de pruebas.
// Por qué: el revisor es de solo lectura y `Bash` puede escribir por redirección; un revisor que corrige se convierte
// en el constructor y deja de ser independiente. Se registra en el frontmatter del subagente (campo `hooks`).
import { pathToFileURL } from 'node:url';
import { run, analizar, primeraPalabra } from './lib/common.mjs';

const GIT_LECTURA = /^git(\s+-C\s+\S+)?\s+(status|diff|log|show|rev-list|rev-parse|blame|ls-files|cat-file|shortlog|merge-base|describe|branch(\s+(--list|-a|-r|-v|--show-current))?|diff-tree|name-rev)(\s|$)/;
const EJECUTORES = [
  /^node\s+--test\b/, /^npm\s+(test|run\s+(test|lint|build|verify))\b/, /^npx\s+(playwright\s+test|ng\s+(test|lint|build))\b/,
  /^ng\s+(test|lint|build)\b/, /^(mvn|mvnd)\s+\S*(test|verify)\b/, /^(\.\/)?gradlew?\s+(test|check|build)\b/, /^pytest\b/,
];
const LECTURA = new Set(['ls', 'wc', 'head', 'tail', 'sort', 'uniq', 'pwd', 'echo']);

export function evaluar(input) {
  if (input.tool_name !== 'Bash') return null;
  const { enmascarado, segs } = analizar(input.tool_input?.command ?? '');
  if (/(^|[^>&0-9])\s*(>>?|\|\s*tee)\s*(?!\/dev\/null|&)\S/.test(enmascarado.replace(/\d?>&\d/g, '')))
    return 'El revisor es de solo lectura: sin redirecciones de escritura.';
  for (const seg of segs) {
    const limpio = seg.replace(/^timeout\s+\d+\s+/, '');
    if (GIT_LECTURA.test(limpio) || EJECUTORES.some((r) => r.test(limpio)) || LECTURA.has(primeraPalabra(limpio))) continue;
    return `El revisor solo puede usar git de lectura (status, diff, log, show…) y ejecutar pruebas (verify, test, lint, build). «${seg.split(/\s+/).slice(0, 3).join(' ')}» no está permitido: repórtalo como hallazgo en vez de corregirlo.`;
  }
  return null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) run(evaluar, { failClosed: true });
