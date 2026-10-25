// scripts/sondeo-acceso.mjs contra un servidor local (nunca la red): 200, 401, 403, timeout, redirección, contenido no JSON,
// y las garantías de seguridad (sin credenciales, solo lectura, solo si la ficha lo permite).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sondear, validarDependencias, urlSegura, formaDeJson, redactarBorrador, main, SondeoInvalido } from '../plantillas/scripts/sondeo-acceso.mjs';
import { lineasConHuella } from '../../../core/test/lib/pureza.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

async function servidor(t) {
  const vistas = [];
  const s = createServer((req, res) => {
    vistas.push({ metodo: req.method, url: req.url, cabeceras: req.headers });
    const ruta = req.url.split('?')[0];
    if (ruta === '/ok') { res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' }); return res.end(JSON.stringify({ distrito: 'x', total: 3, valores: [1, 2], secreto: 'NO-COPIAR' })); }
    if (ruta === '/lista') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify([{ a: 1, b: 2 }, { a: 3 }])); }
    if (ruta === '/auth') { res.writeHead(401, { 'www-authenticate': 'Bearer realm="api"' }); return res.end('no'); }
    if (ruta === '/prohibido') { res.writeHead(403); return res.end('no'); }
    if (ruta === '/region') { res.writeHead(451); return res.end('no'); }
    if (ruta === '/lento') { return setTimeout(() => { res.writeHead(200); res.end('tarde'); }, 800); }
    if (ruta === '/redir') { res.writeHead(302, { location: 'https://otro.example/destino?x=1' }); return res.end(); }
    if (ruta === '/html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<html>hola</html>'); }
    if (ruta === '/falso-json') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{no es json'); }
    if (ruta === '/enorme') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(`[${'1,'.repeat(200 * 1024)}1]`); }
    if (ruta === '/caido') { res.writeHead(503); return res.end('x'); }
    res.writeHead(404); res.end();
  });
  await new Promise((ok) => s.listen(0, '127.0.0.1', ok));
  t.after(() => new Promise((ok) => { s.closeAllConnections?.(); s.close(ok); }));
  return { base: `http://127.0.0.1:${s.address().port}`, vistas };
}
const salida = () => { let x = ''; return { write: (y) => { x += y; }, get texto() { return x; } }; };
const dep = (base, ruta, extra = {}) => ({ nombre: `dep ${ruta}`, url: base + ruta, ...extra });

test('200 JSON: estado, latencia, tipo de contenido y forma (sin copiar los datos)', async (t) => {
  const { base } = await servidor(t);
  const o = await sondear(dep(base, '/ok', { espera: { estado: 200, tipoContenido: 'application/json' }, requiereCredencial: false }));
  assert.equal(o.estado, 200);
  assert.equal(o.tipoContenido, 'application/json');
  assert.ok(o.ms >= 0);
  assert.match(o.forma, /objeto con 4 clave\(s\): distrito, total, valores, secreto/);
  assert.deepEqual(o.fallos, []);
  assert.ok(!JSON.stringify(o).includes('NO-COPIAR'), 'los valores de la respuesta no se copian');
  assert.match((await sondear(dep(base, '/lista'))).forma, /lista de 2 elemento\(s\); cada elemento es un objeto con claves como a, b/);
});

test('401: exige autenticación y, si se declaró que la exige, coincide con lo esperado', async (t) => {
  const { base } = await servidor(t);
  const o = await sondear(dep(base, '/auth', { requiereCredencial: true }));
  assert.equal(o.estado, 401);
  assert.match(o.autenticacion, /WWW-Authenticate/);
  assert.deepEqual(o.fallos, []);
  const publico = await sondear(dep(base, '/auth', { requiereCredencial: false }));
  assert.match(publico.fallos.join(), /se declaró público pero exige autenticación/);
});

test('403 y 451: posible bloqueo por región o política, sin afirmarlo', async (t) => {
  const { base } = await servidor(t);
  const o = await sondear(dep(base, '/prohibido'));
  assert.match(o.autenticacion, /403/);
  assert.match(o.advertencias.join(), /región o por política del servicio \(no confirmado\)/);
  assert.match(o.region, /no respondió con éxito/);
  assert.match((await sondear(dep(base, '/region'))).advertencias.join(), /región/);
});

test('timeout: un fallo claro y acotado, no un cuelgue', async (t) => {
  const { base } = await servidor(t);
  const t0 = Date.now();
  const o = await sondear(dep(base, '/lento'), { timeoutMs: 200 });
  assert.match(o.error, /sin respuesta en 200 ms/);
  assert.ok(Date.now() - t0 < 700);
  const sinServidor = await sondear({ nombre: 'x', url: 'http://127.0.0.1:1/' }, { timeoutMs: 500 });
  assert.match(sinServidor.error, /no se pudo conectar/);
});

