// Marcadores {{nombre}} de las plantillas. Una sola lista: si una plantilla usa uno que no está aquí, la prueba falla.
export const MARCADORES = ['proyecto', 'tipo', 'tipo_nombre', 'fecha', 'rama_base', 'max_rama', 'max_modulo', 'perfil_expresion'];

const PATRON = /\{\{\s*([a-z_]+)\s*\}\}/g;

export function marcadoresUsados(texto) {
  return [...new Set([...texto.matchAll(PATRON)].map((m) => m[1]))];
}

/** Sustituye los marcadores; los que no tengan valor se dejan tal cual y se devuelven en `sinValor`. */
export function sustituir(texto, valores) {
  const sinValor = new Set();
  const salida = texto.replace(PATRON, (todo, nombre) => {
    if (valores[nombre] === undefined) { sinValor.add(nombre); return todo; }
    return String(valores[nombre]);
  });
  return { texto: salida, sinValor: [...sinValor] };
}
