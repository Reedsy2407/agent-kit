// scripts/salud.mjs contra un servidor local (nunca la red): estado, cabeceras, mediana de tiempo, texto, enlaces, permisos de la ficha.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { comprobarSalud, normalizarConfig, mediana, origenSeguro, permisoDeFicha, enlacesInternos, main, SaludInvalida } from '../scripts/salud.mjs';

const CABS = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY', 'permissions-policy': 'camera=()', 'content-security-policy': "default-src 'self'; script-src 'self' 'sha256-abc'" };

async function servidor(t, rutas) {
  const peticiones = [];
  const s = createServer((req, res) => {
    peticiones.push(`${req.method} ${req.url}`);
    const r = rutas[req.url.split('?')[0]];
    if (!r) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end('no hay'); }
    setTimeout(() => { res.writeHead(r.estado ?? 200, { 'content-type': 'text/html', ...(r.cabeceras ?? CABS) }); res.end(req.method === 'HEAD' ? undefined : (r.cuerpo ?? 'ok')); }, r.retraso ?? 0);
  });
  await new Promise((ok) => s.listen(0, '127.0.0.1', ok));
  t.after(() => new Promise((ok) => { s.closeAllConnections?.(); s.close(ok); }));
  return { origen: `http://127.0.0.1:${s.address().port}`, peticiones };
}
const salida = () => { let t = ''; return { write: (x) => { t += x; }, get texto() { return t; } }; };

test('la mediana usa varias muestras y no se deja engañar por un pico', () => {
  assert.equal(mediana([5, 1, 100]), 5);
  assert.equal(mediana([1, 2, 3, 4]), 2.5);
  assert.ok(Number.isNaN(mediana([])));
});

test('salud correcta: estado, cabeceras, texto, mediana y enlaces críticos', async (t) => {
  const { origen, peticiones } = await servidor(t, { '/': { cuerpo: '<h1>Inicio</h1><a href="/a">a</a> <a href="/b?x=1#y">b</a> <a href="https://otro.example/x">fuera</a> <a href="mailto:x@y.z">m</a>' }, '/a': {}, '/b': {} });
  const r = await comprobarSalud({ origen, config: { muestras: 3, rutas: [{ ruta: '/', contiene: ['inicio'], noContiene: ['error interno'] }], enlaces: ['/a'], descubrirEnlaces: { desde: '/', max: 10 } } });
  assert.deepEqual(r.fallos, []);
  assert.equal(r.ok, true);
  assert.equal(peticiones.filter((p) => p === 'GET /').length, 3 + 1, '3 muestras + la página de la que se descubren enlaces');
  assert.ok(peticiones.includes('HEAD /a') && peticiones.includes('HEAD /b?x=1'), 'enlaces con HEAD');
  assert.ok(!peticiones.some((p) => /otro\.example|mailto/.test(p)), 'no sale del origen');
  assert.ok(peticiones.every((p) => /^(GET|HEAD) /.test(p)), 'solo lecturas');
});

test('detecta: estado distinto, texto ausente o prohibido, cabeceras que faltan, unsafe-inline y enlace roto', async (t) => {
  const { origen } = await servidor(t, {
    '/': { cuerpo: 'Bienvenida. error interno', cabeceras: { 'content-security-policy': "script-src 'unsafe-inline'", 'x-content-type-options': 'otra' } },
    '/caida': { estado: 500 },
  });
  const r = await comprobarSalud({ origen, config: { muestras: 1, cabecerasValores: { 'x-content-type-options': 'nosniff' }, rutas: [{ ruta: '/', contiene: ['inicio'], noContiene: ['error interno'] }, { ruta: '/caida' }], enlaces: ['/roto'] } });
  const texto = r.fallos.join('\n');
  assert.match(texto, /\/: no contiene el texto esperado «inicio»/);
  assert.match(texto, /\/: contiene texto que no debe aparecer/);
  assert.match(texto, /\/: falta la cabecera referrer-policy/);
  assert.match(texto, /la cabecera x-content-type-options no contiene «nosniff»/);
  assert.match(texto, /'unsafe-inline' en scripts/);
  assert.match(texto, /\/caida: respondió 500, se esperaba 200/);
  assert.match(texto, /enlace \/roto: respondió 404, se esperaba 200/);
  assert.equal(r.ok, false);
});

