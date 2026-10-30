// Entorno del verificador (types/C/esqueletos/entorno.mjs y prepararRedPip de verificar.mjs): sin red y sin herramientas.
// Lo importante: se añaden autoridades que el sistema ya confía, nunca se desactiva la verificación de certificados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carpetasHabituales, entornoConHerramientas, esFalloDeCertificado, pemDeConfianza, sinCredenciales } from '../esqueletos/entorno.mjs';
import { prepararRedPip } from '../esqueletos/verificar.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const marco = (tipo, cuerpo) => ['-----BEGIN', `${tipo}-----\n${cuerpo}\n-----END`, `${tipo}-----`].join(' ');
const PEM = (n) => marco('CERTIFICATE', `MIIB${n}`);
const OTRO_PEM = marco('OTRO', 'x'); // algo que no es un certificado

test('carpetas habituales de Go y Cargo según el sistema operativo', () => {
  assert.deepEqual(carpetasHabituales({ ProgramFiles: 'C:\\Program Files', USERPROFILE: 'C:\\Users\\yo' }, 'win32'),
    [join('C:\\Program Files', 'Go', 'bin'), join('C:\\Users\\yo', 'go', 'bin'), join('C:\\Users\\yo', '.cargo', 'bin')]);
  assert.deepEqual(carpetasHabituales({ HOME: '/home/yo' }, 'linux'), ['/usr/local/go/bin', join('/home/yo', 'go', 'bin'), join('/home/yo', '.cargo', 'bin')]);
});

test('el PATH solo gana las carpetas que existen y faltaban; el entorno original no se toca', () => {
  const original = { Path: ['C:\\a', join('c:\\users\\yo', '.cargo', 'bin')].join(delimiter), USERPROFILE: 'C:\\Users\\yo', ProgramFiles: 'C:\\Program Files' };
  const antes = JSON.stringify(original);
  const existentes = new Set([join('C:\\Program Files', 'Go', 'bin'), join('C:\\Users\\yo', '.cargo', 'bin')]);
  const { env, añadidas } = entornoConHerramientas(original, { plataforma: 'win32', existe: (c) => existentes.has(c) });
  assert.deepEqual(añadidas, [join('C:\\Program Files', 'Go', 'bin')], 'Cargo ya estaba (sin distinguir mayúsculas) y go/bin de usuario no existe');
  assert.equal(env.Path.split(delimiter)[0], join('C:\\Program Files', 'Go', 'bin'));
  assert.ok(env.Path.includes('C:\\a'));
  assert.equal(env.PATH, undefined, 'se conserva la forma de la clave');
  assert.equal(JSON.stringify(original), antes, 'no muta el entorno recibido');
  assert.deepEqual(entornoConHerramientas({ PATH: '/usr/bin' }, { plataforma: 'linux', existe: () => false }).añadidas, []);
});

test('solo un fallo de certificado cuenta como tal', () => {
  assert.ok(esFalloDeCertificado("SSLError(SSLCertVerificationError(1, '[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate"));
  assert.ok(!esFalloDeCertificado('Connection refused'));
  assert.ok(!esFalloDeCertificado('Temporary failure in name resolution'));
});

test('el PEM de confianza une sin repetidos, descarta lo que no es un certificado y termina en salto de línea', () => {
  const t = pemDeConfianza([PEM('A'), `  ${PEM('A')}  `, 'basura', OTRO_PEM], [PEM('B')]);
  assert.equal(t, `${PEM('A')}\n${PEM('B')}\n`);
});

