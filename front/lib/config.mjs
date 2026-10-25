// Configuración de las pruebas de front por proyecto (tests/front/front.config.json). Valores por defecto razonables
// y validación estricta: un umbral mal escrito debe fallar al cargar, no pasar en silencio.
import { readFileSync } from 'node:fs';

export class ConfigInvalida extends Error {
  constructor(errores) {
    super(`front.config.json inválido:\n- ${errores.join('\n- ')}`);
    this.errores = errores;
  }
}

/** Las pruebas de la biblioteca, en orden de ejecución. Cada una se puede apagar con `pruebas.<id>: false`. */
export const IDS_PRUEBAS = Object.freeze(['dist', 'datos', 'contenido', 'contraste', 'layout', 'movimiento', 'peso', 'csp', 'cpu']);

export const POR_DEFECTO = Object.freeze({
  version: 1,
  paginas: [{ ruta: '/index.html', tipo: 'portada' }],
  temas: ['dark', 'light'],
  origen: { carpeta: '.', url: null, cabeceras: true },
  viewports: { movil: [360, 740], tableta: [768, 1024], escritorio: [1280, 800] },
  umbrales: {
    contrasteTexto: 4.5, contrasteTextoGrande: 3, texturaAlfaMax: 0.08,
    anchosSinDesborde: [360, 768, 1280], objetivoPx: 44, focoPx: 3, textoMinimoPx: 15, textoBasePx: null,
    cicloMinimoMs: 340, pesoPortadaKB: 150, jsKB: 15, fuentesMax: 4,
    cpuLimitePct: 10, cpuObjetivoPct: 2, cpuMuestras: 3, cpuVentanaMs: 6000,
  },
  selectores: {
    objetivos: 'button, [role="button"], summary, input:not([type="hidden"]), select, textarea, nav a, header a, footer a',
    excluirObjetivos: ['.skip', '.sr-only'],
    decorativos: [],
    ignorarTexto: ['.sr-only', '[hidden]'],
  },
  contenido: { minCaracteres: 200, textoEsperado: [], externosEnPestanaNueva: false, sinEmoji: true },
  contraste: { texturas: 'auto' },
  datosSensibles: { telefonos: true, patrones: [], nombresProhibidos: [], ignorar: [], archivoPrivado: null, archivoPrivadoObligatorio: false },
  fuentes: { licencias: null },
  dist: { carpeta: 'dist', permitidos: ['index.html', '404.html', '_headers', 'assets/**'], prohibidos: [] },
  pruebas: Object.fromEntries(IDS_PRUEBAS.map((id) => [id, true])),
});

const esObjeto = (x) => x && typeof x === 'object' && !Array.isArray(x);

function fusionar(base, extra) {
  if (!esObjeto(base) || !esObjeto(extra)) return extra === undefined ? base : extra;
  const salida = { ...base };
  for (const [k, v] of Object.entries(extra)) salida[k] = k in base && esObjeto(base[k]) ? fusionar(base[k], v) : v;
  return salida;
}

const TIPOS_PAGINA = ['portada', 'interior', '404'];
const TEMAS = ['dark', 'light'];
export const MODOS_TEXTURA = ['auto', 'oscurecen', 'aclaran', 'ambas'];
export const AMBITOS = ['visible', 'atributos', 'codigo'];

/** Valor de un ajuste que puede ser único o por tema ({ dark, light }). */
export const porTema = (valor, tema) => (esObjeto(valor) ? valor[tema] : valor);

/** Una entrada de `clics` normalizada: { selector, anchoMin, anchoMax }. */
export const clicDe = (c) => (typeof c === 'string' ? { selector: c } : c);

/** ¿Aplica el clic a este ancho de viewport? */
export const clicAplica = (c, ancho) => (c.anchoMin === undefined || ancho >= c.anchoMin) && (c.anchoMax === undefined || ancho <= c.anchoMax);

