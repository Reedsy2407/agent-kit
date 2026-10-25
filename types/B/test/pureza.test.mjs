// Regla de pureza del tipo B: lo versionado del tipo B no puede contener nada reconocible de proyectos ajenos. La lista de
// términos vive en core/test/datos-privados.json ({"terminos": [...]}), que git ignora; sin ella la prueba AVISA en voz alta y
// no falla. El resto del repositorio lo cubre core/test/pureza.test.mjs. Nunca imprime un término: solo archivo y línea.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { RAIZ as raiz, TEXTO, git, versionado, leerListaPrivada, lineasConCoincidencia, avisar } from '../../../core/test/lib/pureza.mjs';

/** Alcance de esta prueba: todo el tipo B menos la carpeta privada. */
export const enAlcance = (rel) => rel.startsWith('types/B/') && !rel.startsWith('types/B/casos-privados/');

test('lo versionado del tipo B no contiene ningún término de la lista privada', (t) => {
  const { estado, regexps } = leerListaPrivada();
  if (estado === 'falta') return avisar(t, 'falta core/test/datos-privados.json (formato {"terminos": [...]}, ignorado por git). La pureza NO se comprobó.');
  if (estado === 'vacia') return avisar(t, 'la lista de términos está vacía. La pureza NO se comprobó.');
  const archivos = versionado();
  if (archivos === null) return avisar(t, 'no se pudo consultar git. La pureza NO se comprobó.');
  const alcance = archivos.filter(enAlcance).filter((r) => TEXTO.test(r));
  assert.ok(alcance.some((r) => r.startsWith('types/B/')), 'el alcance debería incluir archivos del tipo B');
  const hallazgos = [];
  for (const rel of alcance) {
    const ruta = join(raiz, rel);
    if (!existsSync(ruta)) continue;
    for (const n of lineasConCoincidencia(readFileSync(ruta, 'utf8'), regexps)) hallazgos.push(`${rel}:${n}`);
  }
  assert.deepEqual(hallazgos, [], 'hay coincidencias con la lista privada (los términos no se muestran): revisa y generaliza esas líneas');
});

test('casos-privados/ y datos-privados.json no están en git y git los ignora', (t) => {
  const rastreados = git(['ls-files', '-z']);
  if (rastreados === null) return avisar(t, 'no se pudo consultar git; no se comprobó que lo privado esté fuera.');
  const malos = rastreados.split('\0').filter((r) => r.startsWith('types/B/casos-privados') || /(^|\/)datos-privados\.json$/.test(r));
  assert.deepEqual(malos, [], 'material privado rastreado por git');
  const ignora = (ruta) => git(['check-ignore', '-q', '--', ruta]) !== null;
  assert.ok(ignora('types/B/casos-privados/README.md'), 'types/B/casos-privados/ debe estar en .gitignore');
  assert.ok(ignora('core/test/datos-privados.json'), 'core/test/datos-privados.json debe estar en .gitignore');
});

test('lo que la prueba de pureza recorre existe (el alcance no quedó vacío por un cambio de nombres)', () => {
  const dir = join(raiz, 'types', 'B');
  const hay = (d) => readdirSync(d).some((n) => { const r = join(d, n); return statSync(r).isDirectory() ? (relative(dir, r).split(sep)[0] !== 'casos-privados' && hay(r)) : TEXTO.test(n); });
  assert.ok(hay(dir));
});