function conBase(fn) {
  const base = mkdtempSync(join(tmpdir(), 'kit-verif-t-'));
  const guardadas = { PIP_CERT: process.env.PIP_CERT, REQUESTS_CA_BUNDLE: process.env.REQUESTS_CA_BUNDLE, SSL_CERT_FILE: process.env.SSL_CERT_FILE };
  delete process.env.PIP_CERT; delete process.env.REQUESTS_CA_BUNDLE; delete process.env.SSL_CERT_FILE;
  return Promise.resolve(fn(base)).finally(() => {
    for (const [k, v] of Object.entries(guardadas)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    rmSync(base, { recursive: true, force: true });
  });
}
const FALLO_TLS = { codigo: 1, salida: 'Could not fetch URL: SSLCertVerificationError CERTIFICATE_VERIFY_FAILED unable to get local issuer certificate' };

test('pip que ya valida PyPI: no se cambia nada', () => conBase(async (base) => {
  const r = await prepararRedPip(base, () => ({ codigo: 0, salida: '' }), async () => assert.fail('no debía exportar certificados'));
  assert.deepEqual(r.env, {});
}));

test('pip que falla por el certificado: se exporta el almacén del sistema a un PEM temporal y se vuelve a probar con él', () => conBase(async (base) => {
  const llamadas = [];
  const r = await prepararRedPip(base, (_b, env) => { llamadas.push(env); return Object.keys(env).length ? { codigo: 0, salida: '' } : FALLO_TLS; }, async () => [PEM('A'), PEM('B')]);
  assert.equal(llamadas.length, 2);
  assert.ok(r.env.PIP_CERT.startsWith(base), 'el PEM vive en la carpeta temporal, no en el repositorio');
  assert.equal(r.env.REQUESTS_CA_BUNDLE, r.env.PIP_CERT);
  assert.equal(readFileSync(r.env.PIP_CERT, 'utf8'), `${PEM('A')}\n${PEM('B')}\n`);
  assert.ok(!r.env.PIP_CERT.startsWith(raiz), 'nunca dentro del repositorio');
  assert.match(r.nota, /almacén de confianza del sistema/);
}));

test('un fallo que no es de certificado no se «arregla»: se omite diciendo por qué, sin tocar certificados', () => conBase(async (base) => {
  const r = await prepararRedPip(base, () => ({ codigo: 1, salida: 'Connection refused' }), async () => assert.fail('no debía exportar certificados'));
  assert.match(r.omitido, /no es un fallo de certificado/);
}));

test('si ni con el almacén del sistema valida, se omite (no se desactiva nada)', () => conBase(async (base) => {
  const r = await prepararRedPip(base, () => FALLO_TLS, async () => [PEM('A')]);
  assert.match(r.omitido, /ni con el almacén de confianza del sistema valida/);
  assert.equal(r.env, undefined);
}));

for (const variable of ['PIP_CERT', 'REQUESTS_CA_BUNDLE', 'SSL_CERT_FILE']) {
  test(`si el usuario definió ${variable} no se sobrescribe`, () => conBase(async (base) => {
    process.env[variable] = join(base, 'mio.pem');
    const r = await prepararRedPip(base, () => FALLO_TLS, async () => assert.fail('no debía exportar certificados'));
    assert.match(r.omitido, /definidas por ti/);
    assert.ok(!existsSync(join(base, 'confianza-del-sistema.pem')));
  }));
}

test('las URLs que se imprimen no llevan usuario ni contraseña', () => {
  assert.equal(sinCredenciales('ProxyError: https://usuario:clave@proxy.example:8080/simple y http://otro@host.example/x'), 'ProxyError: https://***@proxy.example:8080/simple y http://***@host.example/x');
  assert.equal(sinCredenciales('sin url'), 'sin url');
});

test('el verificador y su entorno nunca desactivan la verificación de certificados', () => {
  const prohibido = /--trusted-host|trusted[-_]host|PIP_NO_VERIFY|PIP_INDEX_URL\s*=\s*http:|verify\s*=\s*False|NODE_TLS_REJECT_UNAUTHORIZED|rejectUnauthorized\s*:\s*false|GIT_SSL_NO_VERIFY|--insecure|CURL_INSECURE|PYTHONHTTPSVERIFY|sslverify\s*=\s*false/i;
  for (const f of ['verificar.mjs', 'entorno.mjs']) {
    readFileSync(join(raiz, 'types', 'C', 'esqueletos', f), 'utf8').split('\n').forEach((l, i) => assert.doesNotMatch(l, prohibido, `${f}:${i + 1}`));
  }
});

test('el esqueleto Python declara la red de pip y el comando instalable que el verificador comprueba', () => {
  const v = JSON.parse(readFileSync(join(raiz, 'types', 'C', 'esqueletos', 'python', 'esqueleto.json'), 'utf8')).verificacion;
  assert.equal(v.red, 'pip');
  assert.deepEqual(v.instalable, { comando: 'herramienta' });
  assert.ok(v.extras.some((x) => x.cmd[0] === 'pip-audit' && x.red === true));
});
