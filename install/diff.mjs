// Diferencias legibles entre lo que hay en el destino y lo que instalaría el kit (instalador --diff). Sin dependencias:
// diff de líneas por subsecuencia común más larga, en bloques con contexto.

const MAX_LINEAS_DIFF = 400; // por encima, el cálculo se limita a un resumen (la tabla de LCS crece con el cuadrado)

const esBinario = (buf) => buf.includes(0);

/** Opcodes [{ op: ' '|'-'|'+', texto }] entre dos listas de líneas. */
function comparar(a, b) {
  const n = a.length;
  const m = b.length;
  const t = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ op: ' ', texto: a[i] }); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) { ops.push({ op: '-', texto: a[i] }); i++; }
    else { ops.push({ op: '+', texto: b[j] }); j++; }
  }
  while (i < n) ops.push({ op: '-', texto: a[i++] });
  while (j < m) ops.push({ op: '+', texto: b[j++] });
  return ops;
}

/** Resumen corto del cambio para la lista de --diff: «+3 −2 líneas», «binario», «archivo largo» o «solo finales de línea». */
export function resumenDeDiff(anterior, nuevo) {
  if (anterior.equals(nuevo)) return 'sin cambios';
  if (esBinario(anterior) || esBinario(nuevo)) return 'binario';
  const a = anterior.toString('utf8').replace(/\r\n/g, '\n').split('\n');
  const b = nuevo.toString('utf8').replace(/\r\n/g, '\n').split('\n');
  if (a.length > MAX_LINEAS_DIFF || b.length > MAX_LINEAS_DIFF) return `archivo largo (${a.length} → ${b.length} líneas)`;
  const ops = comparar(a, b);
  const quitadas = ops.filter((o) => o.op === '-').length;
  const anadidas = ops.filter((o) => o.op === '+').length;
  return quitadas || anadidas ? `+${anadidas} −${quitadas} líneas` : 'solo finales de línea';
}

/**
 * Texto del diff de `anterior` (lo que hay) a `nuevo` (lo que instalaría el kit), como Buffers. `-` es lo que hay y se
 * perdería con --forzar; `+` es lo que traería el kit. Devuelve '' si son iguales.
 */
export function diffDeArchivos(anterior, nuevo, { contexto = 2, maxLineas = 60 } = {}) {
  if (anterior.equals(nuevo)) return '';
  if (esBinario(anterior) || esBinario(nuevo)) return `  (binario: ${anterior.length} bytes → ${nuevo.length} bytes)`;
  const a = anterior.toString('utf8').replace(/\r\n/g, '\n').split('\n');
  const b = nuevo.toString('utf8').replace(/\r\n/g, '\n').split('\n');
  if (a.length > MAX_LINEAS_DIFF || b.length > MAX_LINEAS_DIFF) return `  (archivo largo: ${a.length} líneas → ${b.length} líneas; compáralo a mano)`;
  const ops = comparar(a, b);
  if (!ops.some((o) => o.op !== ' ')) return '  (solo cambian los finales de línea)';
  const visibles = new Array(ops.length).fill(false);
  ops.forEach((o, i) => { if (o.op !== ' ') for (let k = Math.max(0, i - contexto); k <= Math.min(ops.length - 1, i + contexto); k++) visibles[k] = true; });
  const salida = [];
  let saltado = false;
  ops.forEach((o, i) => {
    if (!visibles[i]) { saltado = true; return; }
    if (saltado && salida.length) salida.push('  …');
    saltado = false;
    salida.push(`  ${o.op} ${o.texto}`);
  });
  if (salida.length > maxLineas) return `${salida.slice(0, maxLineas).join('\n')}\n  … (${salida.length - maxLineas} líneas más)`;
  return salida.join('\n');
}
