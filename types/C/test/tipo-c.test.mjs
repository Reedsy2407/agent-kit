// Tipo C (herramientas y software de sistemas) como guía de decisión, en construcción: manifiesto, ramas de las skills,
// puerta de uso responsable, ejemplos abstractos (GO, REDISEÑO, NO-GO), ADR de ejemplo y ausencia de contenido de ataque.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { planificar, cargarManifiesto } from '../../../install/install.mjs';
import { MARCADORES, marcadoresUsados } from '../../../install/marcadores.mjs';
import { veredictoTipoC } from './lib/veredicto.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');
const CASOS = join(raiz, 'types', 'C', 'ejemplos-viabilidad');
const casos = readdirSync(CASOS).filter((f) => f.endsWith('.json')).map((f) => ({ archivo: f, ...JSON.parse(readFileSync(join(CASOS, f), 'utf8')) }));
const viabilidad = leer('types', 'B', 'skills', 'evaluar-viabilidad', 'SKILL.md');
const stack = leer('types', 'B', 'skills', 'elegir-stack-proporcional', 'SKILL.md');
const seccion = (texto, titulo) => texto.split(new RegExp(`^## ${titulo}`, 'm'))[1]?.split(/^## /m)[0] ?? '';
const ramaViabilidad = seccion(viabilidad, '7\\. Rama del tipo C');
const ramaStack = seccion(stack, '8\\. Rama del tipo C');

test('el manifiesto C está disponible (C2) y el instalador lo instala sin esqueleto mientras no se declare preset', () => {
  const m = cargarManifiesto('C');
  assert.equal(m.tipo, 'C');
  assert.equal(m.estado, 'disponible');
  const base = mkdtempSync(join(tmpdir(), 'kit-c-'));
  try {
    mkdirSync(join(base, 'destino')); mkdirSync(join(base, 'respaldo'));
    const plan = planificar({ destino: join(base, 'destino'), tipo: 'C', proyecto: 'demo', respaldo: join(base, 'respaldo'), ahora: new Date('2026-10-29T10:00:00Z') });
    assert.equal(plan.pendienteEtapa2, false);
    assert.ok(plan.acciones.length > 20 && !plan.esqueleto, 'instala el núcleo y la guía, sin esqueleto');
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test('evaluar-viabilidad tiene la rama C: puerta de uso responsable, seis ejes y tres veredictos', () => {
  assert.ok(ramaViabilidad.length > 1500, 'falta la sección 7');
  for (const x of [/GO\*\*, \*\*REDISEÑO\*\* y \*\*NO-GO/, /no hay GO-CONDICIONADO/i, /Puerta de uso responsable/, /sin excepciones/, /No existe un tipo D/,
    /lista explícita de objetivos permitidos/, /registro de actividad/, /solo lectura/, /quién la usa|\*\*quién\*\*/, /sobre qué sistemas/, /qué puede hacer a sistemas ajenos/,
    /Plataformas objetivo/, /Privilegios y radio de daño/, /socket de control de un runtime de contenedores/, /Modelo de amenazas de la entrada/,
    /Distribución y actualización/, /Acceso a lo externo/, /Mantenimiento/, /por cuánto tiempo/, /ni cargas útiles/, /kit\/ejemplos-viabilidad-c/]) assert.match(ramaViabilidad, x, String(x));
  assert.match(viabilidad, /^description:.*tipo C/m);
});

test('elegir-stack-proporcional tiene la rama C: dos alternativas entre Go, Rust y Python, seis criterios y ADR con lo descartado', () => {
  assert.ok(ramaStack.length > 1500, 'falta la sección 8');
  for (const x of [/Mínimo dos alternativas entre Go, Rust y Python/, /la más simple primero/, /Binario único/, /Rendimiento medido/, /Seguridad de memoria/, /Ecosistema/,
    /Curva de aprendizaje/, /Costo de mantenimiento/, /«Será lento» sin medir/, /ADR con lo descartado y por qué/, /kit\/ejemplos-adr-c/, /Qué NO construir todavía/, /Criptografía propia/]) assert.match(ramaStack, x, String(x));
});

test('la tabla de la skill y la referencia ejecutable coinciden con los tres ejemplos: GO, REDISEÑO y NO-GO', () => {
  assert.deepEqual(casos.map((c) => c.esperado).sort(), ['GO', 'NO-GO', 'REDISEÑO']);
  for (const c of casos) assert.equal(veredictoTipoC(c).veredicto, c.esperado, c.archivo);
  const rediseno = casos.find((c) => c.esperado === 'REDISEÑO');
  assert.equal(rediseno.ejes.privilegios.nivel, 'excesivo', 'el REDISEÑO de ejemplo es por privilegios excesivos');
  assert.ok(veredictoTipoC(rediseno).motivos.some((m) => /privilegios excesivos/.test(m)));
  assert.ok(veredictoTipoC(casos.find((c) => c.esperado === 'NO-GO')).motivos.some((m) => /ofensiva/.test(m)));
});

test('la puerta de uso responsable: ofensiva sin uso defensivo es NO-GO aunque todo lo demás esté impecable; la defensiva exige sus declaraciones y valores por defecto', () => {
  const go = casos.find((c) => c.esperado === 'GO');
  const clon = (cambios) => structuredClone({ ...go, puerta: { ...go.puerta, ...cambios } });
  assert.equal(veredictoTipoC(clon({ funcionPrincipal: 'atacar-escanear-explotar-terceros', usoDefensivoClaro: false })).veredicto, 'NO-GO');
  assert.equal(veredictoTipoC(clon({ funcionPrincipal: 'atacar-escanear-explotar-terceros', usoDefensivoClaro: true })).veredicto, 'GO', 'de doble uso con todo declarado pasa la puerta');
  for (const falta of [{ usuario: '' }, { autorizacion: '' }, { efectoEnAjenos: '' }, { porDefecto: { ...go.puerta.porDefecto, listaObjetivos: false } }, { porDefecto: { ...go.puerta.porDefecto, registro: false } }, { porDefecto: { ...go.puerta.porDefecto, soloLectura: false } }])
    assert.equal(veredictoTipoC(clon({ funcionPrincipal: 'atacar-escanear-explotar-terceros', usoDefensivoClaro: true, ...falta })).veredicto, 'REDISEÑO', JSON.stringify(falta));
});

test('los demás ejes: cada uno que falta es REDISEÑO; el privilegio total sin acotar y sin alternativa es NO-GO; acotado y sin alternativa pasa', () => {
  const go = casos.find((c) => c.esperado === 'GO');
  const con = (ruta, valor) => { const c = structuredClone(go); let o = c.ejes; const ks = ruta.split('.'); for (const k of ks.slice(0, -1)) o = o[k]; o[ks.at(-1)] = valor; return c; };
  for (const [ruta, valor] of [['amenazasEntrada.modeloEscrito', false], ['distribucion.integridad', false], ['externo.evidencia', false], ['mantenimiento.responsable', false]])
    assert.equal(veredictoTipoC(con(ruta, valor)).veredicto, 'REDISEÑO', ruta);
  const total = (alt, acotado) => { const c = structuredClone(go); c.ejes.privilegios = { nivel: 'excesivo', alternativaMenor: alt, acotado }; return c; };
  assert.equal(veredictoTipoC(total(false, false)).veredicto, 'NO-GO');
  assert.equal(veredictoTipoC(total(true, false)).veredicto, 'REDISEÑO');
  assert.equal(veredictoTipoC(total(false, true)).veredicto, 'GO');
});

test('cada ejemplo trae la forma completa, con la descripción abstracta', () => {
  for (const c of casos) {
    for (const k of ['titulo', 'descripcion', 'puerta', 'ejes', 'esperado']) assert.ok(c[k], `${c.archivo}: ${k}`);
    for (const k of ['plataformas', 'privilegios', 'amenazasEntrada', 'distribucion', 'externo', 'mantenimiento']) assert.ok(c.ejes[k], `${c.archivo}: eje ${k}`);
    assert.match(c.titulo, /ejemplo abstracto/i, c.archivo);
  }
});

test('lo versionado del tipo C no describe técnicas de ataque ni cargas útiles: sin bloques de código, direcciones ni vocabulario de explotación', () => {
  const prohibido = /https?:\/\/|\bCVE-\d|shellcode|reverse shell|ransomware|keylogger|backdoor|rootkit|exploit(?:s|ing)?\b|payloads?\b/i;
  /* Solo lo que git versionaría: las cachés y compilaciones locales ignoradas (target/, __pycache__) no son del kit. */
  const versionables = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'types/C'], { cwd: raiz, encoding: 'utf8', timeout: 20000 }).split('\0').filter(Boolean);
  const archivos = versionables.map((r) => join(raiz, r)).filter((r) => !r.startsWith(join(raiz, 'types', 'C', 'test')));
  archivos.push(join(raiz, 'docs', 'adr', '0018-tipo-c-como-guia-de-decision.md'));
  assert.ok(archivos.length >= 7);
  /* Los bloques de código solo valen en los esqueletos (ejemplos de uso); en la guía, los ejemplos y los ADR no hay código. */
  const sinCodigo = (a) => !a.startsWith(join(raiz, 'types', 'C', 'esqueletos'));
  for (const a of archivos) readFileSync(a, 'utf8').split('\n').forEach((l, i) => {
    assert.doesNotMatch(l, prohibido, `${a.slice(raiz.length + 1)}:${i + 1}`);
    if (sinCodigo(a)) assert.doesNotMatch(l, /```/, `${a.slice(raiz.length + 1)}:${i + 1} bloque de código`);
  });
});

test('el ADR de ejemplo del tipo C tiene las alternativas descartadas (Go, Python y Rust), lo que no se construye y la señal para revisar', () => {
  const t = leer('types', 'C', 'ejemplos-adr', 'herramienta-simple-primero.md');
  for (const s of ['## Contexto', '## Decisión', '## Alternativas descartadas', '## Lo que no se construye todavía', '## Consecuencias', '## Señal para revisar']) assert.ok(t.includes(s), s);
  for (const l of ['Go', 'Python', 'Rust']) assert.match(t, new RegExp(`\\| ${l}`), l);
});

test('la guía del tipo C recoge qué es, qué lo distingue, qué queda fuera, «no hay tipo D» y el estado en construcción', () => {
  const t = leer('types', 'C', 'GUIA-DECISION.md');
  for (const x of [/en construcción/i, /binario o paquete instalable/, /CLIs, daemons, librerías, proxies, servidores de protocolos y gestores de procesos/, /Go, Rust o Python/, /Instalación y actualización/, /Permisos/, /Multiplataforma/, /Entrada no confiable/,
    /Qué queda fuera/, /\*\*No hay tipo D\*\*/, /puerta de uso responsable/, /GO\*\*, \*\*REDISEÑO\*\* o \*\*NO-GO/, /C3 y C4/, /Qué no recortar nunca/]) assert.match(t, x, String(x));
});

test('la plantilla del tipo C solo usa marcadores conocidos y pide la puerta y los seis ejes', () => {
  const t = leer('types', 'C', 'plantillas', 'VIABILIDAD-TIPO-C.md');
  assert.deepEqual(marcadoresUsados(t).filter((m) => !MARCADORES.includes(m)), []);
  for (const x of [/Puerta de uso responsable/, /NO-GO/, /Plataformas objetivo/, /Privilegios requeridos/, /Modelo de amenazas/, /Distribución y actualización/, /Acceso a lo externo/, /Mantenimiento/]) assert.match(t, x, String(x));
});

test('la documentación del tipo C: README, ADR 0006 y 0018, CHANGELOG, HANDOFF y versión 0.9.1 coherentes', () => {
  const version = JSON.parse(leer('package.json')).version;
  assert.equal(version, '0.9.1');
  assert.match(leer('README.md'), /\*\*C — herramientas y software de sistemas \(en construcción\):\*\*/);
  assert.match(leer('README.md'), /Versión 0.9.1/);
  assert.match(leer('CHANGELOG.md'), /^## \[0\.8\.0\]/m);
  assert.match(leer('HANDOFF.md'), /\(0.9.1,/);
  assert.match(leer('docs', 'adr', '0006-tipos-de-proyecto-con-manifiestos.md'), /tipo C/);
  assert.match(leer('docs', 'adr', '0018-tipo-c-como-guia-de-decision.md'), /No hay tipo D/);
});
