import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from '../src/app.mjs';
import { cargarConfig, ConfigInvalida } from '../src/config.mjs';

async function conServidor(fn) {
  const servidor = crearApp({ entorno: 'desarrollo' });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  try { await fn(`http://127.0.0.1:${servidor.address().port}`); } finally { await new Promise((ok) => { servidor.close(ok); servidor.closeAllConnections(); }); }
}

test('GET /salud responde 200 con estado ok', () => conServidor(async (base) => {
  const r = await fetch(`${base}/salud`);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).estado, 'ok');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
}));

test('GET /api/saludo saluda con el nombre dado', () => conServidor(async (base) => {
  const r = await fetch(`${base}/api/saludo?nombre=Ana`);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { mensaje: 'Hola, Ana' });
}));

test('los errores usan un solo formato (problema HTTP) sin detalles internos', () => conServidor(async (base) => {
  const casos = [[`${base}/api/saludo?nombre=${'x'.repeat(51)}`, 400], [`${base}/no-existe`, 404]];
  for (const [url, estado] of casos) {
    const r = await fetch(url);
    assert.equal(r.status, estado);
    assert.match(r.headers.get('content-type'), /application\/problem\+json/);
    const c = await r.json();
    assert.deepEqual(Object.keys(c).sort(), ['detail', 'status', 'title', 'type']);
    assert.equal(c.status, estado);
  }
  const post = await fetch(`${base}/salud`, { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
}));

test('sin APP_ENTORNO la configuración falla y lo dice sin mostrar valores', () => {
  assert.throws(() => cargarConfig({}), (e) => e instanceof ConfigInvalida && /APP_ENTORNO/.test(e.message));
  assert.throws(() => cargarConfig({ APP_ENTORNO: 'otro' }), ConfigInvalida);
  assert.throws(() => cargarConfig({ APP_ENTORNO: 'desarrollo', PORT: 'abc' }), ConfigInvalida);
  assert.deepEqual(cargarConfig({ APP_ENTORNO: 'produccion' }), { entorno: 'produccion', puerto: 8080, host: '127.0.0.1' });
});
