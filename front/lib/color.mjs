// Aritmética de color y contraste (WCAG 2.x). Una sola fuente: se usa en Node y se inyecta como texto en la página
// (por eso `colorFactory` no puede depender de nada fuera de su cuerpo).
export function colorFactory() {
  const num = (t, base) => (String(t).endsWith('%') ? (parseFloat(t) / 100) * base : parseFloat(t));
  /** rgb()/rgba() y color(srgb …) → { r, g, b, a } con r, g, b en 0–255; null si no es un color. */
  const parse = (texto) => {
    const s = String(texto);
    const rgb = s.match(/rgba?\(([^)]+)\)/);
    if (rgb) {
      const p = rgb[1].split(/[ ,/]+/).filter(Boolean);
      return { r: num(p[0], 255), g: num(p[1], 255), b: num(p[2], 255), a: p[3] === undefined ? 1 : num(p[3], 1) };
    }
    const srgb = s.match(/color\(srgb\s+([^)]+)\)/);
    if (srgb) {
      const p = srgb[1].split(/[ ,/]+/).filter(Boolean);
      return { r: num(p[0], 1) * 255, g: num(p[1], 1) * 255, b: num(p[2], 1) * 255, a: p[3] === undefined ? 1 : num(p[3], 1) };
    }
    return null;
  };
  /** `top` (con su alfa) sobre `bot`. */
  const over = (top, bot) => ({
    r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1,
  });
  const lum = ({ r, g, b }) => {
    const f = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  return { parse, over, lum, ratio };
}

export const { parse: parseColor, over: sobreColor, lum: luminancia, ratio: contraste } = colorFactory();

/**
 * Contraste de un texto contra el peor caso de su fondo: el fondo solo, con el resplandor del texto mezclado, y con una
 * textura que oscurece o aclara hasta `texturaAlfa`. Devuelve el menor de todos.
 */
export function peorContraste({ fg, bg, resplandor = null, texturaAlfa = 0 }) {
  const fondos = [bg];
  if (resplandor && resplandor.a > 0) fondos.push(sobreColor(resplandor, bg));
  const todos = [...fondos];
  if (texturaAlfa > 0) {
    for (const b of fondos) for (const capa of [{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }]) todos.push(sobreColor({ ...capa, a: texturaAlfa }, b));
  }
  let min = Infinity;
  for (const b of todos) min = Math.min(min, contraste(fg.a < 1 ? sobreColor(fg, b) : fg, b));
  return min;
}
