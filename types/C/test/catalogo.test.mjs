// Catálogo de problemas del tipo C (ADR 0020): formato fijo, «no hacer nada», notas por stack con fuente y fecha (o
// «No verificado»), genérico (sin cifras ni anécdotas), enlaces válidos, ADR de ejemplo, defensivo y sin material privado.
// El instalador copia el catálogo a kit/catalogo-c/ sin tocar el del tipo B (ver instalacion.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planificar, aplicar } from '../../../install/install.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CAT = join(raiz, 'types', 'C', 'catalogo');
const ADRS = join(raiz, 'types', 'C', 'ejemplos-adr-c');
const fichas = readdirSync(CAT).filter((f) => f.endsWith('.md') && f !== 'INDEX.md').sort();
const SECCIONES = ['Problema', 'Señales de que aplica', 'Señales de que sobra', 'Opciones', 'Cómo se comprueba', 'Cómo suele resolverse', 'Anti-patrones frecuentes', 'Notas por stack', 'ADR de ejemplo'];
const STACKS = ['Go', 'Python', 'Rust'];
const FICHAS = ['recarga-configuracion-caliente', 'supervision-procesos-hijos', 'apagado-ordenado', 'control-local-daemon', 'contrato-cli', 'configuracion-validada-arranque', 'concurrencia-contrapresion', 'persistencia-en-disco', 'entrada-no-confiable-protocolos', 'pruebas-propiedades-fuzzing', 'extensibilidad', 'codigo-de-terceros-confinamiento', 'secretos-maquina-usuario', 'privilegios-minimos', 'autenticacion-apis-control', 'registro-estructurado-rotacion', 'empaquetado-releases-multiplataforma', 'cambios-reversibles'];
const GRUPOS = ['Ciclo de vida', 'Control y contrato', 'Datos y entrada/salida', 'Pruebas y extensión', 'Seguridad por defecto', 'Operación'];
const leer = (f) => readFileSync(join(CAT, f), 'utf8');
const seccionNotas = (t) => t.split(/^## Notas por stack$/m)[1].split(/^## ADR de ejemplo$/m)[0];

test('el catálogo trae fichas con el formato fijo, «no hacer nada» y las tres pilas', () => {
  assert.deepEqual(fichas, FICHAS.map((f) => `${f}.md`).sort(), 'las dieciocho fichas pedidas, ni más ni menos');
  for (const f of fichas) {
    const t = leer(f);
    assert.match(t, /^# \S/, `${f}: título`);
    const titulos = [...t.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
    assert.deepEqual(titulos, SECCIONES, `${f}: secciones`);
    assert.match(t, /\| No hacer nada/i, `${f}: falta la opción «no hacer nada»`);
    for (const s of STACKS) assert.match(t, new RegExp(`^- \\*\\*${s}:\\*\\*`, 'm'), `${f}: nota de ${s}`);
    assert.match(t, /no verificado/i, `${f}: marca lo no verificado`);
  }
});

test('cada nota por stack está verificada con fecha y fuente https, comprobada con el esqueleto, o marcada «No verificado»', () => {
  let verificadas = 0; let comprobadas = 0;
  for (const f of fichas) {
    const seccion = seccionNotas(leer(f));
    assert.match(seccion, /Verificación \(\d{4}-\d{2}-\d{2}\)/, `${f}: falta la nota de cómo leer la verificación`);
    const lineas = seccion.split('\n').filter((l) => l.startsWith('- **'));
    assert.equal(lineas.length, STACKS.length, `${f}: tres stacks`);
    for (const l of lineas) {
      const verificada = /Verificado el \d{4}-\d{2}-\d{2} \(\[[^\]]+\]\(https:\/\/[^)\s]+\)/.test(l);
      const probada = /Comprobado ejecutando el esqueleto el \d{4}-\d{2}-\d{2} \(`types\/C\/esqueletos\/VERIFICACION\.md`\)/.test(l);
      assert.ok(verificada || probada || /No verificado/.test(l), `${f}: nota sin estado de verificación: ${l.slice(0, 40)}`);
      if (/Verificado el/.test(l)) assert.ok(verificada, `${f}: «Verificado el» sin fecha o sin enlace https a la fuente`);
      if (/Comprobado ejecutando/.test(l)) assert.ok(probada, `${f}: «Comprobado ejecutando» sin fecha o sin el registro`);
      assert.doesNotMatch(l, /http:\/\//, `${f}: fuentes solo por https`);
      if (verificada) verificadas++;
      if (probada) comprobadas++;
    }
  }
  assert.ok(verificadas >= 35, `hay ${verificadas} notas verificadas con fuente`);
  assert.ok(comprobadas >= 1);
});

test('el catálogo está en genérico: sin cifras, sin anécdotas, sin código y con direcciones solo en las notas por stack', () => {
  const anecdota = /\b(hubo|incidentes?|otro equipo|regla de equipo|huecos observados)\b|en producción/i;
  for (const f of [...fichas, 'INDEX.md']) {
    let seccion = '';
    leer(f).split('\n').forEach((l, i) => {
      if (l.startsWith('## ')) seccion = l;
      assert.doesNotMatch(l, anecdota, `${f}:${i + 1} anécdota`);
      assert.doesNotMatch(l, /```/, `${f}:${i + 1} bloque de código`);
      /* Las cifras de casos concretos no entran; las notas por stack sí llevan versiones, fechas y valores de la documentación oficial. */
      if (seccion !== '## Notas por stack') {
        assert.doesNotMatch(l, /\d/, `${f}:${i + 1} cifra`);
        assert.doesNotMatch(l, /https?:\/\//, `${f}:${i + 1} dirección fuera de las notas por stack`);
      }
    });
  }
});

test('el catálogo es defensivo: sin técnicas de ataque ni cargas útiles', () => {
  const prohibido = /payloads?\b|exploit(?:s|ing)?\b|shellcode|reverse shell|ransomware|keylogger|backdoor|rootkit|\bCVE-\d|inyecci[oó]n de (?:comandos|código)/i;
  for (const f of [...fichas, 'INDEX.md']) leer(f).split('\n').forEach((l, i) => assert.doesNotMatch(l, prohibido, `${f}:${i + 1}`));
});

test('cada enlace del catálogo apunta a un archivo que existe y cada ficha está en el índice', () => {
  for (const f of [...fichas, 'INDEX.md']) {
    for (const m of leer(f).matchAll(/\]\((?!https?:)([^)#]+)\)/g)) assert.ok(existsSync(join(CAT, m[1])), `${f} → ${m[1]}`);
  }
  const enIndice = new Set([...leer('INDEX.md').matchAll(/\]\(([^)]+\.md)\)/g)].map((m) => m[1]));
  for (const f of fichas) assert.ok(enIndice.has(f), `${f} no está en INDEX.md`);
  for (const e of enIndice) assert.ok(fichas.includes(e), `INDEX.md enlaza ${e}, que no existe`);
});

test('el índice recoge el formato fijo, cómo leer la verificación y dónde están los ejemplos', () => {
  const t = leer('INDEX.md');
  for (const x of [/problemas, no de soluciones/, /no hacer nada/i, /Formato fijo de cada ficha/, /No verificado/, /esqueletos\/VERIFICACION\.md/, /kit\/ejemplos-adr-c\//]) assert.match(t, x, String(x));
});

test('el índice agrupa las dieciocho fichas en los seis grupos pedidos, en orden', () => {
  const t = leer('INDEX.md');
  const grupos = [...t.matchAll(/^## (.+)$/gm)].map((m) => m[1]).filter((g) => GRUPOS.includes(g));
  assert.deepEqual(grupos, GRUPOS);
  const porGrupo = t.split(/^## /m).slice(1).filter((s) => GRUPOS.some((g) => s.startsWith(g)));
  for (const s of porGrupo) assert.equal([...s.matchAll(/\]\(([^)]+\.md)\)/g)].length, 3, `el grupo «${s.split('\n')[0]}» tiene tres fichas`);
});

test('cada ADR de ejemplo del catálogo está enlazado desde alguna ficha', () => {
  const enlazados = new Set(fichas.flatMap((f) => [...leer(f).matchAll(/\]\(\.\.\/ejemplos-adr-c\/([^)]+)\)/g)].map((m) => m[1])));
  const lista = readdirSync(ADRS).filter((f) => f.endsWith('.md') && f !== 'herramienta-simple-primero.md');
  for (const f of lista) assert.ok(enlazados.has(f), `${f} no está enlazado desde ninguna ficha`);
  assert.ok(enlazados.size >= 6);
});

test('los ADR de ejemplo del catálogo del tipo C siguen la forma y enlazan la ficha que existe', () => {
  const lista = readdirSync(ADRS).filter((f) => f.endsWith('.md'));
  assert.ok(lista.length >= 2);
  for (const f of lista) {
    const t = readFileSync(join(ADRS, f), 'utf8');
    for (const s of ['## Contexto', '## Decisión', '## Alternativas descartadas', '## Consecuencias', '## Señal para revisar']) assert.ok(t.includes(s), `${f}: ${s}`);
    for (const m of t.matchAll(/`kit\/catalogo-c\/([^`]+\.md)`/g)) assert.ok(fichas.includes(m[1]), `${f} cita la ficha ${m[1]}, que no existe`);
  }
  for (const f of fichas) for (const m of leer(f).matchAll(/\]\(\.\.\/ejemplos-adr-c\/([^)]+)\)/g)) assert.ok(existsSync(join(ADRS, m[1])), `${f} → ${m[1]}`);
});

test('el instalador copia el catálogo del tipo C a kit/catalogo-c/ (con sus enlaces vivos) y no toca el del tipo B', () => {
  const base = mkdtempSync(join(tmpdir(), 'kit-cat-c-'));
  try {
    const instalar = (tipo) => {
      const destino = join(base, `proyecto-${tipo}`); const respaldo = join(base, `respaldo-${tipo}`);
      mkdirSync(destino); mkdirSync(respaldo);
      const plan = planificar({ destino, tipo, proyecto: 'demo', respaldo, ahora: new Date('2026-10-30T10:00:00Z') });
      aplicar(plan);
      return { destino, destinos: plan.acciones.map((a) => a.destino) };
    };
    const c = instalar('C');
    for (const f of [...FICHAS.map((x) => `${x}.md`), 'INDEX.md']) assert.ok(c.destinos.includes(`kit/catalogo-c/${f}`), f);
    assert.ok(c.destinos.includes('.claude/skills/consultar-catalogo/SKILL.md'));
    assert.ok(!c.destinos.some((d) => d.startsWith('kit/catalogo/')), 'el tipo C no recibe el catálogo del tipo B');
    /* Los enlaces relativos del catálogo instalado apuntan a archivos que existen en el proyecto. */
    for (const f of readdirSync(join(c.destino, 'kit', 'catalogo-c'))) {
      for (const m of readFileSync(join(c.destino, 'kit', 'catalogo-c', f), 'utf8').matchAll(/\]\((?!https?:)([^)#]+)\)/g)) assert.ok(existsSync(join(c.destino, 'kit', 'catalogo-c', m[1])), `instalado: ${f} → ${m[1]}`);
    }
    const skill = readFileSync(join(c.destino, '.claude', 'skills', 'consultar-catalogo', 'SKILL.md'), 'utf8');
    assert.match(skill, /Rama del tipo C/);
    assert.match(skill, /kit\/catalogo-c\/INDEX\.md/);
    const b = instalar('B');
    assert.ok(!b.destinos.some((d) => d.startsWith('kit/catalogo-c/')), 'el tipo B no recibe el catálogo del tipo C');
    assert.ok(b.destinos.includes('kit/catalogo/INDEX.md') && b.destinos.some((d) => d.startsWith('kit/catalogo/errores-respuestas')), 'el catálogo del tipo B sigue igual');
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test('la skill consultar-catalogo tiene la rama del tipo C: ruta, estados de verificación, carácter defensivo y puerta de uso responsable', () => {
  const t = readFileSync(join(raiz, 'types', 'B', 'skills', 'consultar-catalogo', 'SKILL.md'), 'utf8');
  const rama = t.split(/^## Rama del tipo C/m)[1]?.split(/^## /m)[0] ?? '';
  assert.ok(rama.length > 800, 'falta la rama del tipo C');
  for (const x of [/kit\/catalogo-c\/INDEX\.md/, /dieciocho fichas/, /Go, Python y Rust/, /Comprobado ejecutando el esqueleto/, /kit\/ejemplos-adr-c\//, /defensivas/, /no autoriza/, /puerta de uso responsable/, /No hay `kit\/casos-privados\/`/]) assert.match(rama, x, String(x));
  assert.match(t, /^description:.*kit\/catalogo-c\//m);
});

test('el catálogo no copia frases del material privado del tipo C (secuencias de siete palabras)', { skip: !existsSync(join(raiz, 'types', 'C', 'casos-privados')) && 'sin casos-privados locales' }, () => {
  const palabras = (t) => t.toLowerCase().normalize('NFC').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const privado = palabras(readdirSync(join(raiz, 'types', 'C', 'casos-privados')).filter((f) => f.endsWith('.md')).map((f) => readFileSync(join(raiz, 'types', 'C', 'casos-privados', f), 'utf8')).join(' '));
  const ventanas = new Set();
  for (let i = 0; i + 7 <= privado.length; i++) ventanas.add(privado.slice(i, i + 7).join(' '));
  const coincidencias = [];
  for (const f of fichas) {
    const w = palabras(leer(f));
    for (let i = 0; i + 7 <= w.length; i++) if (ventanas.has(w.slice(i, i + 7).join(' '))) coincidencias.push(`${f}:${i}`);
  }
  assert.deepEqual(coincidencias, [], 'frases copiadas del material privado (no se muestran)');
});
