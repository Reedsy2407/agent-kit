// Entorno de ejecución del verificador (types/C/esqueletos/verificar.mjs, ADR 0019): dos ayudas pequeñas y sin dependencias
// para que una terminal abierta antes de instalar las herramientas, o con TLS inspeccionado por software de seguridad,
// pueda verificar los esqueletos sin ayuda manual. NUNCA se desactiva la verificación de certificados: solo se añaden
// autoridades que el propio sistema operativo ya confía.
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';

/** Carpetas donde los instaladores oficiales dejan Go, sus herramientas (govulncheck) y Cargo. */
export function carpetasHabituales(env = process.env, plataforma = process.platform) {
  if (plataforma === 'win32') {
    const casa = env.USERPROFILE;
    return [join(env.ProgramFiles ?? 'C:\\Program Files', 'Go', 'bin'), casa && join(casa, 'go', 'bin'), casa && join(casa, '.cargo', 'bin')].filter(Boolean);
  }
  const casa = env.HOME;
  return ['/usr/local/go/bin', casa && join(casa, 'go', 'bin'), casa && join(casa, '.cargo', 'bin')].filter(Boolean);
}

/**
 * Copia del entorno con las carpetas habituales de las herramientas al principio del PATH, solo las que existen y no
 * estaban ya. No toca el entorno del proceso ni la configuración del sistema. Devuelve { env, añadidas }.
 */
export function entornoConHerramientas(env = process.env, { plataforma = process.platform, existe = existsSync } = {}) {
  const copia = { ...env };
  const clave = Object.keys(copia).find((k) => k.toLowerCase() === 'path') ?? 'PATH';
  const actual = (copia[clave] ?? '').split(delimiter).filter(Boolean);
  const igual = (a, b) => (plataforma === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);
  const añadidas = carpetasHabituales(env, plataforma).filter((c) => existe(c) && !actual.some((p) => igual(p, c)));
  copia[clave] = [...añadidas, ...actual].join(delimiter);
  return { env: copia, añadidas };
}

/** ¿Es este mensaje de `pip` un fallo de verificación de certificado (y no, por ejemplo, falta de red)? */
export const esFalloDeCertificado = (texto) => /certificate verify failed|CERTIFICATE_VERIFY_FAILED|unable to get local issuer certificate/i.test(texto);

/** Une listas de certificados en PEM sin repetidos y descarta lo que no sea un certificado. Devuelve el texto del archivo PEM. */
export function pemDeConfianza(...listas) {
  const vistos = new Set();
  for (const pem of listas.flat()) {
    const limpio = String(pem).trim();
    if (/^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----$/.test(limpio)) vistos.add(limpio);
  }
  return `${[...vistos].join('\n')}\n`;
}

/** Oculta usuario y contraseña de cualquier URL (proxy, índice) en un texto que se va a imprimir. */
export const sinCredenciales = (texto) => String(texto).replace(/\/\/[^\s/@]+@/g, '//***@');

/** Los certificados que Node conoce: los incluidos, los del sistema operativo y los extra del usuario. null si esta versión de Node no puede exportarlos. */
export async function certificadosDeConfianza() {
  const tls = await import('node:tls');
  if (typeof tls.getCACertificates !== 'function') return null;
  return ['bundled', 'system', 'extra'].flatMap((origen) => tls.getCACertificates(origen));
}