test('redirección: no se sigue; se informa el origen de destino y no su consulta', async (t) => {
  const { base, vistas } = await servidor(t);
  const o = await sondear(dep(base, '/redir', { espera: { estado: 200 } }));
  assert.equal(o.estado, 302);
  assert.equal(o.redireccion, 'https://otro.example');
  assert.match(o.advertencias.join(), /no se sigue/);
  assert.match(o.fallos.join(), /se esperaba el estado 200 y respondió 302/);
  assert.equal(vistas.length, 1, 'una sola petición');
});

test('contenido que no es JSON (aunque diga serlo) o enorme: se informa sin romper', async (t) => {
  const { base } = await servidor(t);
  const html = await sondear(dep(base, '/html', { espera: { tipoContenido: 'application/json' } }));
  assert.match(html.forma, /contenido no JSON \(text\/html\)/);
  assert.match(html.fallos.join(), /se esperaba contenido application\/json y llegó text\/html/);
  assert.match((await sondear(dep(base, '/falso-json'))).advertencias.join(), /no se puede interpretar/);
  const enorme = await sondear(dep(base, '/enorme'));
  assert.match(enorme.advertencias.join(), /pasa de 256 KB/);
  assert.equal(enorme.forma, undefined);
});

test('solo lectura y sin credenciales: una petición GET/HEAD, sin Authorization, Cookie ni cuerpo', async (t) => {
  const { base, vistas } = await servidor(t);
  await sondear(dep(base, '/ok'));
  await sondear(dep(base, '/ok', { metodo: 'HEAD' }));
  assert.deepEqual(vistas.map((v) => v.metodo), ['GET', 'HEAD']);
  for (const v of vistas) { assert.equal(v.cabeceras.authorization, undefined); assert.equal(v.cabeceras.cookie, undefined); assert.match(v.cabeceras['user-agent'], /agent-kit-sondeo/); }
});

test('el archivo no admite credenciales: claves desconocidas, usuario en la URL, claves en la consulta, redes privadas, métodos de escritura', () => {
  const malo = (d) => () => validarDependencias({ dependencias: [{ nombre: 'x', url: 'https://api.ejemplo.org/v1', ...d }] });
  assert.throws(malo({ token: 'abc' }), (e) => e instanceof SondeoInvalido && /clave desconocida «token»/.test(e.message));
  assert.throws(malo({ cabeceras: { authorization: 'Bearer x' } }), /clave desconocida «cabeceras»/);
  assert.throws(malo({ url: 'https://u:p@api.ejemplo.org/' }), /usuario o contraseña/);
  assert.throws(malo({ url: 'https://api.ejemplo.org/v1?api_key=123' }), /credencial/);
  assert.throws(malo({ url: 'https://api.ejemplo.org/v1?x=1&access_token=1' }), /credencial/);
  assert.throws(malo({ url: 'http://api.ejemplo.org/' }), /https/);
  assert.throws(malo({ url: 'https://169.254.169.254/latest' }), /red privada, local/);
  assert.throws(malo({ url: 'https://192.168.0.5/' }), /privada/);
  for (const u of ['https://127.0.0.2/', 'https://100.64.0.1/', 'https://[fd00::1]/', 'https://[fe80::1]/', 'https://[::ffff:10.0.0.1]/', 'https://[2001:db8::1]/']) assert.throws(malo({ url: u }), /privada|IPv6/, u);
  assert.throws(malo({ metodo: 'POST' }), /GET o HEAD/);
  assert.throws(malo({ importancia: 'urgente' }), /importancia/);
  assert.throws(() => validarDependencias({ dependencias: [], token: 'x' }), /clave desconocida «token»/);
  assert.throws(() => validarDependencias({ dependencias: Array.from({ length: 31 }, (_, i) => ({ nombre: `n${i}`, url: 'https://a.example/' })) }), /demasiadas/);
  assert.doesNotThrow(malo({ url: 'https://api.ejemplo.org/v1?pagina=2&limite=10', metodo: 'HEAD' }));
  assert.equal(urlSegura('http://localhost:3000/x').hostname, 'localhost');
});

test('el borrador: tabla de la plantilla, advertencia explícita de términos y legalidad, sin consulta ni valores', async (t) => {
  const { base } = await servidor(t);
  const deps = [dep(base, '/ok?pagina=2', { nombre: 'Datos', tipo: 'datos', importancia: 'crítica', espera: { estado: 200 } }), dep(base, '/auth', { tipo: 'API', importancia: 'importante', requiereCredencial: true }), dep(base, '/caido')];
  const obs = [];
  for (const d of deps) obs.push(await sondear(d));
  const md = redactarBorrador(deps, obs, { fecha: '2026-10-23' });
  assert.match(md, /NO verifica los términos de uso, las licencias ni la legalidad/);
  assert.match(md, /\| Dependencia \| Tipo \| Importancia \| Evidencia de acceso \| Fecha \| Estado \|/);
  assert.match(md, /GET http:\/\/127\.0\.0\.1:\d+\/ok → 200 en \d+ ms; application\/json; objeto con 4 clave/);
  assert.match(md, /sondeo correcto; faltan términos de uso, credencial y legalidad/);
  assert.match(md, /la consulta de la URL se omite/);
  assert.ok(!md.includes('pagina=2') && !md.includes('NO-COPIAR'));
  assert.match(md, /error del servidor: no es evidencia de acceso/);
  assert.match(md, /sin verificar/);
  assert.match(md, /Lo que este borrador no cubre/);
  assert.deepEqual(lineasConHuella(md), []);
});

