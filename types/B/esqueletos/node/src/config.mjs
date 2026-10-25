// Configuración desde variables de entorno. Si falta una obligatoria o es inválida, el servicio NO arranca (falla pronto y
// dice cuál, sin mostrar valores). Aquí no hay secretos; cuando los haya, no llevan valor por defecto: se leen igual y se
// exigen aquí.
export class ConfigInvalida extends Error {}

const ENTORNOS = ['desarrollo', 'produccion'];

export function cargarConfig(env = process.env) {
  const problemas = [];
  const entorno = env.APP_ENTORNO;
  if (!entorno) problemas.push('falta APP_ENTORNO (obligatoria: desarrollo o produccion)');
  else if (!ENTORNOS.includes(entorno)) problemas.push('APP_ENTORNO debe ser desarrollo o produccion');
  const puerto = env.PORT === undefined || env.PORT === '' ? 8080 : Number(env.PORT);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) problemas.push('PORT debe ser un entero de 1 a 65535');
  if (problemas.length) throw new ConfigInvalida(problemas.join('; '));
  return { entorno, puerto, host: env.HOST || '127.0.0.1' };
}
