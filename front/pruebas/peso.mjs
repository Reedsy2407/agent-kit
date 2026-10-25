// Presupuesto: peso de la portada, JavaScript, ninguna petición a otros orígenes y fuentes (máximo y con licencia
// anotada cuando se indica un registro de licencias: por el nombre del archivo o por la familia y una referencia de licencia).
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { abrir, mismoOrigen } from '../lib/navegador.mjs';
import { paginasDe } from '../lib/config.mjs';

export const id = 'peso';
export const nombre = 'peso, dependencias y fuentes';

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const SUFIJOS = /^(latin|latin-ext|cyrillic|cyrillic-ext|greek|greek-ext|vietnamese|arabic|hebrew|devanagari|symbols|variable|normal|italic|oblique|regular|thin|extralight|light|medium|semibold|bold|extrabold|black|\d{3}|wght|subset)$/i;
const LICENCIA = /\b(OFL|SIL|Open Font License|MIT|Apache|CC0|GPL|licen[cs]e|licencia)\b/i;
const plano = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/** La familia de un archivo de fuente: «geist-mono-latin-400-normal.woff2» → «geist-mono». */
export function familiaDeFuente(archivo) {
  const partes = archivo.replace(/\.[^.]+$/, '').split(/[-_\s]+/).filter(Boolean);
  const i = partes.findIndex((p, n) => n > 0 && SUFIJOS.test(p));
  return (i > 0 ? partes.slice(0, i) : partes).join('-');
}

/**
 * ¿Está la fuente en el registro de licencias? Vale el nombre del archivo tal cual, o una línea que nombre la familia
 * («Geist Mono», «geist-mono») y mencione una licencia (OFL, MIT, Apache, «licencia»…): así un registro normal no tiene
 * que repetir el nombre de archivo. Devuelve 'archivo', 'familia' o null.
 */
export function licenciaAnotada(registro, archivo) {
  const base = archivo.replace(/\.[^.]+$/, '');
  if (registro.includes(base)) return 'archivo';
  const familia = plano(familiaDeFuente(archivo));
  if (familia.length >= 3 && registro.split(/\r?\n/).some((l) => plano(l).includes(familia) && LICENCIA.test(l))) return 'familia';
  return null;
}

export async function run({ browser, base, report, config, proyecto = process.cwd() }) {
  const u = config.umbrales;
  const licencias = config.fuentes.licencias ? resolve(proyecto, config.fuentes.licencias) : null;
  const textoLicencias = licencias && existsSync(licencias) ? readFileSync(licencias, 'utf8') : null;
  if (licencias && textoLicencias === null) report.check(`registro de licencias de fuentes (${config.fuentes.licencias})`, false, 'no existe');

  for (const p of paginasDe(config)) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const tamanos = [];
    const externos = [];
    const pendientes = [];
    const sinMedir = [];
    /* Se mira cada petición (también las que fallan, como un origen que no resuelve), no solo las respuestas. */
    page.on('request', (rq) => { const url = rq.url(); if (!mismoOrigen(url, base) && !/^(data|blob|about):/.test(url)) externos.push(url); });
    page.on('response', (r) => {
      pendientes.push((async () => {
        const url = r.url();
        if (!mismoOrigen(url, base)) return;
        /* Tamaño: content-length si lo hay; si no, el cuerpo. Si no se puede medir, se dice (no cuenta como 0 bytes). */
        let bytes = Number(r.headers()['content-length']);
        if (!Number.isFinite(bytes)) {
          try { bytes = (await r.body()).length; } catch { sinMedir.push(url.slice(base.length)); return; }
        }
        tamanos.push({ url: url.slice(base.length), tipo: r.headers()['content-type'] || '', bytes });
      })());
    });
    await page.goto(base + p.ruta, { waitUntil: 'networkidle' });
    for (let n = -1; n !== pendientes.length;) { n = pendientes.length; await Promise.all(pendientes); }
    const jsEnLinea = await page.evaluate(() => [...document.scripts].filter((s) => !s.src).reduce((n, s) => n + new Blob([s.textContent]).size, 0));
    await ctx.close();

    report.check(`${p.ruta}: se pudo medir todo lo que se descargó`, sinMedir.length === 0, sinMedir.slice(0, 3).join(', '));
    const total = tamanos.reduce((n, s) => n + s.bytes, 0);
    const js = tamanos.filter((s) => s.tipo.includes('javascript')).reduce((n, s) => n + s.bytes, 0) + jsEnLinea;
    const fuentes = tamanos.filter((s) => /\.(woff2?|ttf|otf)$/i.test(s.url) || s.tipo.startsWith('font/'));
    if (p.tipo === 'portada') report.check(`${p.ruta}: portada ≤ ${u.pesoPortadaKB} KB`, total <= u.pesoPortadaKB * 1024, kb(total));
    else report.info(`${p.ruta}: peso total`, kb(total));
    report.check(`${p.ruta}: JS ≤ ${u.jsKB} KB`, js <= u.jsKB * 1024, kb(js));
    report.check(`${p.ruta}: sin peticiones a otros orígenes`, externos.length === 0, externos.slice(0, 3).join(', '));
    report.check(`${p.ruta}: máximo ${u.fuentesMax} archivos de fuente`, fuentes.length <= u.fuentesMax, String(fuentes.length));
    if (textoLicencias !== null) {
      const sin = fuentes.map((f) => basename(f.url)).filter((n) => !licenciaAnotada(textoLicencias, n)).map((n) => n.replace(/\.[^.]+$/, ''));
      report.check(`${p.ruta}: cada fuente tiene su licencia anotada en ${config.fuentes.licencias}`, sin.length === 0, sin.join(', '));
    }
  }
}
