// Lector de YAML mínimo, solo para validar los flujos de CI y los application.yml de los esqueletos sin dependencias (ADR 0004).
// Soporta el subconjunto que usan: mapas y listas por sangría (múltiplos de 2, sin tabuladores), «clave: valor», «- elemento»,
// «- clave: valor», listas en línea [a, b], cadenas entre comillas y comentarios. Todo lo demás (anclas, etiquetas, bloques `|`
// con contenido raro, mapas en línea) lanza un error: es preferible rechazar a aceptar lo que no se entiende.
export class YamlInvalido extends Error {}

const escalar = (t) => {
  t = t.trim();
  if (t === '') return null;
  if (/^(["']).*\1$/.test(t)) return t.slice(1, -1);
  if (t.startsWith('[') && t.endsWith(']')) return t.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean).map(escalar);
  if (/^[\[{&*!|>]/.test(t) && !t.startsWith('[')) throw new YamlInvalido(`construcción no soportada: ${t}`);
  if (/^-?\d+$/.test(t)) return Number(t);
  if (t === 'true' || t === 'false') return t === 'true';
  return t;
};

const sinComentario = (l) => l.replace(/(^|\s)#.*$/, '').replace(/\s+$/, '');

export function leerYaml(texto) {
  if (/\t/.test(texto)) throw new YamlInvalido('tabuladores en la sangría');
  const lineas = texto.split(/\r?\n/).map((raw, i) => ({ n: i + 1, raw, t: sinComentario(raw) })).filter((l) => l.t.trim() !== '');
  let i = 0;
  const sangria = (l) => l.t.length - l.t.trimStart().length;
  function bloque(nivel) {
    const l = lineas[i];
    if (!l || sangria(l) !== nivel) throw new YamlInvalido(`línea ${l?.n}: sangría inesperada`);
    return l.t.trimStart().startsWith('- ') || l.t.trim() === '-' ? lista(nivel) : mapa(nivel);
  }
  function valorDe(resto, nivel, linea) {
    if (resto !== '') {
      if (/^[|>]/.test(resto)) { // bloque de texto: se consume por sangría y se devuelve como cadena
        const partes = [];
        while (i < lineas.length && sangria(lineas[i]) > nivel) partes.push(lineas[i++].t.trim());
        return partes.join('\n');
      }
      return escalar(resto);
    }
    const sig = lineas[i];
    if (sig && (sangria(sig) > nivel || (sangria(sig) === nivel && sig.t.trimStart().startsWith('- ')))) return bloque(sangria(sig));
    return null;
  }
  function mapa(nivel) {
    const o = {};
    while (i < lineas.length && sangria(lineas[i]) === nivel && !lineas[i].t.trimStart().startsWith('- ')) {
      const l = lineas[i++];
      const m = l.t.trimStart().match(/^([^:\s][^:]*?):(?:\s+(.*))?$/);
      if (!m) throw new YamlInvalido(`línea ${l.n}: se esperaba «clave: valor»`);
      if (Object.hasOwn(o, m[1])) throw new YamlInvalido(`línea ${l.n}: clave repetida «${m[1]}»`);
      o[m[1]] = valorDe((m[2] ?? '').trim(), nivel, l);
    }
    if (i < lineas.length && sangria(lineas[i]) > nivel) throw new YamlInvalido(`línea ${lineas[i].n}: sangría inesperada`);
    return o;
  }
  function lista(nivel) {
    const a = [];
    while (i < lineas.length && sangria(lineas[i]) === nivel && lineas[i].t.trimStart().startsWith('- ')) {
      const l = lineas[i];
      const resto = l.t.trimStart().slice(2);
      if (/^[^:\s'"\[][^:]*:(\s|$)/.test(resto)) { // «- clave: valor»: un mapa cuyas demás claves van más sangradas
        lineas[i] = { ...l, t: `${' '.repeat(nivel + 2)}${resto}` };
        a.push(mapa(nivel + 2));
      } else { i++; a.push(escalar(resto)); }
    }
    return a;
  }
  if (!lineas.length) return {};
  const r = bloque(sangria(lineas[0]));
  if (i < lineas.length) throw new YamlInvalido(`línea ${lineas[i].n}: contenido sin interpretar`);
  return r;
}
