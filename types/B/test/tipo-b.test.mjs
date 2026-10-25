// Tipo B (guía de decisión): manifiesto, ficha, skills, catálogo, ADR de ejemplo, instalación y rechazo de lo privado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { planificar, aplicar, describirPlan, archivosDelManifiesto, cargarManifiesto, InstalacionInvalida, main } from '../../../install/install.mjs';
import { generarSettings, generarKitConfig } from '../../../infra/generate-settings.mjs';
import { MARCADORES, marcadoresUsados } from '../../../install/marcadores.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');
const CAT = join(raiz, 'types', 'B', 'catalogo');
const fichas = readdirSync(CAT).filter((f) => f.endsWith('.md') && f !== 'INDEX.md');
const SECCIONES = ['Problema', 'Señales de que aplica', 'Señales de que sobra', 'Opciones', 'Cómo se comprueba', 'Cómo suele resolverse', 'Anti-patrones frecuentes', 'Notas por stack', 'ADR de ejemplo'];

const tmp = () => { const base = mkdtempSync(join(tmpdir(), 'kit-b-')); for (const d of ['destino', 'respaldo']) mkdirSync(join(base, d)); return { base, destino: join(base, 'destino'), respaldo: join(base, 'respaldo'), limpiar: () => rmSync(base, { recursive: true, force: true }) }; };
const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'ignore', timeout: 20000 });
const AHORA = new Date('2026-10-22T10:00:00Z');
const planB = (e, extra = {}) => planificar({ destino: e.destino, tipo: 'B', proyecto: 'demo', respaldo: e.respaldo, ahora: AHORA, ...extra });
const hayPrivados = existsSync(join(raiz, 'types', 'B', 'casos-privados'));

test('el manifiesto B está activo, es coherente y no instala datos privados reales', () => {
  const m = cargarManifiesto('B');
  assert.equal(m.estado, 'disponible');
  assert.equal(m.perfilExpresion, 'sobrio');
  const archivos = archivosDelManifiesto(m);
  assert.ok(archivos.length > 40);
  assert.ok(!archivos.some((a) => /(^|[\\/])datos-privados\.json$/.test(a.origen)), 'el listado privado del kit no se instala');
  assert.ok(archivos.every((a) => !a.privado || a.destino.startsWith('kit/casos-privados/')));
  for (const g of ['/kit/', '/tests/front/datos-privados.json']) assert.ok(m.gitignore.includes(g), g);
});

test('la ficha B es válida, declara kit.front y no autoriza despliegues', () => {
  const f = JSON.parse(leer('types', 'B', 'ficha-infra.json'));
  f.proyecto = 'demo';
  assert.equal(f.tipo, 'B');
  assert.equal(f.kit.front.config, 'tests/front/front.config.json');
  const s = generarSettings(f);
  assert.ok(generarKitConfig(f).front);
  assert.deepEqual(f.kit.checks, [], 'las pruebas dependen del stack que se elija');
  assert.ok(!s.permissions.allow.some((r) => /deploy/.test(r)));
});

test('las skills del tipo B tienen frontmatter válido y cubren lo pedido', () => {
  for (const [nombre, claves] of Object.entries({
    'evaluar-viabilidad': [/NO-GO/, /REDISEÑO/, /DECISION-VIABILIDAD\.md/, /evidencia/i, /último dato bueno/i, /Ninguna pantalla se bloquea por un tercero/, /Hay que parar/, /esg-trazabilidad/],
    'elegir-stack-proporcional': [/al menos dos alternativas/i, /más simple posible/, /proporcionalidad/i, /anti-sobreingeniería/i, /Qué NO construir todavía/, /Protocolo de cuestionar el encargo/, /una sola vez/, /opción \*\*más simple/, /ADR/],
    'consultar-catalogo': [/kit\/casos-privados/, /Nunca copies/, /no hacer nada/i, /no verificado/i],
  })) {
    const t = leer('types', 'B', 'skills', nombre, 'SKILL.md');
    const fm = t.match(/^---\n([\s\S]*?)\n---\n/)[1];
    assert.match(fm, new RegExp(`^name:\\s*${nombre}$`, 'm'));
    assert.match(fm, /^description:\s*\S/m);
    assert.doesNotMatch(fm, /allowed-tools/);
    assert.ok(t.split('\n').length < 500);
    for (const c of claves) assert.match(t, c, `${nombre}: ${c}`);
  }
});

