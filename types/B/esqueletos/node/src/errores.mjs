// Formato uniforme de error: problema HTTP (RFC 9457), siempre con el mismo contenido y sin detalles internos.
const TITULOS = { 400: 'Petición inválida', 404: 'No encontrado', 405: 'Método no permitido', 500: 'Error interno' };

export function responderProblema(res, status, detalle, cabeceras = {}) {
  const cuerpo = JSON.stringify({ type: 'about:blank', title: TITULOS[status] ?? 'Error', status, detail: detalle });
  res.writeHead(status, { 'content-type': 'application/problem+json', ...cabeceras });
  res.end(cuerpo);
}