test('el tiempo de respuesta se mide por la mediana de las muestras y falla si la supera', async (t) => {
  const { origen } = await servidor(t, { '/': { retraso: 120 } });
  const lento = await comprobarSalud({ origen, config: { muestras: 3, medianaMaxMs: 40, rutas: [{ ruta: '/' }] } });
  assert.match(lento.fallos.join('\n'), /mediana de \d+ ms por encima del tope de 40 ms/);
  const bien = await comprobarSalud({ origen, config: { muestras: 3, medianaMaxMs: 5000, rutas: [{ ruta: '/' }] } });
  assert.deepEqual(bien.fallos, []);
  assert.match(bien.lineas[0], /mediana \d+ ms \(3 muestra\(s\)/);
});

test('un servidor que no responde a tiempo es un fallo claro, no un cuelgue', async (t) => {
  const { origen } = await servidor(t, { '/': { retraso: 600 } });
  const r = await comprobarSalud({ origen, config: { muestras: 1, timeoutMs: 200, rutas: [{ ruta: '/' }] } });
  assert.match(r.fallos.join('\n'), /no respondió \(más de 200 ms\)/);
});

test('una redirección cuenta como lo que es (3xx) y no se sigue', async (t) => {
  const { origen } = await servidor(t, { '/viejo': { estado: 301, cabeceras: { ...CABS, location: '/' } } });
  const r = await comprobarSalud({ origen, config: { muestras: 1, rutas: [{ ruta: '/viejo' }] } });
  assert.match(r.fallos.join('\n'), /respondió 301, se esperaba 200/);
  const ok = await comprobarSalud({ origen, config: { muestras: 1, rutas: [{ ruta: '/viejo', estado: 301 }] } });
  assert.deepEqual(ok.fallos, []);
});

test('la configuración inválida se rechaza con todos sus problemas y los límites acotan el bucle', () => {
  assert.throws(() => normalizarConfig({ muestras: 0, timeoutMs: 5, rutas: [{ ruta: 'sin-barra' }], cabeceras: ['mala cabecera'] }), (e) => e instanceof SaludInvalida && /muestras/.test(e.message) && /timeoutMs/.test(e.message) && /rutas\[0\]\.ruta/.test(e.message) && /cabeceras/.test(e.message));
  assert.throws(() => normalizarConfig({ muestras: 1000 }), /muestras/);
  assert.equal(normalizarConfig({}).muestras, 5);
});

test('solo https (o http en la propia máquina), sin credenciales en la dirección', () => {
  assert.equal(origenSeguro('https://ejemplo.org/algo?x=1'), 'https://ejemplo.org');
  assert.equal(origenSeguro('http://127.0.0.1:8080/x'), 'http://127.0.0.1:8080');
  assert.throws(() => origenSeguro('http://ejemplo.org'), /https/);
  assert.throws(() => origenSeguro('https://u:p@ejemplo.org'), /usuario/);
  assert.throws(() => origenSeguro('no es url'), /no válida/);
});

test('permisos de la ficha: sin ops.salud.permitida o con un origen ajeno no corre', () => {
  const ficha = { ops: { salud: { permitida: true } }, urlsPublicas: ['https://sitio.example'] };
  assert.equal(permisoDeFicha(ficha, 'salud', 'https://sitio.example'), null);
  assert.equal(permisoDeFicha(ficha, 'salud', 'http://127.0.0.1:9'), null);
  assert.match(permisoDeFicha(ficha, 'salud', 'https://ajeno.example'), /urlsPublicas/);
  assert.match(permisoDeFicha({ ops: { salud: { permitida: false } } }, 'salud', 'http://127.0.0.1:9'), /no permite/);
  assert.match(permisoDeFicha(null, 'salud', 'http://127.0.0.1:9'), /no hay ficha/);
});

test('enlacesInternos: solo mismo origen, sin duplicados, sin mailto ni anclas, con tope', () => {
  const html = '<a href="/a">1</a><a href="/a#x">2</a><a href="b">3</a><a href="https://otro.example/">4</a><a href="#arriba">5</a><a href="tel:1">6</a><a href="/c">7</a>';
  assert.deepEqual(enlacesInternos(html, 'https://s.example', '/dir/', 10), ['/a', '/dir/b', '/c']);
  assert.deepEqual(enlacesInternos(html, 'https://s.example', '/', 1), ['/a']);
});

async function proyecto(t, ficha, config) {
  const dir = mkdtempSync(join(tmpdir(), 'kit-salud-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'kit')); mkdirSync(join(dir, 'ops'));
  if (ficha) writeFileSync(join(dir, 'kit', 'FICHA-INFRA.json'), JSON.stringify(ficha));
  if (config) writeFileSync(join(dir, 'ops', 'salud.config.json'), JSON.stringify(config));
  return dir;
}

test('main: sin ficha o con la operación no permitida no hace ninguna petición y sale con 2', async (t) => {
  const { origen, peticiones } = await servidor(t, { '/': {} });
  for (const ficha of [null, { ops: { salud: { permitida: false } } }]) {
    const dir = await proyecto(t, ficha, {});
    const e = salida();
    assert.equal(await main([origen], { stdout: salida(), stderr: e, cwd: dir }), 2);
    assert.match(e.texto, /NO SE EJECUTA/);
  }
  assert.deepEqual(peticiones, []);
});

test('main: --ficha no existe y la configuración no puede salir del proyecto', async (t) => {
  const { origen, peticiones } = await servidor(t, { '/': {} });
  const dir = await proyecto(t, { ops: { salud: { permitida: true, config: 'ops/salud.config.json' } } }, {});
  const e = salida();
  assert.equal(await main([origen, '--ficha', join(dir, 'otra.json')], { stdout: salida(), stderr: e, cwd: dir }), 2);
  assert.match(e.texto, /--ficha no existe/);
  for (const mala of ['../c.json', join(tmpdir(), 'c.json')]) assert.equal(await main([origen, '--config', mala], { stdout: salida(), stderr: salida(), cwd: dir }), 2, mala);
  const malaFicha = await proyecto(t, { ops: { salud: { permitida: true, config: '../c.json' } } }, {});
  assert.equal(await main([origen], { stdout: salida(), stderr: salida(), cwd: malaFicha }), 2);
  assert.deepEqual(peticiones, []);
});

test('main: con la ficha que lo permite corre la configuración del proyecto, informa y devuelve 0 o 1', async (t) => {
  const { origen } = await servidor(t, { '/': { cuerpo: 'hola' } });
  const ficha = { ops: { salud: { permitida: true, config: 'ops/salud.config.json' } }, urlsPublicas: [] };
  const bien = await proyecto(t, ficha, { muestras: 2, rutas: [{ ruta: '/', contiene: ['hola'] }] });
  const o = salida();
  assert.equal(await main([origen], { stdout: o, stderr: salida(), cwd: bien }), 0);
  assert.match(o.texto, /Salud correcta/);
  const mal = await proyecto(t, ficha, { muestras: 1, rutas: [{ ruta: '/', contiene: ['adiós'] }] });
  const e = salida();
  assert.equal(await main([origen, '--json'], { stdout: salida(), stderr: e, cwd: mal }), 1);
  const j = salida();
  await main([origen, '--json'], { stdout: j, stderr: salida(), cwd: mal });
  assert.equal(JSON.parse(j.texto).ok, false);
});
