// Hoja comparativa HTML, lado a lado, de las capturas de design/refs/. Cada carpeta es una columna (una dirección);
// con una sola carpeta se compara oscuro frente a claro. No usa red ni scripts: solo <img> con rutas relativas.
// Uso: node tests/front/herramientas/hoja.mjs --carpetas d1,d2,d3 [--salida hoja.html]
//   (las carpetas son subcarpetas de design/refs/ con capturas de capturas.mjs)
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolverSalida } from './salida.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** `inicio-1280-oscuro.png` → { clave: 'inicio · 1280 px', tema: 'oscuro' }; null si no sigue el patrón. */
export function analizarNombre(nombre) {
  const m = nombre.match(/^(.+)-(\d+)-(oscuro|claro)\.png$/);
  return m ? { pagina: m[1], ancho: Number(m[2]), tema: m[3] } : null;
}

/**
 * columnas: [{ titulo, carpeta (relativa a la hoja), archivos: [nombre.png] }]. Una fila por página y ancho; con varias
 * columnas se muestran (por tema) lado a lado; con una sola, oscuro y claro.
 */
export function construirHoja({ titulo = 'Hoja comparativa', columnas }) {
  const filas = new Map();
  const celdas = columnas.length === 1
    ? columnas[0].archivos.flatMap((f) => { const a = analizarNombre(f); return a ? [{ ...a, col: a.tema, src: `${columnas[0].carpeta}/${f}` }] : []; })
    : columnas.flatMap((c) => c.archivos.flatMap((f) => { const a = analizarNombre(f); return a ? [{ ...a, col: c.titulo, src: `${c.carpeta}/${f}` }] : []; }));
  const titulos = columnas.length === 1 ? ['oscuro', 'claro'] : columnas.map((c) => c.titulo);
  for (const c of celdas) {
    for (const tema of columnas.length === 1 ? [null] : ['oscuro', 'claro']) {
      if (tema && c.tema !== tema) continue;
      const clave = `${c.pagina}|${c.ancho}${tema ? `|${tema}` : ''}`;
      if (!filas.has(clave)) filas.set(clave, { pagina: c.pagina, ancho: c.ancho, tema, celdas: new Map() });
      filas.get(clave).celdas.set(c.col, c.src);
    }
  }
  const ordenadas = [...filas.values()].sort((a, b) => a.pagina.localeCompare(b.pagina) || a.ancho - b.ancho || String(a.tema).localeCompare(String(b.tema)));
  const cuerpo = ordenadas.map((f) => `<tr><th scope="row">${esc(f.pagina)} · ${f.ancho} px${f.tema ? ` · ${esc(f.tema)}` : ''}</th>${titulos.map((t) => {
    const src = f.celdas.get(t);
    return `<td>${src ? `<img src="${esc(src)}" alt="${esc(`${f.pagina} a ${f.ancho} px, ${t}`)}" loading="lazy">` : '<span class="falta">sin captura</span>'}</td>`;
  }).join('')}</tr>`).join('\n');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title>
<style>body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#f4f4f4;color:#111}h1{margin:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:8px;vertical-align:top;background:#fff}thead th{position:sticky;top:0;background:#222;color:#fff}tbody th{text-align:left;width:10rem}img{max-width:100%;height:auto;display:block}.falta{color:#666}</style></head>
<body><h1>${esc(titulo)}</h1><table><thead><tr><th scope="col">Página</th>${titulos.map((t) => `<th scope="col">${esc(t)}</th>`).join('')}</tr></thead>
<tbody>
${cuerpo}
</tbody></table></body></html>
`;
}

export function main(args, { stdout = process.stdout, stderr = process.stderr, proyecto = process.cwd() } = {}) {
  try {
    const o = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--carpetas', '--salida'].includes(args[i]) || args[i + 1] === undefined) throw new Error(`opción desconocida o sin valor: ${args[i]}`);
      o[args[i].slice(2)] = args[i + 1];
    }
    if (!o.carpetas) throw new Error('falta --carpetas <d1,d2,…> (subcarpetas de design/refs/)');
    const refs = resolverSalida(proyecto, '');
    const nombres = o.carpetas.split(',').map((s) => s.trim()).filter(Boolean);
    const columnas = nombres.map((n) => {
      const dir = resolverSalida(proyecto, n);
      if (!existsSync(dir)) throw new Error(`no existe design/refs/${n}`);
      return { titulo: n, carpeta: relative(refs, dir).replaceAll('\\', '/'), archivos: readdirSync(dir).filter((f) => f.endsWith('.png')).sort() };
    });
    const destino = resolverSalida(proyecto, o.salida ?? 'hoja.html');
    writeFileSync(destino, construirHoja({ titulo: `Hoja comparativa: ${nombres.join(' · ')}`, columnas }));
    stdout.write(`Hoja en ${destino}\n`);
    return 0;
  } catch (e) {
    stderr.write(`${e.message}\n`);
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = main(process.argv.slice(2));
