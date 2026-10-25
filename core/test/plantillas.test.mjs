import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARCADORES, marcadoresUsados, sustituir } from '../../install/marcadores.mjs';
import { lineasConHuella } from './lib/pureza.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');

function archivos(dir, filtro = () => true) {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta, filtro));
    else if (filtro(ruta)) salida.push(ruta);
  }
  return salida;
}

// datos-privados.json (la lista local de términos, ignorada por git) lleva nombres por definición: no es una plantilla.
const plantillas = [...archivos(join(raiz, 'core'), (r) => /\.(md|json)$/.test(r) && !r.includes(`${join('core', 'hooks', 'test')}`) && !/[\\/]datos-privados\.json$/.test(r)),
  ...archivos(join(raiz, 'design'))];

test('el CLAUDE.md de la plantilla tiene como máximo 150 líneas', () => {
  const lineas = leer('core', 'CLAUDE.md').split('\n').length;
  assert.ok(lineas <= 150, `tiene ${lineas} líneas`);
});

test('las plantillas solo usan marcadores conocidos', () => {
  for (const archivo of plantillas) {
    const desconocidos = marcadoresUsados(readFileSync(archivo, 'utf8')).filter((m) => !MARCADORES.includes(m));
    assert.deepEqual(desconocidos, [], `${relative(raiz, archivo)} usa marcadores desconocidos`);
  }
});

test('nada específico de un proveedor ni de un proyecto real en core/ ni design/', () => {
  /* Proveedores: en claro. Nombres de proyectos, empleadores o clientes ajenos: solo por huella (core/test/lib/pureza.mjs). */
  const prohibidas = /\b(render\.com|render\.yaml|neon|neonctl|supabase|vercel|netlify|cloudflare|github)\b/i;
  for (const archivo of plantillas) {
    const texto = readFileSync(archivo, 'utf8');
    const m = texto.match(prohibidas);
    assert.equal(m, null, `${relative(raiz, archivo)} menciona «${m?.[0]}»`);
    assert.deepEqual(lineasConHuella(texto), [], `${relative(raiz, archivo)} menciona un nombre vetado (no se muestra)`);
  }
});

test('las plantillas no mencionan el repositorio ni su alojamiento', () => {
  for (const archivo of plantillas.filter((r) => r.includes('design'))) {
    assert.doesNotMatch(readFileSync(archivo, 'utf8'), /github|repositorio/i, relative(raiz, archivo));
  }
});

test('cada skill tiene frontmatter válido, nombre igual a su carpeta y menos de 500 líneas', () => {
  const skills = [...archivos(join(raiz, 'core', 'skills'), (r) => r.endsWith('SKILL.md')), ...archivos(join(raiz, 'design', 'skills'), (r) => r.endsWith('SKILL.md'))];
  assert.ok(skills.length >= 4);
  for (const archivo of skills) {
    const texto = readFileSync(archivo, 'utf8');
    const fm = texto.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(fm, `${relative(raiz, archivo)} sin frontmatter`);
    const nombre = fm[1].match(/^name:\s*(\S+)/m)?.[1];
    assert.equal(nombre, basenameDir(archivo), 'name debe coincidir con la carpeta');
    assert.match(fm[1], /^description:\s*\S/m);
    assert.doesNotMatch(fm[1], /allowed-tools/, 'sin allowed-tools: cada escritura sigue pidiendo permiso');
    assert.ok(texto.split('\n').length < 500);
  }
});

function basenameDir(archivo) {
  return dirname(archivo).split(/[\\/]/).pop();
}

test('el subagente revisor es de solo lectura', () => {
  const texto = leer('core', 'agents', 'code-reviewer.md');
  const fm = texto.match(/^---\n([\s\S]*?)\n---\n/)[1];
  assert.match(fm, /^name:\s*code-reviewer$/m);
  const tools = fm.match(/^tools:\s*(.+)$/m)[1].split(',').map((t) => t.trim());
  assert.deepEqual(tools.sort(), ['Bash', 'Glob', 'Grep', 'Read']);
  assert.match(fm, /guard-reviewer\.mjs/, 'su Bash está limitado por un hook');
});

test('sustituir reemplaza marcadores y devuelve los que faltan', () => {
  const r = sustituir('Hola {{proyecto}} y {{ tipo }} {{otro}}', { proyecto: 'p', tipo: 'A' });
  assert.equal(r.texto, 'Hola p y A {{otro}}');
  assert.deepEqual(r.sinValor, ['otro']);
});

test('el revisor lee las reglas del proyecto y no sugiere lo que prohíben', () => {
  const texto = leer('core', 'agents', 'code-reviewer.md');
  assert.match(texto, /Lee `CLAUDE\.md` del proyecto/);
  assert.match(texto, /no pueden contradecir esas reglas/);
  assert.match(texto, /`Co-Authored-By`/);
});

test('un ajuste pequeño lleva el cierre y el merge en el mismo prompt, y «sin merge» se dice explícitamente', () => {
  const prompt = leer('core', 'PROMPT-MODULO.md');
  const merge = leer('core', 'MERGE-AUTORIZADO.md');
  const skill = leer('core', 'skills', 'prompt-de-modulo', 'SKILL.md');
  assert.match(prompt, /Prompts de ajuste pequeño/);
  assert.match(prompt, /incluye el cierre y el merge en el mismo prompt/);
  assert.match(prompt, /SIN MERGE: te detienes en la rama/);
  assert.match(merge, /también los ajustes pequeños/);
  assert.match(merge, /Si el prompt no trae el bloque, la terminal se detiene en la rama/);
  assert.match(skill, /también para un ajuste pequeño/);
});

test('el .gitattributes de la plantilla evita el ruido de fin de línea', () => {
  assert.equal(leer('core', 'gitattributes.plantilla'), '* text=auto eol=lf\n*.pdf binary\n*.woff2 binary\n');
  assert.equal(leer('.gitattributes'), leer('core', 'gitattributes.plantilla'));
});
