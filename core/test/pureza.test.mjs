// Pureza de TODO lo versionado (README, CHANGELOG, HANDOFF, install/, docs/adr, hooks, pruebas…): ningún término de la lista
// privada, y ninguna palabra de las huellas vetadas en core/ ni design/. Nunca imprime un término: solo archivo y línea.
// Sin core/test/datos-privados.json (ignorado por git) la parte de la lista AVISA en voz alta y no falla; las huellas opcionales corren siempre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, TEXTO, huella, HUELLAS_VETADAS, compilar, lineasConCoincidencia, lineasConHuella, versionado, leerListaPrivada, avisar } from './lib/pureza.mjs';

const textos = () => (versionado() ?? []).filter((r) => TEXTO.test(r) && existsSync(join(RAIZ, r)));

test('el buscador de pureza: palabra completa, sin mayúsculas, con acentos y sin devolver el término', () => {
  const r = compilar(['zzfalso', 'Frase Dos', 'ñandú']);
  assert.deepEqual(lineasConCoincidencia('nada\nel ZZFalso aquí\nzzfalsos no\nuna frase   dos.\nÑANDÚ!', r), [2, 4, 5]);
  assert.deepEqual(lineasConCoincidencia('xzzfalso zzfalso_ _zzfalso', r), [], 'pegado a letras, cifras o guion bajo no cuenta');
  assert.deepEqual(compilar(['', '  ', 'a.b']).length, 1);
  assert.equal(compilar(['a.b'])[0].test('axb'), false, 'el punto del término es literal');
});

test('el buscador por huella: palabra completa, sin mayúsculas, sin devolver la palabra', () => {
  const huellas = new Set([huella('zzfalso')]);
  assert.deepEqual(lineasConHuella('nada\nel ZZFalso aquí\nzzfalsos no\nx-zzfalso-y', huellas), [2, 4]);
  assert.ok([...HUELLAS_VETADAS].every((h) => /^[0-9a-f]{64}$/.test(h)));
});

test('ningún archivo versionado contiene un término de la lista privada', (t) => {
  const { estado, regexps } = leerListaPrivada();
  if (estado === 'falta') return avisar(t, 'falta core/test/datos-privados.json (formato {"terminos": [...]}, ignorado por git). La pureza NO se comprobó.');
  if (estado === 'vacia') return avisar(t, 'la lista de términos está vacía. La pureza NO se comprobó.');
  const archivos = textos();
  if (!archivos.length) return avisar(t, 'no se pudo consultar git. La pureza NO se comprobó.');
  assert.ok(archivos.some((r) => r === 'README.md') && archivos.some((r) => r.startsWith('install/')) && archivos.some((r) => r.startsWith('docs/adr/')), 'el alcance debe incluir README, install/ y docs/adr');
  const hallazgos = [];
  for (const rel of archivos) for (const n of lineasConCoincidencia(readFileSync(join(RAIZ, rel), 'utf8'), regexps)) hallazgos.push(`${rel}:${n}`);
  assert.deepEqual(hallazgos, [], 'hay coincidencias con la lista privada (los términos no se muestran): generaliza esas líneas');
});

test('core/ y design/ no contienen las palabras vetadas por huella (funciona también sin la lista privada)', () => {
  const archivos = textos().filter((r) => r.startsWith('core/') || r.startsWith('design/'));
  assert.ok(archivos.length > 10);
  const hallazgos = [];
  for (const rel of archivos) for (const n of lineasConHuella(readFileSync(join(RAIZ, rel), 'utf8'))) hallazgos.push(`${rel}:${n}`);
  assert.deepEqual(hallazgos, [], 'hay palabras vetadas (no se muestran)');
});
