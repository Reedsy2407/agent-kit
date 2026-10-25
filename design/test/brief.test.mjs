import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sustituir } from '../../install/marcadores.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');
const brief = leer('design', 'DESIGN-BRIEF.md');
const revision = leer('design', 'skills', 'revision-visual', 'SKILL.md');

test('el brief exige declarar el perfil de expresión y el valor inicial sale del tipo', () => {
  assert.match(brief, /Perfil de expresión \(obligatorio\):\*\* \{\{perfil_expresion\}\}/);
  assert.match(brief, /«sobrio» o «expresivo»/);
  assert.match(brief, /tipo A parte de «expresivo» y el tipo B de «sobrio»/);
  for (const [tipo, perfil] of [['A', 'expresivo'], ['B', 'sobrio']]) {
    const m = JSON.parse(leer('types', tipo, 'manifest.json'));
    assert.equal(m.perfilExpresion, perfil, `el tipo ${tipo} parte de ${perfil}`);
    assert.match(sustituir(brief, { perfil_expresion: m.perfilExpresion, tipo_nombre: m.nombre }).texto, new RegExp(`obligatorio\\):\\*\\* ${perfil}\\.`));
  }
});

test('la revisión visual comprueba que el perfil está declarado y se respeta', () => {
  assert.match(revision, /perfil de expresión/i);
  assert.match(revision, /declarado/);
  assert.match(revision, /se \*\*respeta\*\*/);
});

test('el protocolo de referencia pide tres direcciones, medición y las dos listas', () => {
  assert.match(brief, /Mínimo \*\*tres direcciones\*\*, y al menos una basada en una referencia que \*\*el humano nombra\*\*/);
  assert.match(brief, /oscuro y en claro, en escritorio y en móvil, \*\*midiendo\*\*/);
  const quéNo = brief.match(/\*\*qué no\*\* \(([^)]*)\)/)?.[1] ?? '';
  for (const x of ['textos', 'ilustraciones', 'mascota', 'tema y marca', 'fuente', 'logo', 'paleta exacta', 'nombres de archivo']) assert.ok(quéNo.includes(x), `falta «${x}» en lo que no se toma`);
  assert.match(brief, /\*\*qué se toma\*\* \(género, estructura, efectos\)/);
  assert.match(brief, /design\/refs\//);
  assert.match(brief, /360, 1280 y 1920 px/);
  assert.match(brief, /Sin commits hasta que el humano elija/);
});

test('el presupuesto de efectos fija las reglas y no propone un interruptor visible', () => {
  for (const x of [/aria-hidden/, /`opacity` y `transform`/, /8 % como máximo/, /WCAG 2\.3\.1/, /prefers-reduced-motion/, /pestaña está oculta/, /peor caso/]) assert.match(brief, x);
  assert.match(brief, /No se exige un interruptor visible de efectos: el humano lo descartó\. No se propone por defecto\./);
  assert.doesNotMatch(brief.replace(/No se exige un interruptor visible[^\n]*/, ''), /interruptor/i);
});

test('rendimiento, fuentes, legibilidad, contenido mínimo y anti-slop están en el brief', () => {
  for (const x of [/mediana de varias muestras/, /2 y 4 %/, /150 KB/, /15 KB/, /GPU real, equipo de gama baja/, /licencia anotada/, /\*\*4 archivos de fuente\*\*/,
    /formato de código/, /interlineado de 1,6/, /de 2 a 4 viñetas por puesto/, /Sin demostración simulada/, /tarjeta del proyecto destacado/, /Sin sección «Contacto»/,
    /sin enlace «Escribir»/, /sin JavaScript es un enlace `mailto:`/, /¿saldría lo mismo para cualquier brief parecido\?/, /elemento firma/]) assert.match(brief, x);
});

test('Impeccable es opcional por proyecto y no entra al núcleo', () => {
  const t = leer('design', 'TOOLING.md');
  assert.match(t, /Impeccable: opcional por proyecto/);
  assert.match(t, /`\/critique`, `\/audit` y `\/polish`/);
  assert.match(t, /No se usa `\/overdrive`/);
  assert.match(t, /ADR 0004/);
});
