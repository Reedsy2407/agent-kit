// Bloquea comandos de shell que cuelgan la terminal, saturan la máquina o destruyen sin permiso.
// Por qué: una shell quedó 1 h 24 min colgada por un `cat > archivo` sin entrada; una sesión saturó la CPU
// y mató procesos por nombre; los comandos largos sin `timeout` dejan la terminal muda.
import { pathToFileURL } from 'node:url';
import { run, analizar, primeraPalabra, aNativa, estaDentro, partes } from './lib/common.mjs';
import { tmpdir } from 'node:os';

const EDITORES = new Set(['vim', 'vi', 'nvim', 'nano', 'emacs', 'less', 'more', 'pico', 'edit']);
const INTERPRETES = new Set(['python', 'python3', 'py', 'node', 'bash', 'sh', 'zsh', 'powershell', 'pwsh', 'ruby', 'perl']);
const MATAR_POR_NOMBRE = /^(pkill|killall)$/;
const SERVIDORES = [
  /^ng serve\b/, /^npm (run )?(start|dev|serve|watch)\b/, /^npx (http-server|serve|vite)\b/, /^vite\b/,
  /^next dev\b/, /^python3? -m http\.server\b/, /^docker compose up\b(?!.*(\s-d\b|\s--detach\b))/,
];

function reglaSegmento(seg, input, ctx) {
  const palabra = primeraPalabra(seg);
  const args = seg.slice(seg.indexOf(palabra) + palabra.length).trim();

  if (EDITORES.has(palabra)) return `\`${palabra}\` abre un editor o paginador y espera para siempre. Lee con Read y edita con Edit/Write.`;
  if (/^git (rebase|add|checkout|reset|stash)\b.*\s(-i|-p|--interactive|--patch)(\s|$)/.test(seg)) return 'Los flags interactivos de git (-i, -p) esperan entrada. Usa la forma no interactiva.';
  if (palabra === 'cat' && (args === '' || /^(>>?|<<)/.test(args) || /\s>>?\s*\S/.test(` ${args}`) || /<</.test(args))) return '`cat` sin archivo, con redirección de escritura o con heredoc espera stdin o edita a ciegas. Usa Read para leer y Write/Edit para escribir.';
  if (palabra === 'read') return '`read` espera entrada del teclado y cuelga la shell.';
  if (INTERPRETES.has(palabra) && (args === '' || args === '-' || /^-i\b/.test(args))) return `\`${palabra}\` sin script abre un intérprete que espera stdin. Escribe el script a un archivo con Write y ejecútalo con \`< /dev/null\`.`;
  if (INTERPRETES.has(palabra) && /<<-?\s*['"]?\w+/.test(seg)) return `Editar o ejecutar código con un heredoc de ${palabra} está prohibido. Escribe el script con Write y ejecútalo después.`;

  if (MATAR_POR_NOMBRE.test(palabra) || /^taskkill\b.*\s\/(im|fi)\b/i.test(seg) || /^stop-process\b.*-name\b/i.test(seg) || /^wmic\b.*\bprocess\b/i.test(seg))
    return 'Matar procesos por nombre puede cerrar procesos que no son tuyos. Rastrea el PID y detén por PID (`kill <pid>`, `taskkill /PID <pid>`).';
  if (palabra === 'yes' || /^stress(-ng)?\b/.test(seg) || /^while\s+(true|:)\b/.test(seg) || /^for\s*\(\(\s*;\s*;\s*\)\)/.test(seg) || /:\(\)\s*\{/.test(seg))
    return 'Nada de carga artificial de CPU ni bucles sin tope. Para probar un test repítelo con `@RepeatedTest` o equivalente en una sola ejecución; para esperar, un bucle acotado con `sleep` y número máximo de intentos.';
  if (/^tail\b.*\s(-[a-zA-Z]*f[a-zA-Z]*|--follow\S*)(\s|$)/.test(seg) || /^watch\b/.test(seg) || /^docker (compose )?logs\b.*\s(-f|--follow)\b/.test(seg) || /^journalctl\b.*\s-f\b/.test(seg) || /\s--tail(\s|=|$)/.test(` ${seg}`) && !/^docker\b/.test(seg))
    return 'Seguir un flujo (`tail -f`, `--follow`, `--tail`, `watch`) no termina nunca. Lee con un límite (`--limit`, `tail -n`) y un archivo.';
  if (!input.tool_input?.run_in_background && SERVIDORES.some((r) => r.test(seg)))
    return 'Un servidor de desarrollo no termina: lánzalo con run_in_background y detenlo por PID.';

  if (/^rm\b/.test(seg) && (partes(args.replace(/\s+/g, '/')).some((p) => p === '..') || /(^|\s)(\/|~|\$HOME|\$\{HOME\}|\*|\/\*)(\s|$)/.test(args)))
    return '`rm` con `..`, la raíz, el home o `*` suelto puede borrar fuera de lo que toca. Borra rutas concretas dentro del proyecto o de la carpeta temporal.';
  if (/^git push\b.*(\s--force\b|\s--force-with-lease\b|\s-f\b|\s\+\S)/.test(seg)) return 'Push forzado prohibido: reescribe historia compartida.';
  if (/^docker (system prune|volume (rm|prune))\b/.test(seg)) return 'Destructivo e irreversible (volúmenes y datos locales). Pídele permiso explícito al humano.';
  return null;
}

function reglaRedirecciones(enmascarado, ctx) {
  const reDest = /(?:^|[\s0-9&])(?:>>?|\|\s*tee(?:\s+-a)?)\s*([^\s&|;<>()]+)/g;
  let m;
  while ((m = reDest.exec(enmascarado))) {
    const dest = m[1];
    if (/^(\/dev\/(null|stderr|stdout)|&\d)$/.test(dest) || dest === 'NUL') continue;
    if (partes(dest).includes('..')) return `Escritura a \`${dest}\`: no se escribe en carpetas padre. Usa la carpeta temporal del sistema o un directorio ignorado por git dentro del proyecto.`;
    const abs = aNativa(dest);
    if (/^([a-zA-Z]:)?[\\/]/.test(abs) && !estaDentro(abs, ctx.projectDir) && !estaDentro(abs, tmpdir()))
      return `Escritura a \`${dest}\`, fuera del proyecto y de la carpeta temporal. Usa la carpeta temporal del sistema.`;
  }
  return null;
}

export function evaluar(input, ctx) {
  if (input.tool_name !== 'Bash') return null;
  const cmd = input.tool_input?.command ?? '';
  const { enmascarado, segs } = analizar(cmd);

  for (const seg of segs) {
    const motivo = reglaSegmento(seg, input, ctx);
    if (motivo) return motivo;
  }
  const r = reglaRedirecciones(enmascarado, ctx);
  if (r) return r;

  const conTimeout = input.tool_input?.timeout != null || input.tool_input?.run_in_background || segs.some((s) => primeraPalabra(s) === 'timeout');
  if (!conTimeout) {
    const largo = segs.find((s) => ctx.config.timeoutRequired.some((p) => s === p || s.startsWith(`${p} `)));
    if (largo) return `\`${largo.split(/\s+/).slice(0, 3).join(' ')}\` puede tardar: lánzalo con \`timeout <segundos>\` (o con el parámetro timeout de la herramienta) y en segundo plano si pasa de 2 minutos.`;
  }
  return null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) run(evaluar);
