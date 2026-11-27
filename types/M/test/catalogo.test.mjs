// Catálogo de problemas del tipo M (ADR 0024): formato fijo, «no hacer nada», hechos citados con su estado real,
// requisitos de referencia, genérico (sin cifras, direcciones ni anécdotas), enlaces vivos en el kit y en el proyecto,
// ADR de ejemplo, instalación en kit/catalogo-m/ sin tocar los de B ni C y rama del tipo M en consultar-catalogo.
// No usa la red. La fuente y la fecha de cada hecho las vigila plataforma.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planificar, aplicar, main } from '../../../install/install.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CAT = join(raiz, 'types', 'M', 'catalogo');
const ADRS = join(raiz, 'types', 'M', 'ejemplos-adr-m');
const SECCIONES = ['Problema', 'Señales de que aplica', 'Señales de que sobra', 'Opciones', 'Cómo se comprueba', 'Cómo suele resolverse', 'Anti-patrones frecuentes', 'Hechos en que se apoya', 'Requisitos de referencia', 'ADR de ejemplo'];
/* Reparto del catálogo: grupo → ficha → requisitos de referencia que toca. */
const GRUPOS = {
  'Sistema y segundo plano': { 'servicio-primer-plano-interrupciones': ['R1'], 'permisos-minimos-en-contexto': ['R6'], 'bateria-rendimiento-tamano': ['R1'] },
  'Datos, privacidad y confianza': { 'ubicacion-privacidad': ['R6', 'R2'], 'almacenamiento-local-secretos': ['R6'], 'cuenta-registro-integridad': ['R4'], 'observabilidad-sin-datos-personales': ['R6'] },
  'Red y servidor': { 'tiempo-real-mensajeria-push': ['R2'], 'sin-red-ultimo-estado': ['R4'], 'versiones-compatibilidad-servidor': ['R3', 'R4'], 'acceso-suscripcion-solo-consumo': ['R4'] },
  'Personas y tienda': { 'contenido-usuarios-moderacion': ['R3'], 'accesibilidad-uso-en-marcha': ['R7'], 'publicacion-tienda': ['R5'] },
  'Construcción': { 'arquitectura-app': [], 'pruebas-equipo-real': ['R1', 'R2', 'R7'] },
};
const REQUISITOS = Object.assign({}, ...Object.values(GRUPOS));
const FICHAS = Object.keys(REQUISITOS);
const fichas = readdirSync(CAT).filter((f) => f.endsWith('.md') && f !== 'INDEX.md').sort();
const leer = (f) => readFileSync(join(CAT, f), 'utf8');
const del = (...p) => readFileSync(join(raiz, ...p), 'utf8');
const seccion = (t, titulo) => t.split(new RegExp(`^## ${titulo}$`, 'm'))[1]?.split(/^## /m)[0] ?? '';
const filas = new Map(del('types', 'M', 'PLATAFORMA-ANDROID.md').split('\n').map((l) => [l.match(/^- \*\*\[(P-[A-Z]+-\d+)\]\*\* /)?.[1], l]).filter(([id]) => id));
const sinCitas = (l) => l.replace(/\[P-[A-Z]+-\d+\]/g, '').replace(/\bR[1-7]\b/g, '');
const enlaces = (t) => [...t.matchAll(/\]\((?!https?:)([^)#]+)\)/g)].map((m) => m[1]);

test('el catálogo trae las dieciséis fichas, cada una con el formato fijo, «no hacer nada» y todas las secciones con contenido', () => {
  assert.equal(FICHAS.length, 16);
  assert.deepEqual(fichas, FICHAS.map((f) => `${f}.md`).sort(), 'las fichas del reparto, ni más ni menos');
  for (const f of fichas) {
    const t = leer(f);
    assert.match(t, /^# \S/, `${f}: título`);
    assert.deepEqual([...t.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim()), SECCIONES, `${f}: secciones`);
    for (const s of SECCIONES) assert.ok(seccion(t, s).trim().length > 30, `${f}: «${s}» vacía`);
    const opciones = seccion(t, 'Opciones');
    assert.match(opciones, /^\| Opción \| Costo \| Cuándo \|$/m, `${f}: tabla de opciones`);
    assert.match(opciones, /^\| No hacer nada/m, `${f}: falta la opción «no hacer nada»`);
    assert.ok(opciones.split('\n').filter((l) => l.startsWith('|')).length >= 5, `${f}: al menos tres opciones`);
    for (const s of ['Señales de que aplica', 'Señales de que sobra', 'Cómo se comprueba', 'Anti-patrones frecuentes']) assert.ok((seccion(t, s).match(/^- /gm) ?? []).length >= 2, `${f}: «${s}» necesita al menos dos puntos`);
  }
});

test('cada hecho citado existe y la ficha dice su estado real: «No verificado» si la fila no lo está, y solo entonces', () => {
  let citados = 0; let pendientes = 0;
  for (const f of fichas) {
    const t = leer(f);
    for (const [id] of t.matchAll(/\bP-[A-Z]+-\d+\b/g)) assert.ok(filas.has(id), `${f} cita ${id}, que no existe`);
    const lineas = seccion(t, 'Hechos en que se apoya').split('\n').filter((l) => l.trim());
    assert.ok(lineas.length >= 5, `${f}: pocos hechos`);
    for (const l of lineas) {
      assert.match(l, /^- (No verificado )?\[P-[A-Z]+-\d+\](, \[P-[A-Z]+-\d+\])*: \S/, `${f}: línea de hechos sin la forma esperada: ${l.slice(0, 60)}`);
      const marcada = l.startsWith('- No verificado ');
      for (const [, id] of l.split(': ')[0].matchAll(/\[(P-[A-Z]+-\d+)\]/g)) {
        const sinVerificar = /No verificado/.test(filas.get(id));
        assert.equal(marcada, sinVerificar, `${f}: ${id} ${sinVerificar ? 'no está verificado y la ficha no lo dice' : 'está verificado y la ficha lo marca como no verificado'}`);
        citados += 1; if (marcada) pendientes += 1;
      }
    }
    /* Fuera de la sección de hechos solo se citan filas verificadas: una pendiente no se cuela como razón. */
    for (const [, id] of t.replace(seccion(t, 'Hechos en que se apoya'), '').matchAll(/\[(P-[A-Z]+-\d+)\]/g)) assert.doesNotMatch(filas.get(id), /No verificado/, `${f}: usa ${id} (no verificado) fuera de «Hechos en que se apoya»`);
  }
  assert.ok(citados > 120, `solo ${citados} citas`);
  assert.ok(pendientes >= 10, 'lo que no se pudo comprobar se declara en las fichas');
});

test('cada ficha enlaza a sus requisitos de referencia y los siete tienen ficha', () => {
  const guia = del('types', 'M', 'GUIA-DECISION.md');
  for (const f of FICHAS) {
    const s = seccion(leer(`${f}.md`), 'Requisitos de referencia');
    assert.ok(enlaces(s).includes('../GUIA-DECISION.md'), `${f}: sin enlace a la guía`);
    assert.deepEqual([...new Set(s.match(/\bR[1-7]\b/g) ?? [])].sort(), [...REQUISITOS[f]].sort(), `${f}: requisitos`);
    if (!REQUISITOS[f].length) assert.match(s, /Ninguno en particular/, f);
  }
  const cubiertos = new Set(Object.values(REQUISITOS).flat());
  for (let n = 1; n <= 7; n++) {
    assert.ok(cubiertos.has(`R${n}`), `R${n} sin ficha`);
    assert.match(guia, new RegExp(`^### R${n}\\. `, 'm'), `la guía define R${n}`);
  }
});

test('el catálogo y sus ejemplos están en genérico: sin cifras, direcciones, código, anécdotas ni alojamiento', () => {
  const anecdota = /\b(hubo|incidentes?|otro equipo|regla de equipo|huecos observados)\b|en producción/i;
  const textos = [...[...fichas, 'INDEX.md'].map((f) => [`catalogo/${f}`, leer(f)]), ...readdirSync(ADRS).map((f) => [`ejemplos-adr-m/${f}`, readFileSync(join(ADRS, f), 'utf8')])];
  for (const [nombre, t] of textos) t.split('\n').forEach((l, i) => {
    assert.doesNotMatch(l, anecdota, `${nombre}:${i + 1} anécdota`);
    assert.doesNotMatch(l, /```/, `${nombre}:${i + 1} bloque de código`);
    assert.doesNotMatch(sinCitas(l), /\d/, `${nombre}:${i + 1} cifra: va en los hechos de plataforma`);
    assert.doesNotMatch(l, /https?:\/\//, `${nombre}:${i + 1} dirección: va en los hechos de plataforma`);
    assert.doesNotMatch(l, /github|repositorio/i, `${nombre}:${i + 1}`);
  });
});

test('el índice agrupa las fichas en cinco grupos, en orden, con los mismos requisitos que cada ficha', () => {
  const t = leer('INDEX.md');
  for (const x of [/problemas, no de soluciones/, /«no hacer nada»/, /Formato fijo de cada ficha/, /No verificado/, /\(\.\.\/PLATAFORMA-ANDROID\.md\)/, /No hay notas por stack/, /\(\.\.\/GUIA-DECISION\.md\)/, /`consultar-catalogo` \(rama del tipo M\)/, /kit\/ejemplos-adr-m\//]) assert.match(t, x, String(x));
  for (const s of SECCIONES) assert.ok(t.includes(s), `el formato del índice no nombra «${s}»`);
  const titulos = [...t.matchAll(/^## (.+)$/gm)].map((m) => m[1]).filter((g) => g in GRUPOS);
  assert.deepEqual(titulos, Object.keys(GRUPOS));
  for (const [grupo, esperadas] of Object.entries(GRUPOS)) {
    const lineas = seccion(t, grupo).split('\n').filter((l) => l.startsWith('- ['));
    assert.deepEqual(lineas.map((l) => l.match(/\]\(([^)]+)\.md\)/)[1]), Object.keys(esperadas), grupo);
    for (const l of lineas) {
      const f = l.match(/\]\(([^)]+)\.md\)/)[1];
      assert.deepEqual([...(l.split('.md)')[1].match(/\bR[1-7]\b/g) ?? [])].sort(), [...esperadas[f]].sort(), `índice: requisitos de ${f}`);
      assert.equal(l.match(/^- \[([^\]]+)\]/)[1], leer(`${f}.md`).match(/^# (.+)$/m)[1].trim(), `índice: título de ${f}`);
    }
  }
});

test('cada enlace del catálogo apunta a un archivo que existe', () => {
  for (const f of [...fichas, 'INDEX.md']) for (const e of enlaces(leer(f))) assert.ok(existsSync(join(CAT, e)), `${f} → ${e}`);
});

test('los ADR de ejemplo siguen la forma, citan fichas que existen y todos están enlazados', () => {
  const lista = readdirSync(ADRS).filter((f) => f.endsWith('.md'));
  assert.equal(lista.length, 8);
  for (const f of lista) {
    const t = readFileSync(join(ADRS, f), 'utf8');
    assert.match(t, /^# ADR de ejemplo\. \S/, f);
    assert.match(t, /Úsalo como forma, no como texto\./, f);
    for (const s of ['## Contexto', '## Decisión', '## Alternativas descartadas', '## Lo que no se construye todavía', '## Consecuencias', '## Señal para revisar']) assert.ok(t.includes(s), `${f}: ${s}`);
    const citadas = [...t.matchAll(/`kit\/catalogo-m\/([^`]+\.md)`/g)].map((m) => m[1]);
    assert.ok(citadas.length, `${f} no cita ninguna ficha`);
    for (const c of citadas) assert.ok(fichas.includes(c), `${f} cita ${c}, que no existe`);
  }
  const enlazados = new Set(fichas.flatMap((f) => enlaces(seccion(leer(f), 'ADR de ejemplo')).map((e) => e.replace('../ejemplos-adr-m/', ''))));
  for (const f of lista) assert.ok(enlazados.has(f), `${f} no está enlazado desde ninguna ficha`);
  /* El ejemplo que una ficha enlaza habla de ella, o la ficha dice que no tiene. */
  for (const f of fichas) {
    const s = seccion(leer(f), 'ADR de ejemplo');
    if (!enlaces(s).length) assert.match(s, /Sin ejemplo: usa `kit\/plantillas\/ADR\.md`/, f);
  }
});

const AHORA = new Date('2026-11-26T10:00:00Z');
function entorno() {
  const base = mkdtempSync(join(tmpdir(), 'kit-cat-m-'));
  const crear = (tipo) => {
    const destino = join(base, `proyecto-${tipo}`); const respaldo = join(base, `respaldo-${tipo}`);
    mkdirSync(destino); mkdirSync(respaldo);
    return { destino, respaldo };
  };
  return { base, crear, limpiar: () => rmSync(base, { recursive: true, force: true }) };
}
const plan = (tipo, d, extra = {}) => planificar({ destino: d.destino, tipo, proyecto: 'demo', respaldo: d.respaldo, ahora: AHORA, ...extra });

test('el tipo M instala su catálogo en kit/catalogo-m/ con los enlaces vivos; B y C no lo reciben e instalan el suyo tal como está en el kit', () => {
  const e = entorno();
  try {
    const m = e.crear('M'); const p = plan('M', m); aplicar(p);
    const destinos = p.acciones.map((a) => a.destino);
    for (const f of [...fichas, 'INDEX.md']) assert.ok(destinos.includes(`kit/catalogo-m/${f}`), f);
    for (const f of readdirSync(ADRS)) assert.ok(destinos.includes(`kit/ejemplos-adr-m/${f}`), f);
    assert.ok(destinos.includes('.claude/skills/consultar-catalogo/SKILL.md'));
    assert.ok(!destinos.some((d) => /^kit\/(catalogo|catalogo-c|ejemplos-adr|ejemplos-adr-c|casos-privados)\//.test(d)), destinos.join(' '));
    for (const carpeta of ['catalogo-m', 'ejemplos-adr-m']) for (const f of readdirSync(join(m.destino, 'kit', carpeta))) {
      const t = readFileSync(join(m.destino, 'kit', carpeta, f), 'utf8');
      assert.doesNotMatch(t, /\{\{[a-z_]+\}\}/, `${f}: marcador sin sustituir`);
      for (const enlace of enlaces(t)) assert.ok(existsSync(join(m.destino, 'kit', carpeta, enlace)), `instalado: ${carpeta}/${f} → ${enlace}`);
    }
    /* Lo que las fichas citan llega al proyecto: cada identificador está en los hechos instalados. */
    const instalados = readFileSync(join(m.destino, 'kit', 'PLATAFORMA-ANDROID.md'), 'utf8');
    for (const f of fichas) for (const [id] of leer(f).matchAll(/\bP-[A-Z]+-\d+\b/g)) assert.ok(instalados.includes(`**[${id}]**`), id);
    for (const [tipo, carpeta] of [['B', 'catalogo'], ['C', 'catalogo-c']]) {
      const o = e.crear(tipo); const po = plan(tipo, o); aplicar(po);
      assert.ok(!po.acciones.some((a) => /^kit\/(catalogo-m|ejemplos-adr-m)\//.test(a.destino)), tipo);
      const origen = join(raiz, 'types', tipo, 'catalogo');
      assert.deepEqual(readdirSync(join(o.destino, 'kit', carpeta)).sort(), readdirSync(origen).sort(), `catálogo del tipo ${tipo}`);
      for (const f of readdirSync(origen)) assert.equal(readFileSync(join(o.destino, 'kit', carpeta, f), 'utf8'), readFileSync(join(origen, f), 'utf8'), `${tipo}: ${f}`);
    }
    const a = plan('A', e.crear('A')).acciones.map((x) => x.destino);
    assert.ok(!a.some((d) => /catalogo/.test(d)));
  } finally { e.limpiar(); }
});

test('--dry-run anuncia el catálogo sin escribir; --diff muestra una ficha editada y reinstalar no la pisa', async () => {
  const e = entorno();
  try {
    const m = e.crear('M');
    let out = '';
    const io = { stdout: { write: (t) => { out += t; } }, stderr: { write: (t) => { out += t; } }, interactivo: false, ahora: AHORA };
    const args = ['--destino', m.destino, '--tipo', 'M', '--respaldo', m.respaldo];
    assert.equal(await main([...args, '--dry-run'], io), 0);
    for (const d of ['kit/catalogo-m/INDEX.md', 'kit/catalogo-m/ubicacion-privacidad.md', 'kit/ejemplos-adr-m/ambito-unico-de-avisos.md', '.claude/skills/consultar-catalogo/SKILL.md']) assert.ok(out.includes(d), d);
    assert.deepEqual(readdirSync(m.destino), []);
    aplicar(plan('M', m));
    const ficha = join(m.destino, 'kit', 'catalogo-m', 'ubicacion-privacidad.md');
    writeFileSync(ficha, `${readFileSync(ficha, 'utf8')}\nnota propia del proyecto\n`);
    out = '';
    assert.equal(await main([...args, '--diff'], io), 0);
    assert.match(out, /kit\/catalogo-m\/ubicacion-privacidad\.md[\s\S]*nota propia del proyecto/);
    assert.equal(plan('M', m).acciones.find((x) => x.destino === 'kit/catalogo-m/ubicacion-privacidad.md').accion, 'omitir');
    aplicar(plan('M', m));
    assert.match(readFileSync(ficha, 'utf8'), /nota propia del proyecto/);
  } finally { e.limpiar(); }
});

test('la skill consultar-catalogo tiene la rama del tipo M y conserva las rutas de B y C', () => {
  const t = del('types', 'B', 'skills', 'consultar-catalogo', 'SKILL.md');
  const descripcion = t.match(/^description: (.*)$/m)[1];
  assert.match(descripcion, /kit\/catalogo-m\//);
  assert.match(descripcion, /kit\/catalogo-c\//);
  assert.ok(descripcion.length <= 1024, `descripción de ${descripcion.length} caracteres`);
  const rama = seccion(t, 'Rama del tipo M \\(aplicaciones móviles\\)');
  assert.ok(rama.length > 800, 'falta la rama del tipo M');
  for (const x of [/kit\/catalogo-m\/INDEX\.md/, /dieciséis fichas en cinco grupos/, /kit\/ejemplos-adr-m\//, /No hay notas por stack/, /kit\/PLATAFORMA-ANDROID\.md/, /«No verificado» se contrasta o se mide/, /R1 a R7/, /leerla no lo cumple/, /La ficha no elige el stack/, /lo decide el humano/, /se piden al humano/, /No hay `kit\/casos-privados\/` en el tipo M/, /no fuerces una ficha/]) assert.match(rama, x, String(x));
  assert.match(seccion(t, 'Rama del tipo C \\(herramientas y software de sistemas\\)'), /kit\/catalogo-c\/INDEX\.md/);
  assert.match(seccion(t, 'Cómo se usa'), /kit\/catalogo\/INDEX\.md/);
});

test('la guía presenta el catálogo y lo quita de lo que falta', () => {
  const guia = del('types', 'M', 'GUIA-DECISION.md');
  assert.doesNotMatch(guia, /Todavía no trae catálogo|llega después/);
  const s = seccion(guia, 'Catálogo de problemas');
  for (const x of [/problemas, no de soluciones/, /kit\/catalogo-m\/INDEX\.md/, /`consultar-catalogo`/, /«no hacer nada»/, /kit\/ejemplos-adr-m\//, /No elige el stack, no pone datos de negocio y no demuestra que un requisito se cumpla/]) assert.match(s, x, String(x));
  assert.doesNotMatch(guia.split('Lo que falta todavía')[1].split('\n## ')[0], /catálogo/);
});

test('los matices que la revisión pidió están en los hechos y en las fichas', () => {
  const f = (id) => filas.get(id);
  assert.match(f('P-PER-6'), /servicio en primer plano[\s\S]*hasta que el servicio pare[\s\S]*el proceso de la app termina/);
  assert.match(f('P-PER-5'), /no se enlaza a los ajustes para convencer/);
  assert.match(f('P-UBI-10'), /geocercas[\s\S]*segundo plano/);
  assert.match(leer('servicio-primer-plano-interrupciones.md'), /Geocercas del sistema[^\n]*Alto: exigen ubicación en segundo plano/);
  assert.match(f('P-ALM-4'), /KeyChain/);
  assert.match(leer('publicacion-tienda.md'), /La ficha de la tienda completa[\s\S]*\[P-PUB-11\], \[P-PUB-12\]/);
  assert.doesNotMatch(leer('versiones-compatibilidad-servidor.md'), /solo en instalaciones de la tienda/);
});

test('el ADR 0024 recoge el reparto, las decisiones, lo descartado, la fuente del proyecto de referencia y lo no verificado', () => {
  const t = del('docs', 'adr', '0024-catalogo-de-problemas-del-tipo-m.md');
  assert.match(t, /^# 0024\./);
  for (const x of [/Estado: aceptada/, /## Contexto/, /## Decisión/, /\*\*Dieciséis fichas en cinco grupos\.\*\*/, /\*\*Sin notas por stack\.\*\*/, /## Alternativas descartadas/, /## Consecuencias/, /## Sin hacer/, /github\.com\/android\/nowinandroid\/blob\/main\/docs\/ArchitectureLearningJourney\.md/]) assert.match(t, x, String(x));
});
