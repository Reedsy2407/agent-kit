// Datos sensibles: patrones configurables (teléfonos, nombres que no se publican, lo que el proyecto añada) buscados
// en el texto visible, en los atributos href/src/alt/title y en el código fuente de cada página. Los nombres reales no
// tienen por qué estar en el front.config.json versionado: pueden venir de un archivo local ignorado por git
// (`datosSensibles.archivoPrivado`, por defecto tests/front/datos-privados.json).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { abrir } from '../lib/navegador.mjs';
import { paginasDe, AMBITOS } from '../lib/config.mjs';

export const id = 'datos';
export const nombre = 'datos sensibles';

// Siete o más dígitos seguidos (con espacios, puntos, guiones o paréntesis) se leen como un teléfono.
export const TELEFONO = /(?:\+?\d[\s().-]?){7,}/;

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Los patrones que aplican, ya como expresiones: [{ nombre, re, ambitos }]. Con `ambito`, solo los que lo cubren. */
export function patronesDe(config, { telefonos = true, ambito } = {}) {
  const d = config.datosSensibles;
  const lista = [];
  /* Los números de teléfono solo se buscan en el texto visible: en atributos y código hay rutas, fechas y trazados con muchos dígitos. */
  if (d.telefonos && telefonos) lista.push({ nombre: 'teléfono', re: TELEFONO, ambitos: ['visible'] });
  for (const p of d.patrones) lista.push({ nombre: p.nombre, re: new RegExp(p.regex, p.flags ?? 'i'), ambitos: p.ambitos ?? AMBITOS });
  for (const n of d.nombresProhibidos) lista.push({ nombre: `nombre prohibido «${n}»`, re: new RegExp(escapar(n), 'i'), ambitos: AMBITOS });
  return ambito ? lista.filter((p) => p.ambitos.includes(ambito)) : lista;
}

/** Coincidencias en un texto, descartando lo que el proyecto marca como inocuo (años, versiones…). */
export function buscarDatos(texto, config, opciones) {
  const ignorar = config.datosSensibles.ignorar.map((r) => new RegExp(r, 'i'));
  /* Las fechas ISO (2026-10-21) no son teléfonos. */
  const sinFechas = texto.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ');
  const limpio = ignorar.reduce((t, re) => t.replace(new RegExp(re.source, 'gi'), ' '), sinFechas);
  const hallazgos = [];
  for (const { nombre: n, re } of patronesDe(config, opciones)) {
    const m = limpio.match(re);
    if (m) hallazgos.push(`${n}: «${m[0].trim().slice(0, 30)}»`);
  }
  return hallazgos;
}

/**
 * Lee el archivo de datos privados. Devuelve { estado, ... }:
 * 'no-configurado' (la configuración no pide archivo), 'ausente', 'invalido' (con `errores`) u 'ok' (con `nombresProhibidos`
 * y `patrones`). El formato es { "nombresProhibidos": [...], "patrones": [{ nombre, regex, flags?, ambitos? }] }.
 */
export function leerPrivados(config, proyecto = process.cwd()) {
  const ruta = config.datosSensibles.archivoPrivado;
  if (!ruta) return { estado: 'no-configurado' };
  const archivo = resolve(proyecto, ruta);
  if (!existsSync(archivo)) return { estado: 'ausente', ruta };
  let datos;
  try { datos = JSON.parse(readFileSync(archivo, 'utf8')); } catch (e) { return { estado: 'invalido', ruta, errores: [`no es JSON válido: ${e.message}`] }; }
  const errores = [];
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return { estado: 'invalido', ruta, errores: ['debe ser un objeto con nombresProhibidos y/o patrones'] };
  for (const k of Object.keys(datos)) if (!['_ayuda', 'nombresProhibidos', 'patrones'].includes(k)) errores.push(`clave desconocida: «${k}»`);
  const nombres = datos.nombresProhibidos ?? [];
  const patrones = datos.patrones ?? [];
  if (!(Array.isArray(nombres) && nombres.every((x) => typeof x === 'string' && x))) errores.push('nombresProhibidos debe ser una lista de textos');
  if (!Array.isArray(patrones)) errores.push('patrones debe ser una lista');
  else patrones.forEach((p, i) => {
    if (!p || typeof p.nombre !== 'string' || typeof p.regex !== 'string') { errores.push(`patrones[${i}] necesita nombre y regex (texto)`); return; }
    try { new RegExp(p.regex, p.flags ?? 'i'); } catch { errores.push(`patrones[${i}].regex no es una expresión válida`); }
    if (p.ambitos !== undefined && !(Array.isArray(p.ambitos) && p.ambitos.length && p.ambitos.every((a) => AMBITOS.includes(a)))) errores.push(`patrones[${i}].ambitos debe ser una lista con ${AMBITOS.join(', ')}`);
  });
  if (errores.length) return { estado: 'invalido', ruta, errores };
  return { estado: 'ok', ruta, nombresProhibidos: nombres, patrones };
}

