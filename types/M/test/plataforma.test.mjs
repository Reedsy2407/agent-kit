// Toda afirmación sobre Android, sus herramientas y la tienda vive en types/M/PLATAFORMA-ANDROID.md con fuente oficial y fecha,
// o dice «No verificado» (ADR 0021). El resto del tipo M cita identificadores y no repite cifras ni plazos. No usa la red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');
const hechos = leer('types', 'M', 'PLATAFORMA-ANDROID.md');
const cuerpo = hechos.slice(hechos.indexOf('\n## '));
const filas = cuerpo.split('\n').filter((l) => l.startsWith('- '));
const ids = filas.map((l) => l.match(/^- \*\*\[(P-[A-Z]+-\d+)\]\*\* /)?.[1]);

const DOMINIOS = new Set(['developer.android.com', 'support.google.com', 'docs.partner.android.com', 'firebase.google.com', 'developers.google.com', 'reactnative.dev', 'docs.expo.dev', 'docs.flutter.dev', 'capacitorjs.com', 'www.w3.org', 'developer.chrome.com', 'docs.gradle.org', 'kotlinlang.org', 'services.gradle.org', 'dl.google.com', 'repo1.maven.org', 'docs.oracle.com']);
const seccion = (texto, titulo) => texto.split(new RegExp(`^## ${titulo}`, 'm'))[1]?.split(/^## /m)[0] ?? '';
/** Lo que cita hechos o habla de la plataforma fuera del documento de hechos. */
const consumidores = () => [
  ['types/M/GUIA-DECISION.md', leer('types', 'M', 'GUIA-DECISION.md')],
  ['types/M/plantillas/VIABILIDAD-TIPO-M.md', leer('types', 'M', 'plantillas', 'VIABILIDAD-TIPO-M.md')],
  ['types/M/ficha-infra.json', leer('types', 'M', 'ficha-infra.json')],
  ['types/M/manifest.json', leer('types', 'M', 'manifest.json')],
  ['types/M/esqueletos/CONTRATO.md', leer('types', 'M', 'esqueletos', 'CONTRATO.md')],
  ...['catalogo', 'ejemplos-adr-m'].flatMap((d) => readdirSync(join(raiz, 'types', 'M', d)).map((f) => [`types/M/${d}/${f}`, leer('types', 'M', d, f)])),
  ['consultar-catalogo, rama M', seccion(leer('types', 'B', 'skills', 'consultar-catalogo', 'SKILL.md'), 'Rama del tipo M')],
  ...['estudiar-referencia-movil', 'explorar-direcciones-movil'].map((s) => [`types/M/skills/${s}`, leer('types', 'M', 'skills', s, 'SKILL.md')]),
  ...['BRIEF-DISENO-MOVIL.md', 'REVISION-VISUAL-MOVIL.md'].map((p) => [`types/M/plantillas/${p}`, leer('types', 'M', 'plantillas', p)]),
  ['evaluar-viabilidad §8', seccion(leer('types', 'B', 'skills', 'evaluar-viabilidad', 'SKILL.md'), '8\\. Rama del tipo M')],
  ['elegir-stack-proporcional §9', seccion(leer('types', 'B', 'skills', 'elegir-stack-proporcional', 'SKILL.md'), '9\\. Rama del tipo M')],
];

test('cada fila de hechos tiene un identificador único y numerado sin huecos por grupo', () => {
  assert.ok(filas.length >= 60, `hay ${filas.length}`);
  assert.deepEqual(filas.filter((_, i) => !ids[i]), [], 'filas sin identificador');
  assert.equal(new Set(ids).size, ids.length, 'identificadores repetidos');
  const grupos = {};
  for (const id of ids) { const [, g, n] = id.split('-'); (grupos[g] ??= []).push(Number(n)); }
  for (const [g, ns] of Object.entries(grupos)) assert.deepEqual(ns, ns.map((_, i) => i + 1), `grupo ${g}`);
});

test('cada fila está en un solo estado: verificada con fecha y fuente oficial https, o «No verificado»', () => {
  const verificada = /Verificado el 2026-\d{2}-\d{2}(?::\s+https:\/\/\S+(?:(?:,| y)\s+https:\/\/\S+)*| en el README oficial del proyecto \(dirección en el ADR 0021 del kit\)\.| en el documento de arquitectura del proyecto \(dirección en el ADR 0024 del kit\)\.)$/;
  let no = 0;
  for (const f of filas) {
    const si = verificada.test(f);
    const pendiente = /No verificado/.test(f);
    assert.ok(si !== pendiente, `estado ambiguo o ausente: ${f.slice(0, 40)}`);
    if (pendiente) { no += 1; assert.doesNotMatch(f, /https?:\/\//, `una fila sin verificar no se apoya en una dirección: ${f.slice(0, 40)}`); }
    for (const [url] of f.matchAll(/https?:\/\/[^\s,]+/g)) { const u = new URL(url); assert.equal(u.protocol, 'https:', url); assert.ok(DOMINIOS.has(u.hostname), `fuente no oficial: ${u.hostname}`); }
  }
  assert.ok(no >= 8, 'lo que no se pudo comprobar se declara');
  assert.match(hechos, /No es asesoría legal/);
  assert.match(hechos, /a través de una herramienta que las extrae y las resume/);
});

test('los puntos pedidos están: tipo y permiso del servicio de ubicación, arquitectura, conducción, pagos, publicación', () => {
  for (const x of [/FOREGROUND_SERVICE_LOCATION/, /android:foregroundServiceType/, /POST_NOTIFICATIONS/, /ACCESS_BACKGROUND_LOCATION/, /developer\.android\.com\/topic\/architecture\/recommendations/, /76 × 76 dp/, /Solo de consumo/, /eliminación de la cuenta/, /prueba cerrada/, /Android App Bundle/, /Now in Android/]) assert.match(hechos, x, String(x));
  const fila = (id) => filas[ids.indexOf(id)];
  assert.match(fila('P-CON-5'), /decisión del kit\*\*, no una exigencia de la fuente[\s\S]*Verificado el \d{4}-\d{2}-\d{2}: https:/);
  for (const id of ['P-CON-6', 'P-CON-8', 'P-MAR-3']) assert.match(fila(id), /No verificado/, id);
  assert.match(filas.find((f) => f.includes('[P-FGS-11]')), /fabricante[\s\S]*No verificado/i);
});

test('mensajería push: prioridades, temas, cuotas, arranque en segundo plano y control del servidor verificados; lo no comprobado, marcado', () => {
  const fila = (n) => filas[ids.indexOf(`P-RT-${n}`)];
  const esperado = {
    2: [/La normal se entrega/, /Doze/, /La alta/, /rebajarse a normal/, /getOriginalPriority/],
    3: [/2000 temas/, /3000 por segundo/, /latencia/, /Cualquier app cliente puede suscribirse/],
    4: [/sin costo/, /600 000/, /240 por minuto/, /429/],
    6: [/\[P-FGS-3\]/, /\[P-FGS-4\]/, /PRIORITY_HIGH/, /\*\*no\*\* levanta/],
    7: [/darlo de baja/, /listar los temas/, /credenciales del proyecto/],
    18: [/se contradicen/, /campo de prioridad[\s\S]*se indica en cada envío/],
    19: [/identificador de la instalación/, /nombre del tema/],
  };
  for (const [n, res] of Object.entries(esperado)) {
    assert.match(fila(n), /Verificado el \d{4}-\d{2}-\d{2}: https:\/\/(firebase\.google\.com|developer\.android\.com)\//, `P-RT-${n}`);
    for (const x of res) assert.match(fila(n), x, `P-RT-${n} ${x}`);
  }
  for (const n of [5, 8, 11, 16, 17]) assert.match(fila(n), /No verificado/, `P-RT-${n}`);
  assert.match(fila(11), /Deducción/, 'lo deducido se dice como deducción y sin darlo por verificado');
});

test('la guía no deja la mensajería «para cuando se elija» y avisa de que un tema no oculta la zona ni controla el acceso', () => {
  const guia = leer('types', 'M', 'GUIA-DECISION.md');
  assert.doesNotMatch(guia, /al elegirlo/);
  const requisito = (n) => guia.split(new RegExp(`^### R${n}\\. `, 'm'))[1].split(/^##/m)[0];
  assert.match(requisito(1), /Sin el permiso de ubicación en segundo plano, un mensaje push no permite/);
  assert.match(requisito(2), /Un tema por zona no esconde la zona/);
  assert.match(requisito(3), /Una sanción no se apoya en dar de baja de un tema/);
  assert.match(requisito(4), /no viaja por temas/);
  assert.match(requisito(4), /ámbito pedido es único e igual para todos/, 'una petición autenticada no puede llevar la zona de la persona');
  assert.match(requisito(2), /exportación de datos de entrega puede juntar equipo y tema/);
});

test('todo identificador citado existe, y los rangos «[a] a [b]» son del mismo grupo y en orden', () => {
  const conocidos = new Set(ids);
  let citas = 0;
  for (const [nombre, texto] of consumidores()) {
    for (const [, id] of texto.matchAll(/\[(P-[A-Z]+-\d+)\]/g)) { citas += 1; assert.ok(conocidos.has(id), `${nombre} cita ${id}, que no existe`); }
    for (const [, a, na, b, nb] of texto.matchAll(/\[P-([A-Z]+)-(\d+)\] a \[P-([A-Z]+)-(\d+)\]/g)) { assert.equal(a, b, `${nombre}: rango entre grupos`); assert.ok(Number(na) < Number(nb), `${nombre}: rango al revés`); }
    for (const [id] of texto.matchAll(/\bP-[A-Z]+-\d+\b/g)) assert.ok(conocidos.has(id), `${nombre}: ${id}`);
  }
  assert.ok(citas > 60, `solo ${citas} citas`);
});

test('una sola fuente: fuera del documento de hechos no hay direcciones, cifras de plataforma, fechas ni plazos', () => {
  const unidad = '(?:dp|dólares|segundos|minutos|horas|h|días|semanas|meses|años|probadores|caracteres|temas|MB|KB|GB)(?![\\p{L}])';
  const numero = '(?:\\d+(?:[.,]\\d+)?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|catorce|quince|veinte|treinta)';
  const fecha = '\\b\\d{4}-\\d{2}-\\d{2}\\b|\\b\\d{1,2} de (?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)';
  const cifra = new RegExp(`(?<![\\p{L}\\p{N}])${numero}\\s?${unidad}|${fecha}|\\bAndroid \\d+|\\bAPI \\d+|[$€]\\s?\\d|\\d+\\s?%`, 'iu');
  for (const malo of ['76 dp', '25 dólares', 'siete días', 'doce probadores', '6 h', 'dos años', 'Android 14', 'API 36', '1 de febrero', '2027-02-01', '10 %', '$ 5']) assert.match(malo, cifra, `la expresión debe ver «${malo}»`);
  for (const bueno of ['Android primero', 'dos alternativas', 'sección 8', 'R1 a R7', '[P-FGS-1] a [P-FGS-14]', 'una o dos personas']) assert.doesNotMatch(bueno, cifra, bueno);
  for (const [nombre, texto] of consumidores()) texto.split('\n').forEach((l, i) => {
    assert.doesNotMatch(l, /https?:\/\//, `${nombre}:${i + 1} dirección`);
    assert.doesNotMatch(l, cifra, `${nombre}:${i + 1} cifra o plazo: cita el identificador`);
  });
});

test('fuera del esqueleto, lo que el tipo M instala no menciona el alojamiento de repositorios ni trae código', () => {
  const listar = (d) => readdirSync(d).flatMap((n) => { const r = join(d, n); return statSync(r).isDirectory() ? listar(r) : [r]; });
  /* El esqueleto (código) y su verificador tienen sus propias pruebas en esqueleto.test.mjs (ADR 0023). */
  for (const a of listar(join(raiz, 'types', 'M')).filter((r) => !/^(test|esqueletos)/.test(relative(join(raiz, 'types', 'M'), r)))) {
    const t = readFileSync(a, 'utf8');
    assert.doesNotMatch(t, /github/i, relative(raiz, a));
    assert.doesNotMatch(t, /```/, `${relative(raiz, a)}: bloque de código`);
    assert.match(a, /\.(md|json)$/, `${relative(raiz, a)}: fuera de esqueletos/ el tipo M solo trae documentos`);
  }
});
