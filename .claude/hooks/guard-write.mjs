// Bloquea escrituras (Write/Edit) fuera del proyecto y de la carpeta temporal, sobre las reglas del propio kit
// (hooks, kit.json, settings) y con forma de secreto.
// Por qué: los temporales nunca van a la carpeta padre; un hook que el agente puede editar no es una regla;
// y «secretos nunca en archivos».
import { pathToFileURL } from 'node:url';
import { basename, resolve, relative } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { run, estaDentro, partes } from './lib/common.mjs';

export const SECRETOS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'una clave privada'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'una clave de acceso de AWS'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{50,}\b/, 'un token de GitHub'],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}|\bsk-[A-Za-z0-9]{32,}\b/, 'una clave de API'],
  [/\bxox[abprs]-[A-Za-z0-9-]{20,}/, 'un token de Slack'],
  [/\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/, 'un JWT'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'una clave de API de Google'],
  [/\bsk_live_[0-9a-zA-Z]{24,}\b/, 'una clave secreta de pagos'],
  [/\bnpm_[A-Za-z0-9]{36}\b/, 'un token de npm'],
  [/\bpostgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]{4,}@/, 'una cadena de conexión con contraseña'],
];

export const SENSIBLES = /(^|[\\/])(\.env(\.[^\\/]+)?|id_rsa[^\\/]*|id_ed25519[^\\/]*|[^\\/]+\.(pem|key|p12|pfx))$/i;
export const PLANTILLAS_ENV = /\.env\.(example|ejemplo|template|plantilla|sample)$/i;

function rutaDe(input) {
  const t = input.tool_input ?? {};
  return t.file_path ?? t.notebook_path ?? null;
}

function contenidoDe(input) {
  const t = input.tool_input ?? {};
  return [t.content, t.new_string, t.new_source].filter((x) => typeof x === 'string').join('\n');
}

export function evaluar(input, ctx) {
  if (!['Write', 'Edit', 'NotebookEdit', 'MultiEdit'].includes(input.tool_name)) return null;
  const ruta = rutaDe(input);
  if (!ruta) return null;
  const abs = resolve(ctx.projectDir, ruta);

  const dentroProyecto = estaDentro(abs, ctx.projectDir);
  const dentroTemporal = estaDentro(abs, tmpdir());
  const dentroConfigClaude = estaDentro(abs, homedir()) && /^\.claude/.test(partes(relative(homedir(), abs))[0] ?? '');
  const extra = (ctx.config.escrituraExtra ?? []).some((d) => estaDentro(abs, resolve(ctx.projectDir, d)));
  if (!dentroProyecto && !dentroTemporal && !dentroConfigClaude && !extra)
    return `Escritura fuera del proyecto: ${ruta}. Los archivos temporales van a la carpeta temporal del sistema o a un directorio ignorado por git dentro del proyecto.`;

  const rel = dentroProyecto ? partes(resolve(abs)).slice(partes(resolve(ctx.projectDir)).length) : [];
  const enClaude = rel[0] === '.claude';
  if (enClaude && (rel[1] === 'hooks' || rel[1] === 'kit.json' || /^settings(\.local|\.generado)?\.json$/.test(rel[1] ?? '')))
    return `No edites ${rel.join('/')}: son las reglas que se hacen cumplir. Propón el cambio por escrito y que lo aplique el humano (o el instalador).`;
  if (dentroConfigClaude && /^settings(\.local)?\.json$/.test(basename(abs))) return 'No edites tu propia configuración de permisos: propón el cambio y que lo aplique el humano.';

  if (SENSIBLES.test(abs) && !PLANTILLAS_ENV.test(abs))
    return `${basename(abs)} es un archivo de secretos o claves: no lo escribas. Usa una plantilla (.env.example) sin valores y deja que el humano ponga los reales.`;

  const texto = contenidoDe(input);
  for (const [re, que] of SECRETOS) if (re.test(texto)) return `El contenido parece incluir ${que}. Los secretos nunca van en archivos: usa una variable de entorno y una plantilla sin valores.`;
  return null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) run(evaluar);