export function normalizarConfig(entrada = {}) {
  const errores = [];
  if (!esObjeto(entrada)) throw new ConfigInvalida(['el archivo debe ser un objeto JSON']);
  for (const sec of ['umbrales', 'selectores', 'contenido', 'contraste', 'datosSensibles', 'fuentes', 'dist', 'pruebas', 'origen', 'viewports'])
    if (sec in entrada && !esObjeto(entrada[sec])) errores.push(`${sec} debe ser un objeto`);
  if (errores.length) throw new ConfigInvalida(errores);
  const c = fusionar(JSON.parse(JSON.stringify(POR_DEFECTO)), entrada);
  for (const k of Object.keys(entrada)) if (k !== '_ayuda' && !(k in POR_DEFECTO)) errores.push(`clave desconocida: «${k}»`);
  for (const sec of ['umbrales', 'selectores', 'contenido', 'contraste', 'datosSensibles', 'fuentes', 'dist', 'pruebas', 'origen'])
    for (const k of Object.keys(entrada[sec] ?? {})) if (!(k in POR_DEFECTO[sec])) errores.push(`${sec}.${k}: clave desconocida`);
  if (c.version !== 1) errores.push('version debe ser 1');

  if (!Array.isArray(c.paginas) || !c.paginas.length) errores.push('paginas debe ser una lista con al menos una página');
  else c.paginas.forEach((p, i) => {
    if (!p || typeof p.ruta !== 'string' || !p.ruta.startsWith('/')) errores.push(`paginas[${i}].ruta debe empezar por «/»`);
    if (!TIPOS_PAGINA.includes(p?.tipo)) errores.push(`paginas[${i}].tipo debe ser uno de ${TIPOS_PAGINA.join(', ')}`);
    if (p?.clics !== undefined) {
      if (!Array.isArray(p.clics)) errores.push(`paginas[${i}].clics debe ser una lista de selectores o de { selector, anchoMin, anchoMax }`);
      else p.clics.forEach((cl, j) => {
        const ok = typeof cl === 'string' || (esObjeto(cl) && typeof cl.selector === 'string' && cl.selector
          && ['anchoMin', 'anchoMax'].every((k) => cl[k] === undefined || (Number.isInteger(cl[k]) && cl[k] > 0))
          && Object.keys(cl).every((k) => ['selector', 'anchoMin', 'anchoMax'].includes(k)));
        if (!ok) errores.push(`paginas[${i}].clics[${j}] debe ser un selector o { selector, anchoMin?, anchoMax? } con anchos enteros positivos`);
      });
    }
  });
  if (!Array.isArray(c.temas) || !c.temas.length || !c.temas.every((t) => ['dark', 'light'].includes(t))) errores.push('temas debe ser una lista con «dark» y/o «light»');
  if (!esObjeto(c.viewports) || !Object.values(c.viewports).every((v) => Array.isArray(v) && v.length === 2 && v.every((n) => Number.isInteger(n) && n > 0))) errores.push('viewports debe ser { nombre: [ancho, alto] } con enteros positivos');
  if (c.origen.url !== null && !/^https?:\/\/[^\s/]+/.test(String(c.origen.url))) errores.push('origen.url debe ser una URL http(s) o null');

  const u = c.umbrales;
  for (const k of ['contrasteTexto', 'contrasteTextoGrande', 'objetivoPx', 'focoPx', 'textoMinimoPx', 'cicloMinimoMs', 'pesoPortadaKB', 'jsKB', 'fuentesMax', 'cpuLimitePct', 'cpuObjetivoPct', 'cpuMuestras', 'cpuVentanaMs'])
    if (!(typeof u[k] === 'number' && u[k] > 0)) errores.push(`umbrales.${k} debe ser un número positivo`);
  const alfaOk = (n) => typeof n === 'number' && n >= 0 && n <= 1;
  if (!(alfaOk(u.texturaAlfaMax) || (esObjeto(u.texturaAlfaMax) && Object.keys(u.texturaAlfaMax).every((k) => TEMAS.includes(k)) && TEMAS.every((k) => alfaOk(u.texturaAlfaMax[k])))))
    errores.push('umbrales.texturaAlfaMax debe estar entre 0 y 1, o ser { dark, light } con ambos entre 0 y 1');
  const tex = c.contraste.texturas;
  if (!(MODOS_TEXTURA.includes(tex) || (esObjeto(tex) && Object.keys(tex).every((k) => TEMAS.includes(k)) && TEMAS.every((k) => MODOS_TEXTURA.includes(tex[k])))))
    errores.push(`contraste.texturas debe ser ${MODOS_TEXTURA.join(', ')}, o { dark, light } con alguno de ellos`);
  if (u.textoBasePx !== null && !(typeof u.textoBasePx === 'number' && u.textoBasePx > 0)) errores.push('umbrales.textoBasePx debe ser un número positivo o null');
  if (!Array.isArray(u.anchosSinDesborde) || !u.anchosSinDesborde.every((n) => Number.isInteger(n) && n > 0)) errores.push('umbrales.anchosSinDesborde debe ser una lista de enteros positivos');

  const s = c.selectores;
  if (typeof s.objetivos !== 'string') errores.push('selectores.objetivos debe ser un selector CSS (texto)');
  for (const k of ['excluirObjetivos', 'decorativos', 'ignorarTexto']) if (!(Array.isArray(s[k]) && s[k].every((x) => typeof x === 'string'))) errores.push(`selectores.${k} debe ser una lista de selectores`);

  const d = c.datosSensibles;
  for (const [i, p] of d.patrones.entries()) {
    if (!p || typeof p.nombre !== 'string' || typeof p.regex !== 'string') { errores.push(`datosSensibles.patrones[${i}] necesita nombre y regex (texto)`); continue; }
    try { new RegExp(p.regex, p.flags ?? 'i'); } catch { errores.push(`datosSensibles.patrones[${i}].regex no es una expresión válida`); }
    if (p.ambitos !== undefined && !(Array.isArray(p.ambitos) && p.ambitos.length && p.ambitos.every((a) => AMBITOS.includes(a)))) errores.push(`datosSensibles.patrones[${i}].ambitos debe ser una lista con ${AMBITOS.join(', ')}`);
  }
  if (d.archivoPrivado !== null && !(typeof d.archivoPrivado === 'string' && d.archivoPrivado)) errores.push('datosSensibles.archivoPrivado debe ser una ruta (texto) o null');
  if (typeof d.archivoPrivadoObligatorio !== 'boolean') errores.push('datosSensibles.archivoPrivadoObligatorio debe ser true o false');
  for (const [i, r] of d.ignorar.entries()) { try { new RegExp(r, 'i'); } catch { errores.push(`datosSensibles.ignorar[${i}] no es una expresión válida`); } }
  if (!(Array.isArray(d.nombresProhibidos) && d.nombresProhibidos.every((x) => typeof x === 'string' && x))) errores.push('datosSensibles.nombresProhibidos debe ser una lista de textos');

  if (!(Array.isArray(c.dist.permitidos) && c.dist.permitidos.every((x) => typeof x === 'string'))) errores.push('dist.permitidos debe ser una lista de patrones');
  if (!(Array.isArray(c.dist.prohibidos) && c.dist.prohibidos.every((x) => typeof x === 'string'))) errores.push('dist.prohibidos debe ser una lista de patrones');
  for (const [k, v] of Object.entries(c.pruebas)) if (typeof v !== 'boolean') errores.push(`pruebas.${k} debe ser true o false`);
  if (errores.length) throw new ConfigInvalida(errores);
  return c;
}

export function cargarConfig(archivo) {
  let datos;
  try { datos = JSON.parse(readFileSync(archivo, 'utf8')); } catch (e) { throw new ConfigInvalida([`no pude leer ${archivo}: ${e.message}`]); }
  return normalizarConfig(datos);
}

export const paginasDe = (config, ...tipos) => config.paginas.filter((p) => !tipos.length || tipos.includes(p.tipo));