/** Una copia de la configuración con los datos privados sumados a los públicos (sin tocar la original). */
export function conPrivados(config, privados) {
  if (privados.estado !== 'ok') return config;
  const d = config.datosSensibles;
  return { ...config, datosSensibles: { ...d, nombresProhibidos: [...d.nombresProhibidos, ...privados.nombresProhibidos], patrones: [...d.patrones, ...privados.patrones] } };
}

export async function run({ browser, base, report, config: configPublica, proyecto = process.cwd() }) {
  const privados = leerPrivados(configPublica, proyecto);
  const config = conPrivados(configPublica, privados);
  if (privados.estado === 'ausente') {
    const texto = `no existe ${privados.ruta}: los nombres y patrones privados no se comprueban. Créalo (está ignorado por git) con { "nombresProhibidos": [], "patrones": [] }`;
    if (config.datosSensibles.archivoPrivadoObligatorio) report.check(`datos privados (${privados.ruta})`, false, texto);
    else report.aviso(`datos privados (${privados.ruta})`, texto);
  } else if (privados.estado === 'invalido') report.check(`datos privados (${privados.ruta}) válidos`, false, privados.errores.join('; '));
  else if (privados.estado === 'ok') {
    const n = privados.nombresProhibidos.length + privados.patrones.length;
    if (n) report.info(`datos privados (${privados.ruta})`, `${n} nombre(s) o patrón(es) privados en uso`);
    else report.aviso(`datos privados (${privados.ruta})`, 'el archivo existe pero está vacío: no se busca ningún nombre privado');
  }

  const hay = patronesDe(config);
  report.check('hay patrones de datos sensibles configurados', hay.length > 0, hay.map((x) => x.nombre).join(', '));
  if (config.datosSensibles.telefonos) {
    report.check('el patrón de teléfonos detecta «+51 999 888 777» y «(01) 234-5678»', TELEFONO.test('+51 999 888 777') && TELEFONO.test('(01) 234-5678'));
    report.check('el patrón de teléfonos deja pasar años, versiones y cifras comunes', !['abril 2026 – actualidad', 'versión 3.3.5', '2023 – 2025', '64/100'].some((s) => TELEFONO.test(s)));
  }
  for (const p of paginasDe(config)) {
    const { context, page } = await abrir(browser, base, p.ruta);
    const fuentes = await page.evaluate(() => ({
      visible: document.body.innerText,
      atributos: [...document.querySelectorAll('[href],[src],[alt],[title],[aria-label]')].flatMap((e) => ['href', 'src', 'alt', 'title', 'aria-label'].map((a) => e.getAttribute(a)).filter(Boolean)).join('\n'),
      codigo: document.documentElement.outerHTML,
    }));
    for (const [donde, texto] of Object.entries(fuentes)) {
      const ambito = donde === 'visible' ? 'visible' : donde === 'atributos' ? 'atributos' : 'codigo';
      const encontrados = buscarDatos(texto, config, { ambito });
      /* En los atributos, además, cualquier enlace de teléfono o mensajería. */
      if (config.datosSensibles.telefonos && donde === 'atributos' && /^(tel:|sms:|https?:\/\/(wa\.me|api\.whatsapp\.com))/im.test(texto)) encontrados.push('enlace de teléfono o mensajería');
      report.check(`${p.ruta}: sin datos sensibles en ${donde === 'visible' ? 'el texto visible' : donde === 'atributos' ? 'los atributos' : 'el código fuente'}`, encontrados.length === 0, encontrados.join('; '));
    }
    await context.close();
  }
}
