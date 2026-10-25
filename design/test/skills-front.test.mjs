// Skills de front y FRONTEND.md: que digan lo que el kit promete y que lo que nombran exista de verdad.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRUEBAS } from '../../front/run.mjs';
import { POR_DEFECTO } from '../../front/lib/config.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');
const skill = (n) => leer('design', 'skills', n, 'SKILL.md');
const frontend = leer('design', 'FRONTEND.md');

test('explorar-direcciones pide tres o más direcciones, una con referencia nombrada, evidencia y la elección del humano', () => {
  const s = skill('explorar-direcciones');
  for (const x of [/Tres direcciones como mínimo/, /referencia que nombre/, /Conservadora/, /Editorial/, /Sin commits hasta que se elija/, /capturas\.mjs/, /hoja\.mjs/, /video\.mjs/, /360, 768, 1280 y 1920/, /elegir la dirección es del humano/, /es \*\*una\*\* dirección posible/, /estudiar-referencia/]) assert.match(s, x);
});

test('estudiar-referencia fija el protocolo en Chrome, las mediciones y las dos listas', () => {
  const s = skill('estudiar-referencia');
  for (const x of [/Chrome/, /oscuro y claro/, /escritorio.*móvil/s, /\*\*Mide\*\*/, /Qué se toma/, /Qué no se toma/, /textos, ilustraciones, mascota, tema y marca, fuente, logo, paleta exacta, nombres de archivo/, /no descargues el sitio/, /No hay commits de este material/]) assert.match(s, x);
});

test('pulir-front cubre legibilidad, contenido mínimo y un solo punto de contacto', () => {
  const s = skill('pulir-front');
  for (const x of [/formato de código/, /Interlineado de 1,6/, /de 2 a 4 viñetas/, /Sin demostración simulada/, /tarjeta del proyecto destacado/, /no hay sección «Contacto»/, /enlace «Escribir»/, /chip que copia/, /Nunca dos enlaces al mismo correo/, /tests\/front\/run\.mjs/, /¿saldría lo mismo para cualquier brief parecido\?/]) assert.match(s, x);
});

test('elegir-tipografia-paleta exige licencia verificable, cobertura latina y un máximo de cuatro archivos', () => {
  const s = skill('elegir-tipografia-paleta');
  for (const x of [/Licencia verificable/, /Cobertura latina/, /ñ/, /¿/, /Máximo 4 archivos de fuente/, /woff2/, /Inter, Roboto, Arial/, /size-adjust/, /contraste \*\*calculado\*\*/, /ADR 0004/, /fuentes\.licencias/]) assert.match(s, x);
});

test('revision-visual trae una lista ejecutable que nombra pruebas y herramientas reales', () => {
  const s = skill('revision-visual');
  assert.match(s, /## 1\. Lista ejecutable/);
  assert.match(s, /\*\*«¿saldría lo mismo para cualquier brief parecido\?»\*\*/);
  assert.match(s, /«¿se ve plano o genérico\?»/);
  const ids = [...s.matchAll(/\| `([a-z]+)` \|/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(ids)].sort(), [...PRUEBAS].sort(), 'la tabla cubre exactamente las pruebas de la biblioteca');
  for (const h of ['capturas', 'hoja', 'video']) assert.ok(existsSync(join(raiz, 'front', 'herramientas', `${h}.mjs`)), h);
  assert.match(s, /--solo contraste/);
});

test('FRONTEND.md explica cuándo sobrio y cuándo expresivo, la referencia, los límites, otros géneros y el framework', () => {
  for (const x of [/## 2\. Sobrio o expresivo/, /tipo A \(portafolio\) parte de \*\*expresivo\*\*/, /tipo B .* parte de \*\*sobrio\*\*/, /## 3\. Límites de efectos/, /No se exige un interruptor visible de efectos/, /## 4\. Usar una referencia sin copiarla/,
    /## 5\. Cambiar de género sin tocar las pruebas/, /una\*\* dirección posible/, /el de un editor de código/, /## 6\. Un framework, o el tipo B/, /--url/, /reutiliza los tokens/, /CHROMIUM_PATH/, /no instala nada ni descarga navegadores/, /package-lock\.json/, /declara/]) assert.match(frontend, x);
});

test('la tabla de FRONTEND.md lista exactamente las pruebas y claves de configuración que existen', () => {
  const ids = [...frontend.matchAll(/^\| `([a-z]+)` \|/gm)].map((m) => m[1]);
  assert.deepEqual([...ids].sort(), [...PRUEBAS].sort());
  const claves = new Set(Object.entries(POR_DEFECTO).flatMap(([sec, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).map((k) => `${sec}.${k}`) : [sec])));
  for (const m of frontend.matchAll(/`((?:umbrales|selectores|contenido|datosSensibles|fuentes|dist|pruebas)\.[a-zA-Z*]+)`/g)) {
    if (m[1].endsWith('*')) assert.ok([...claves].some((c) => c.startsWith(m[1].slice(0, -1))), m[1]);
    else assert.ok(claves.has(m[1]), `la configuración no tiene ${m[1]}`);
  }
});

test('lo que FRONTEND.md y las skills nombran en tests/front existe en front/', () => {
  const texto = [frontend, ...['explorar-direcciones', 'pulir-front', 'revision-visual'].map(skill)].join('\n');
  for (const m of texto.matchAll(/tests\/front\/(herramientas\/[a-z]+\.mjs|run\.mjs|front\.config\.json)/g)) {
    const origen = m[1] === 'front.config.json' ? 'front.config.plantilla.json' : m[1];
    assert.ok(existsSync(join(raiz, 'front', origen)), `no existe front/${origen}`);
  }
});

function todos(dir, salida = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) todos(p, salida);
    else salida.push(p);
  }
  return salida;
}

test('la biblioteca front/ no lleva datos personales, nombres de proyectos reales ni proveedores', () => {
  const prohibido = new RegExp(['@gmail', 'linkedin\\.com/in', 'sae' + 'nz', 'ang' + 'el\\b', 'reed' + 'sy', '\\bes' + 'g\\b', 'ciber' + 'tec', 'cloud' + 'flare', 'git' + 'hub', 'ren' + 'der\\.com'].join('|'), 'i');
  for (const f of todos(join(raiz, 'front'))) {
    if (/\.test\.mjs$/.test(f)) continue; // las pruebas pueden nombrar lo prohibido para comprobar que no aparece
    assert.doesNotMatch(readFileSync(f, 'utf8'), prohibido, relative(raiz, f));
  }
});

test('la biblioteca front/ no depende de nada fuera de Node (ADR 0001 y 0004)', () => {
  const permitido = /^(node:|\.{1,2}\/)/;
  for (const f of todos(join(raiz, 'front')).filter((x) => x.endsWith('.mjs'))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/(?:^|\n)\s*import\s[^'"\n]*['"]([^'"]+)['"]/g)) assert.match(m[1], permitido, `${relative(raiz, f)} importa ${m[1]}`);
  }
  assert.ok(!existsSync(join(raiz, 'front', 'package.json')) && !existsSync(join(raiz, 'node_modules')));
});
