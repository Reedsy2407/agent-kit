// Registro de resultados: cada prueba llama a check(nombre, ok, detalle), info(nombre, detalle) o aviso(nombre, detalle).
// Un aviso no hace fallar la corrida, pero se imprime con «!» y se cuenta en el resumen: es lo que no se pudo comprobar.
export function crearInforme() {
  const resultados = [];
  return {
    resultados,
    check(nombre, ok, detalle = '') { resultados.push({ nombre, ok: Boolean(ok), detalle }); },
    info(nombre, detalle) { resultados.push({ nombre, ok: true, info: true, detalle }); },
    aviso(nombre, detalle) { resultados.push({ nombre, ok: true, info: true, aviso: true, detalle }); },
  };
}

export function resumen(informes) {
  let total = 0;
  let fallos = 0;
  let avisos = 0;
  for (const r of informes.flatMap((i) => i.resultados)) { if (!r.info) total += 1; if (!r.ok) fallos += 1; if (r.aviso) avisos += 1; }
  return { total, fallos, avisos };
}

export function formatear(nombre, informe) {
  const lineas = [`\n# ${nombre}`];
  for (const r of informe.resultados) lineas.push(`  ${r.aviso ? '!' : r.info ? 'i' : r.ok ? '✓' : '✗'} ${r.aviso ? 'AVISO: ' : ''}${r.nombre}${r.detalle ? ` — ${r.detalle}` : ''}`);
  return lineas.join('\n');
}