test('plantillas del tipo B: solo marcadores conocidos', () => {
  for (const f of ['GUIA-DECISION.md', 'plantillas/DECISION-VIABILIDAD.md', 'plantillas/ADR.md']) {
    assert.deepEqual(marcadoresUsados(leer('types', 'B', ...f.split('/'))).filter((m) => !MARCADORES.includes(m)), [], f);
  }
});

test('el catálogo trae las fichas pedidas, con formato fijo, «no hacer nada» y las cuatro pilas', () => {
  assert.ok(fichas.length >= 18, `hay ${fichas.length}`);
  for (const f of ['consistencia-datos-eventos', 'errores-respuestas', 'validacion-bordes', 'dependencias-externas', 'estado-ciclo-vida', 'concurrencia-bloqueo', 'dinero-precios-redondeo', 'integraciones-salientes-webhooks', 'autenticacion-entre-servicios', 'migraciones-sin-parar', 'pruebas-cobertura', 'observabilidad-correlacion', 'despliegue-configuracion', 'estructura-capas-hexagonal', 'multi-inquilino', 'paginacion-busqueda', 'declarado-vs-verificado', 'despliegue-desde-semana-uno'])
    assert.ok(fichas.includes(`${f}.md`), f);
  for (const f of fichas) {
    const t = readFileSync(join(CAT, f), 'utf8');
    const titulos = [...t.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
    assert.deepEqual(titulos, SECCIONES, `${f}: secciones`);
    assert.match(t, /\| No hacer nada/i, `${f}: falta la opción «no hacer nada»`);
    for (const stack of ['Java/Spring', '.NET', 'Node', 'Python']) assert.match(t, new RegExp(`\\*\\*${stack.replace('/', '\\/')}:\\*\\*`), `${f}: nota de ${stack}`);
    assert.match(t, /no verificado/i, `${f}: marca lo no verificado`);
  }
});

test('cada nota por stack está verificada con fecha y fuente, comprobada con el esqueleto o marcada «no verificado»; nada se da por confirmado sin fuente', () => {
  let verificadas = 0;
  for (const f of fichas) {
    const t = readFileSync(join(CAT, f), 'utf8');
    const seccion = t.split(/^## Notas por stack$/m)[1].split(/^## ADR de ejemplo$/m)[0];
    assert.match(seccion, /Verificación \(\d{4}-\d{2}-\d{2}\)/, `${f}: falta la nota de cómo leer la verificación`);
    const lineas = seccion.split('\n').filter((l) => l.startsWith('- **'));
    assert.equal(lineas.length, 4, `${f}: cuatro stacks`);
    for (const l of lineas) {
      const verificada = /Verificado el \d{4}-\d{2}-\d{2} \(\[[^\]]+\]\(https:\/\/[^)\s]+\)/.test(l);
      const probada = /Comprobado ejecutando el esqueleto el \d{4}-\d{2}-\d{2} \(`types\/B\/esqueletos\/VERIFICACION\.md`\)/.test(l);
      const pendiente = /No verificado/.test(l);
      assert.ok(verificada || probada || pendiente, `${f}: nota sin estado de verificación: ${l.slice(0, 40)}`);
      if (/Verificado el/.test(l)) assert.ok(verificada, `${f}: «Verificado el» sin fecha o sin enlace https a la fuente`);
      if (verificada) verificadas++;
      assert.doesNotMatch(l, /http:\/\//, `${f}: fuentes solo por https`);
    }
  }
  assert.ok(verificadas >= 30, `hay ${verificadas} notas verificadas con fuente`);
});

test('el catálogo está en genérico: sin cifras, sin anécdotas y sin términos vetados', () => {
  const anecdota = /\b(hubo|incidentes?|otro equipo|regla de equipo|huecos observados)\b|en producción/i;
  for (const f of [...fichas, 'INDEX.md']) {
    const t = readFileSync(join(CAT, f), 'utf8');
    let seccion = '';
    t.split('\n').forEach((l, i) => {
      if (l.startsWith('## ')) seccion = l;
      assert.doesNotMatch(l, anecdota, `${f}:${i + 1} anécdota`);
      /* Las cifras de casos concretos no entran; las notas por stack sí llevan versiones, fechas y valores de la documentación oficial. */
      if (seccion !== '## Notas por stack') assert.doesNotMatch(l, /\d/, `${f}:${i + 1} cifra`);
    });
  }
});

test('cada enlace del catálogo y del índice apunta a un archivo que existe', () => {
  for (const f of [...fichas, 'INDEX.md']) {
    for (const m of readFileSync(join(CAT, f), 'utf8').matchAll(/\]\((?!https?:)([^)#]+)\)/g)) assert.ok(existsSync(join(CAT, m[1])), `${f} → ${m[1]}`);
  }
  const enIndice = new Set([...readFileSync(join(CAT, 'INDEX.md'), 'utf8').matchAll(/\]\(([^)]+\.md)\)/g)].map((m) => m[1]));
  for (const f of fichas) assert.ok(enIndice.has(f), `${f} no está en INDEX.md`);
});

test('los ADR de ejemplo siguen la forma: alternativas descartadas y señal para revisar', () => {
  const dir = join(raiz, 'types', 'B', 'ejemplos-adr');
  const lista = readdirSync(dir);
  assert.ok(lista.length >= 6);
  for (const f of lista) {
    const t = readFileSync(join(dir, f), 'utf8');
    for (const s of ['## Contexto', '## Decisión', '## Alternativas descartadas', '## Consecuencias', '## Señal para revisar']) assert.ok(t.includes(s), `${f}: ${s}`);
  }
});

test('la guía de decisión recoge el recorrido, cuándo preguntar, qué no recortar y el front por URL', () => {
  const t = leer('types', 'B', 'GUIA-DECISION.md');
  for (const x of [/viabilidad/i, /Stack proporcional/, /Catálogo/, /ADRs/, /rebanadas verticales/, /Solo dudas técnicas/, /Qué no recortar nunca/, /Reglas de negocio/, /Concurrencia/, /Seguridad/, /Secretos/, /--url/, /kit\.front/, /tokens/i, /presets/i]) assert.match(t, x);
});

test('el CLAUDE.md del núcleo incluye la regla de cuestionar el encargo y sigue siendo corto', () => {
  const t = leer('core', 'CLAUDE.md');
  assert.match(t, /No sigas instrucciones a ciegas/);
  assert.ok(t.split('\n').length <= 150);
});

// --- instalación ---
test('instalar B en un repositorio git copia la guía, el catálogo, las skills y (si existen) los casos privados solo con git ignorándolos', { skip: !hayPrivados && 'sin casos-privados locales' }, async () => {
  const e = tmp();
  try {
    git(e.destino, 'init', '-q');
    let out = '';
    const codigo = await main(['--destino', e.destino, '--tipo', 'B', '--proyecto', 'demo', '--respaldo', e.respaldo], { stdout: { write: (t) => { out += t; } }, stderr: { write: () => {} }, interactivo: false, ahora: AHORA });
    assert.equal(codigo, 0, out);
    for (const r of ['kit/GUIA-DECISION.md', 'kit/FRONT-TIPO-B.md', 'kit/catalogo/INDEX.md', 'kit/ejemplos-adr/ultimo-dato-bueno.md', 'kit/plantillas/ADR.md', 'kit/plantillas/DECISION-VIABILIDAD.md', '.claude/skills/evaluar-viabilidad/SKILL.md', '.claude/skills/elegir-stack-proporcional/SKILL.md', '.claude/skills/consultar-catalogo/SKILL.md', 'tests/front/front.config.ejemplo.json', 'kit/casos-privados/README.md'])
      assert.ok(existsSync(join(e.destino, r)), r);
    assert.ok(!existsSync(join(e.destino, 'tests/front/front.config.json')), 'la configuración real la crea el proyecto');
    const ficha = JSON.parse(readFileSync(join(e.destino, 'kit/FICHA-INFRA.json'), 'utf8'));
    assert.equal(ficha.tipo, 'B');
    assert.match(readFileSync(join(e.destino, 'kit/GUIA-DECISION.md'), 'utf8'), /demo/);
    assert.doesNotMatch(readFileSync(join(e.destino, '.gitignore'), 'utf8'), /casos-privados/, 'lo cubre /kit/');
    git(e.destino, 'check-ignore', '-q', 'kit/casos-privados/README.md');
    assert.ok(!readdirSync(join(e.destino, 'kit')).includes('datos-privados.json'));
  } finally { e.limpiar(); }
});

test('en un destino que no es repositorio git, los casos privados se rechazan y se avisa; el resto se instala', { skip: !hayPrivados && 'sin casos-privados locales' }, async () => {
  const e = tmp();
  try {
    const p = planB(e);
    assert.match(describirPlan(p, { dryRun: true }), /RECHAZADO/);
    assert.ok(p.acciones.filter((a) => a.privado).every((a) => a.accion === 'rechazar'));
    const r = aplicar(p);
    assert.ok(r.rechazados.length > 0);
    assert.ok(!existsSync(join(e.destino, 'kit', 'casos-privados')));
    assert.ok(existsSync(join(e.destino, 'kit', 'catalogo', 'INDEX.md')));
    let err = '';
    const e2 = tmp();
    try {
      const c = await main(['--destino', e2.destino, '--tipo', 'B', '--respaldo', e2.respaldo], { stdout: { write: () => {} }, stderr: { write: (t) => { err += t; } }, interactivo: false });
      assert.equal(c, 3);
      assert.match(err, /RECHAZADO/);
    } finally { e2.limpiar(); }
  } finally { e.limpiar(); }
});

test('si git no ignora la ruta y el kit no añade una regla que la cubra, se rechaza aunque sea un repositorio', () => {
  const e = tmp();
  const kit = join(e.base, 'kit-falso');
  try {
    mkdirSync(join(kit, 'types', 'B', 'casos-privados'), { recursive: true });
    writeFileSync(join(kit, 'types', 'B', 'casos-privados', 'nota.md'), 'privado\n');
    writeFileSync(join(kit, 'types', 'B', 'ficha-infra.json'), readFileSync(join(raiz, 'types', 'B', 'ficha-infra.json')));
    writeFileSync(join(kit, 'types', 'B', 'manifest.json'), JSON.stringify({ tipo: 'B', nombre: 'x', estado: 'disponible', ficha: 'types/B/ficha-infra.json', archivos: [{ origen: 'types/B/casos-privados', destino: 'kit/casos-privados', privado: true, versionado: false }], gitignore: [] }));
    git(e.destino, 'init', '-q');
    const p = planB(e, { raizKit: kit });
    assert.ok(p.acciones.find((a) => a.destino === 'kit/casos-privados/nota.md').accion === 'rechazar');
    const r = aplicar(p);
    assert.deepEqual(r.rechazados, ['kit/casos-privados/nota.md']);
    assert.ok(!existsSync(join(e.destino, 'kit', 'casos-privados')));
    // con la regla en el .gitignore del destino sí se copia
    writeFileSync(join(e.destino, '.gitignore'), '/kit/\n');
    const r2 = aplicar(planB(e, { raizKit: kit }));
    assert.deepEqual(r2.rechazados, []);
    assert.ok(existsSync(join(e.destino, 'kit', 'casos-privados', 'nota.md')));
  } finally { e.limpiar(); }
});

test('lo privado solo puede ir a kit/ y los datos privados del kit nunca se instalan', () => {
  const e = tmp();
  const kit = join(e.base, 'kit-falso');
  try {
    mkdirSync(join(kit, 'types', 'B', 'x'), { recursive: true });
    writeFileSync(join(kit, 'types', 'B', 'x', 'a.md'), 'a\n');
    writeFileSync(join(kit, 'types', 'B', 'x', 'datos-privados.json'), '{}\n');
    const man = (entrada) => ({ archivos: [entrada] });
    assert.throws(() => archivosDelManifiesto(man({ origen: 'types/B/x', destino: 'docs/privado', privado: true }), kit), InstalacionInvalida);
    assert.throws(() => archivosDelManifiesto(man({ origen: 'types/B/x', destino: 'kit/x' }), kit), /datos privados/);
    assert.deepEqual(archivosDelManifiesto(man({ origen: 'types/B/nada', destino: 'kit/casos-privados', privado: true }), kit), [], 'si el kit no los trae (clon limpio), no se instalan');
    assert.throws(() => archivosDelManifiesto(man({ origen: 'types/B/nada', destino: 'kit/nada' }), kit), /no existe/);
  } finally { e.limpiar(); }
});

test('--dry-run y --diff de B no escriben nada y no muestran el contenido de lo privado', async () => {
  const e = tmp();
  try {
    const salida = { out: '' };
    for (const flag of ['--dry-run', '--diff']) {
      const c = await main(['--destino', e.destino, '--tipo', 'B', '--respaldo', e.respaldo, flag], { stdout: { write: (t) => { salida.out += t; } }, stderr: { write: () => {} }, interactivo: false, ahora: AHORA });
      assert.equal(c, 0);
    }
    assert.deepEqual(readdirSync(e.destino), []);
    assert.deepEqual(readdirSync(e.respaldo), []);
    assert.match(salida.out, /kit\/catalogo\/INDEX\.md/);
  } finally { e.limpiar(); }
});

test('el catálogo no copia frases del material privado (secuencias de siete palabras)', { skip: !hayPrivados && 'sin casos-privados locales' }, (t) => {
  const palabras = (x) => x.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const privado = palabras(readdirSync(join(raiz, 'types', 'B', 'casos-privados')).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => leer('types', 'B', 'casos-privados', f)).join(' '));
  if (!privado.length) return t.diagnostic('no hay material privado que comparar');
  const N = 7;
  const conocidas = new Set();
  for (let i = 0; i + N <= privado.length; i++) conocidas.add(privado.slice(i, i + N).join(' '));
  const hallazgos = [];
  for (const f of fichas) {
    readFileSync(join(CAT, f), 'utf8').split('\n').forEach((linea, i) => {
      if (i === 0) return; // el título lo fijó el encargo
      const w = palabras(linea);
      for (let k = 0; k + N <= w.length; k++) if (conocidas.has(w.slice(k, k + N).join(' '))) { hallazgos.push(`${f}:${i + 1}`); break; }
    });
  }
  assert.deepEqual(hallazgos, [], 'líneas con siete palabras seguidas iguales al material privado: reescríbelas');
});

test('un archivo privado que el destino ya rastrea con git no se sobrescribe aunque coincida con una regla de .gitignore', () => {
  const e = tmp();
  const kit = join(e.base, 'kit-falso');
  try {
    mkdirSync(join(kit, 'types', 'B', 'casos-privados'), { recursive: true });
    writeFileSync(join(kit, 'types', 'B', 'casos-privados', 'nota.md'), 'privado\n');
    writeFileSync(join(kit, 'types', 'B', 'ficha-infra.json'), readFileSync(join(raiz, 'types', 'B', 'ficha-infra.json')));
    writeFileSync(join(kit, 'types', 'B', 'manifest.json'), JSON.stringify({ tipo: 'B', nombre: 'x', estado: 'disponible', ficha: 'types/B/ficha-infra.json', archivos: [{ origen: 'types/B/casos-privados', destino: 'kit/casos-privados', privado: true, versionado: false }], gitignore: ['/kit/'] }));
    git(e.destino, 'init', '-q');
    mkdirSync(join(e.destino, 'kit', 'casos-privados'), { recursive: true });
    writeFileSync(join(e.destino, 'kit', 'casos-privados', 'nota.md'), 'versionado por error\n');
    git(e.destino, 'add', '-f', 'kit/casos-privados/nota.md');
    rmSync(join(e.destino, 'kit', 'casos-privados', 'nota.md'));
    const p = planB(e, { raizKit: kit, forzar: ['kit/casos-privados/nota.md'] });
    assert.equal(p.acciones.find((a) => a.destino === 'kit/casos-privados/nota.md').accion, 'rechazar');
    const r = aplicar(p);
    assert.deepEqual(r.rechazados, ['kit/casos-privados/nota.md']);
    assert.ok(!existsSync(join(e.destino, 'kit', 'casos-privados', 'nota.md')));
  } finally { e.limpiar(); }
});

test('lo privado solo puede instalarse en kit/casos-privados/ (nada de rutas con «..» ni otras carpetas de kit/)', () => {
  const e = tmp();
  const kit = join(e.base, 'kit-falso');
  try {
    mkdirSync(join(kit, 'types', 'B', 'x'), { recursive: true });
    writeFileSync(join(kit, 'types', 'B', 'x', 'a.md'), 'a\n');
    for (const destino of ['kit/../fuera', 'kit/otra', 'kit']) assert.throws(() => archivosDelManifiesto({ archivos: [{ origen: 'types/B/x', destino, privado: true }] }, kit), InstalacionInvalida, destino);
  } finally { e.limpiar(); }
});