async function proyecto(t, { ficha, deps }) {
  const dir = mkdtempSync(join(tmpdir(), 'kit-sondeo-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'kit')); mkdirSync(join(dir, 'ops'));
  if (ficha !== undefined) writeFileSync(join(dir, 'kit', 'FICHA-INFRA.json'), JSON.stringify(ficha));
  if (deps !== undefined) writeFileSync(join(dir, 'ops', 'dependencias.json'), JSON.stringify(deps));
  return dir;
}
const PERMITE = { ops: { sondeoAcceso: { permitida: true } } };

test('main: sin ficha o sin permiso no hace ninguna petición y sale con 2', async (t) => {
  const { base, vistas } = await servidor(t);
  const deps = { dependencias: [dep(base, '/ok')] };
  for (const ficha of [undefined, {}, { ops: { sondeoAcceso: { permitida: false } } }]) {
    const dir = await proyecto(t, { ficha, deps });
    const e = salida();
    assert.equal(await main([], { stdout: salida(), stderr: e, cwd: dir }), 2);
    assert.match(e.texto, /NO SE EJECUTA/);
  }
  assert.deepEqual(vistas, []);
});

test('main: con permiso imprime el borrador o lo escribe (sin sobrescribir), y el código de salida refleja lo inesperado', async (t) => {
  const { base } = await servidor(t);
  const dir = await proyecto(t, { ficha: PERMITE, deps: { dependencias: [dep(base, '/ok', { espera: { estado: 200 } })] } });
  const o = salida();
  assert.equal(await main([], { stdout: o, stderr: salida(), cwd: dir, ahora: () => new Date('2026-10-23T10:00:00Z') }), 0);
  assert.match(o.texto, /2026-10-23/);
  assert.equal(await main(['--salida', 'ops/BORRADOR.md'], { stdout: salida(), stderr: salida(), cwd: dir }), 0);
  assert.match(readFileSync(join(dir, 'ops', 'BORRADOR.md'), 'utf8'), /Borrador de evidencias/);
  const e = salida();
  assert.equal(await main(['--salida', 'ops/BORRADOR.md'], { stdout: salida(), stderr: e, cwd: dir }), 2, 'no se sobrescribe');
  assert.match(e.texto, /ya existe/);
  for (const mala of ['../fuera.md', join(tmpdir(), 'x.md'), 'C:\\x.md']) assert.equal(await main(['--salida', mala], { stdout: salida(), stderr: salida(), cwd: dir }), 2, mala);

  const roto = await proyecto(t, { ficha: PERMITE, deps: { dependencias: [dep(base, '/caido', { espera: { estado: 200 } })] } });
  const e2 = salida();
  assert.equal(await main([], { stdout: salida(), stderr: e2, cwd: roto }), 1);
  assert.match(e2.texto, /resultado inesperado/);
  const invalido = await proyecto(t, { ficha: PERMITE, deps: { dependencias: [{ nombre: 'x', url: 'https://a.example/', token: 'abc' }] } });
  assert.equal(await main([], { stdout: salida(), stderr: salida(), cwd: invalido }), 2);
});

test('el ejemplo de dependencias es válido y no lleva credenciales; la skill y la guía nombran el script', () => {
  const ejemplo = JSON.parse(readFileSync(join(raiz, 'types', 'B', 'plantillas', 'dependencias.ejemplo.json'), 'utf8'));
  assert.equal(validarDependencias(ejemplo).length, 1);
  const skill = readFileSync(join(raiz, 'types', 'B', 'skills', 'evaluar-viabilidad', 'SKILL.md'), 'utf8');
  assert.match(skill, /scripts\/sondeo-acceso\.mjs/);
  assert.match(skill, /ops\.sondeoAcceso/);
  assert.match(skill, /NO verifica términos de uso/);
  assert.ok(!existsSync(join(raiz, 'scripts')), 'el script vive en types/B/plantillas y se instala en scripts/ del proyecto');
});

test('main: --ficha no existe (la ficha es siempre la del proyecto) y el archivo de dependencias no sale del proyecto', async (t) => {
  const dir = await proyecto(t, { ficha: PERMITE, deps: { dependencias: [] } });
  const e = salida();
  assert.equal(await main(['--ficha', join(dir, 'otra.json')], { stdout: salida(), stderr: e, cwd: dir }), 2);
  assert.match(e.texto, /--ficha no existe/);
  for (const mala of ['../deps.json', join(tmpdir(), 'deps.json')]) assert.equal(await main([mala], { stdout: salida(), stderr: salida(), cwd: dir }), 2, mala);
});

test('formaDeJson: tipos básicos', () => {
  assert.equal(formaDeJson(5), 'valor number');
  assert.equal(formaDeJson({}), 'objeto con 0 clave(s)');
  assert.equal(formaDeJson([]), 'lista de 0 elemento(s)');
});
