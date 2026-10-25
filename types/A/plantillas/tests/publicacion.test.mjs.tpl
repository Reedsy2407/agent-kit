// Prueba de la publicación: dist/ contiene solo lo permitido y la CSP no tiene violaciones en las páginas generadas.
// Genera dist/ con scripts/publish.mjs y lo inspecciona; no usa la red ni dependencias.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const archivos = (dir, salida = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) archivos(p, salida);
    else salida.push(relative(DIST, p).replaceAll('\\', '/'));
  }
  return salida;
};
const paginas = () => archivos(DIST).filter((f) => f.endsWith('.html'));
const cabeceras = () => readFileSync(join(DIST, '_headers'), 'utf8');
const csp = () => cabeceras().match(/Content-Security-Policy:\s*(.+)/)[1];

/* Evaluador mínimo de CSP: lo justo para decidir si un script en línea, uno externo o un atributo de evento se ejecutaría. */
const directivas = (politica) => new Map(politica.split(';').map((d) => d.trim().split(/\s+/)).filter((p) => p[0]).map(([n, ...v]) => [n, v]));
const fuentesDe = (d, ...nombres) => { for (const n of nombres) if (d.has(n)) return d.get(n); return d.get('default-src') ?? []; };
const hashDe = (cuerpo) => `'sha256-${createHash('sha256').update(cuerpo).digest('base64')}'`;
export const permiteScriptEnLinea = (politica, cuerpo) => { const f = fuentesDe(directivas(politica), 'script-src-elem', 'script-src'); return f.includes("'unsafe-inline'") || f.includes(hashDe(cuerpo)); };
export const permiteScriptExterno = (politica, ruta) => { const f = fuentesDe(directivas(politica), 'script-src-elem', 'script-src'); return !/^[a-z]+:|^\/\//i.test(ruta) && f.includes("'self'"); };
export const permiteAtributoDeEvento = (politica) => fuentesDe(directivas(politica), 'script-src-attr', 'script-src').includes("'unsafe-inline'");
export const permiteEstiloEnLinea = (politica) => fuentesDe(directivas(politica), 'style-src-elem', 'style-src').includes("'unsafe-inline'");
export const permiteAtributoStyle = (politica) => fuentesDe(directivas(politica), 'style-src-attr', 'style-src').includes("'unsafe-inline'");

before(() => {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'publish.mjs')], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('dist/ no contiene nada que no deba publicarse', () => {
  const prohibido = /(^|\/)(design|kit|tests|\.claude|scripts|node_modules|tasks|\.wrangler|\.git)(\/|$)|(^|\/)(CLAUDE|HANDOFF)\.md$|(^|\/)package(-lock)?\.json$|(^|\/)wrangler\.jsonc?$|captura|screenshot|\.env/i;
  for (const f of archivos(DIST)) assert.doesNotMatch(f, prohibido, `dist/ incluye ${f}`);
});

test('dist/ tiene la portada, el 404 y las cabeceras', () => {
  const lista = archivos(DIST);
  for (const f of ['index.html', '404.html', '_headers']) assert.ok(lista.includes(f), `falta ${f}`);
});

test('el 404 usa solo rutas absolutas desde la raíz', () => {
  const html = readFileSync(join(DIST, '404.html'), 'utf8');
  for (const [, ruta] of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) assert.match(ruta, /^(\/|#|https?:|mailto:|tel:|data:)/, `ruta relativa en el 404: ${ruta}`);
});

test('_headers no tiene comentarios y trae las cabeceras de seguridad', () => {
  const t = cabeceras();
  assert.doesNotMatch(t, /^\s*#/m);
  for (const x of [/X-Content-Type-Options: nosniff/, /Referrer-Policy: \S+/, /X-Frame-Options: DENY/, /Permissions-Policy: \S+/]) assert.match(t, x);
  assert.doesNotMatch(t, /\{\{/, 'quedó un marcador sin sustituir');
});

test('la CSP no admite scripts en línea sin hash', () => {
  const d = directivas(csp());
  assert.ok(!(d.get('script-src') ?? []).includes("'unsafe-inline'"));
  assert.ok(!(d.get('script-src') ?? []).includes("'unsafe-eval'"));
  assert.ok((d.get('default-src') ?? []).includes("'none'"));
});

test('la CSP no da violaciones en las páginas generadas', () => {
  const politica = csp();
  for (const f of paginas()) {
    const html = readFileSync(join(DIST, f), 'utf8');
    for (const [, cuerpo] of html.matchAll(/<script(?![^>]*\ssrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)) assert.ok(permiteScriptEnLinea(politica, cuerpo), `${f}: script en línea sin hash`);
    for (const [, ruta] of html.matchAll(/<script[^>]+\bsrc="([^"]+)"/g)) assert.ok(permiteScriptExterno(politica, ruta), `${f}: script externo ${ruta}`);
    if (/\son[a-z]+\s*=\s*["']/i.test(html.replace(/<script(?![^>]*\ssrc\s*=)[^>]*>[\s\S]*?<\/script>/gi, ''))) assert.ok(permiteAtributoDeEvento(politica), `${f}: atributo de evento (onclick…) bloqueado`);
    if (/href\s*=\s*["']\s*javascript:/i.test(html)) assert.fail(`${f}: enlace javascript:`);
    if (/<style[\s>]/i.test(html)) assert.ok(permiteEstiloEnLinea(politica), `${f}: <style> en línea bloqueado`);
    if (/\sstyle\s*=\s*["']/i.test(html)) assert.ok(permiteAtributoStyle(politica), `${f}: atributo style bloqueado (añade style-src-attr si hace falta)`);
  }
});

test('la CSP bloquea un script inyectado', () => {
  const politica = csp();
  assert.equal(permiteScriptEnLinea(politica, 'alert(1)'), false, 'script en línea inyectado');
  assert.equal(permiteScriptExterno(politica, 'https://atacante.example/x.js'), false, 'script de otro origen');
  assert.equal(permiteScriptExterno(politica, '//atacante.example/x.js'), false, 'script de otro origen sin esquema');
  assert.equal(permiteAtributoDeEvento(politica), false, 'atributo de evento inyectado');
});
