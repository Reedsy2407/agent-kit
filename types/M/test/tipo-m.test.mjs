// Tipo M (aplicaciones móviles, Android primero) como guía de decisión (ADR 0021): manifiesto, ficha, instalación, presets,
// ramas de las skills, requisitos de referencia R1 a R7, plantilla de viabilidad y documentación del kit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { planificar, aplicar, cargarManifiesto, main } from '../../../install/install.mjs';
import { MARCADORES, marcadoresUsados } from '../../../install/marcadores.mjs';
import { generarSettings, generarKitConfig, validarFicha, FichaInvalida } from '../../../infra/generate-settings.mjs';
import { PRESETS, PRESETS_M, IDS_PRESETS_M, checksDePreset, permisosDePreset, avisoDePreset } from '../../../infra/presets.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');
const seccion = (texto, titulo) => texto.split(new RegExp(`^## ${titulo}`, 'm'))[1]?.split(/^## /m)[0] ?? '';
const viabilidad = leer('types', 'B', 'skills', 'evaluar-viabilidad', 'SKILL.md');
const stack = leer('types', 'B', 'skills', 'elegir-stack-proporcional', 'SKILL.md');
const ramaViabilidad = seccion(viabilidad, '8\\. Rama del tipo M');
const ramaStack = seccion(stack, '9\\. Rama del tipo M');
const guia = leer('types', 'M', 'GUIA-DECISION.md');
const fichaBase = () => JSON.parse(leer('types', 'M', 'ficha-infra.json'));
const ficha = (preset = '') => { const f = fichaBase(); f.proyecto = 'demo'; f.kit.preset = preset; return f; };

function destino() {
  const base = mkdtempSync(join(tmpdir(), 'kit-m-'));
  mkdirSync(join(base, 'destino')); mkdirSync(join(base, 'respaldo'));
  return { base, destino: join(base, 'destino'), respaldo: join(base, 'respaldo'), limpiar: () => rmSync(base, { recursive: true, force: true }) };
}
const AHORA = new Date('2026-11-26T10:00:00Z');
const planM = (e, extra = {}) => planificar({ destino: e.destino, tipo: 'M', proyecto: 'demo', respaldo: e.respaldo, ahora: AHORA, ...extra });

test('el manifiesto M está disponible, declara sus esqueletos y cada origen que nombra existe', () => {
  const m = cargarManifiesto('M');
  assert.equal(m.tipo, 'M');
  assert.equal(m.estado, 'disponible');
  assert.equal(m.ficha, 'types/M/ficha-infra.json');
  assert.equal(m.esqueletos, 'types/M/esqueletos');
  for (const a of m.archivos) assert.ok(existsSync(join(raiz, a.origen)), a.origen);
});

test('instalar el tipo M sin preset: guía, hechos de plataforma, plantillas, las dos skills de decisión y su catálogo; nada del catálogo de otro tipo, esqueleto, front ni diseño web', () => {
  const e = destino();
  try {
    const plan = planM(e);
    assert.equal(plan.pendienteEtapa2, false);
    assert.ok(!plan.esqueleto);
    assert.deepEqual(plan.advertencias.filter((w) => /marcadores sin valor/.test(w)), []);
    aplicar(plan);
    for (const d of ['CLAUDE.md', 'HANDOFF.md', 'kit/GUIA-DECISION.md', 'kit/PLATAFORMA-ANDROID.md', 'kit/plantillas/VIABILIDAD-TIPO-M.md', 'kit/plantillas/DECISION-VIABILIDAD.md', 'kit/plantillas/ADR.md', 'kit/plantillas/ESPECIFICACION.md',
      'kit/FICHA-INFRA.json', '.claude/skills/evaluar-viabilidad/SKILL.md', '.claude/skills/elegir-stack-proporcional/SKILL.md', '.claude/skills/especificar-funcionalidad/SKILL.md', '.claude/hooks/premerge-check.mjs', '.claude/agents/code-reviewer.md', '.claude/kit.json', '.claude/settings.local.json', 'scripts/sondeo-acceso.mjs', 'ops/dependencias.json', '.gitattributes', '.gitignore'])
      assert.ok(existsSync(join(e.destino, d)), d);
    const destinos = plan.acciones.map((a) => a.destino);
    assert.ok(!destinos.some((d) => /^kit\/(catalogo|catalogo-c)\/|casos-privados|^tests\/|^design\/|^src\/|gradle|\.kt$/i.test(d)), destinos.join(' '));
    assert.ok(destinos.includes('kit/catalogo-m/INDEX.md') && destinos.includes('.claude/skills/consultar-catalogo/SKILL.md'));
    assert.match(readFileSync(join(e.destino, 'CLAUDE.md'), 'utf8'), /Tipo de proyecto: aplicaciones móviles/);
    const kit = JSON.parse(readFileSync(join(e.destino, '.claude', 'kit.json'), 'utf8'));
    assert.deepEqual(kit.checks, [], 'sin stack elegido no hay comprobaciones');
    assert.equal(kit.preset, null);
    const ignorados = readFileSync(join(e.destino, '.gitignore'), 'utf8').split('\n');
    for (const l of ['/kit/', '/.claude/', '*.jks', '*.keystore', 'keystore.properties', 'local.properties']) assert.ok(ignorados.includes(l), l);
    const segunda = planM(e);
    /* Con settings.local.json ya presente, el instalador no lo toca y propone la versión generada aparte. */
    assert.deepEqual(segunda.acciones.filter((a) => a.accion !== 'igual').map((a) => `${a.accion} ${a.destino}`), ['crear .claude/settings.local.generado.json'], 'reinstalar no cambia nada del proyecto');
    assert.deepEqual(segunda.gitignore.añadir, []);
  } finally { e.limpiar(); }
});

test('git ignora de verdad las claves de firma y la configuración local en un proyecto M, también en subcarpetas', () => {
  const e = destino();
  try {
    const git = (...a) => spawnSync('git', ['-C', e.destino, ...a], { encoding: 'utf8', timeout: 20000 });
    assert.equal(git('init', '-q').status, 0);
    aplicar(planM(e));
    for (const r of ['subida.jks', 'app/subida.keystore', 'keystore.properties', 'local.properties']) assert.equal(git('check-ignore', '-q', '--', r).status, 0, r);
  } finally { e.limpiar(); }
});

test('el sello de un proyecto M recién instalado se niega: sin pruebas no hay sello', () => {
  const e = destino();
  try {
    const git = (...a) => spawnSync('git', ['-C', e.destino, ...a], { encoding: 'utf8', timeout: 20000 });
    git('init', '-q', '-b', 'main'); git('config', 'user.email', 'prueba@ejemplo.org'); git('config', 'user.name', 'Prueba'); git('config', 'commit.gpgsign', 'false');
    aplicar(planM(e));
    git('add', '-A'); assert.equal(git('commit', '-q', '-m', 'chore(app): base').status, 0);
    const r = spawnSync(process.execPath, [join(e.destino, '.claude', 'hooks', 'premerge-check.mjs')], { cwd: e.destino, encoding: 'utf8', timeout: 60000, input: '' });
    assert.equal(r.status, 1, `${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /SIN SELLO: La ficha no define comprobaciones/);
  } finally { e.limpiar(); }
});

test('el instalador acepta --tipo m en dry-run sin escribir nada y su mensaje de error nombra los cuatro tipos', async () => {
  const e = destino();
  try {
    let out = ''; let err = '';
    const io = { stdout: { write: (t) => { out += t; } }, stderr: { write: (t) => { err += t; } }, interactivo: false, ahora: AHORA };
    assert.equal(await main(['--destino', e.destino, '--tipo', 'm', '--respaldo', e.respaldo, '--dry-run'], io), 0);
    assert.match(out, /tipo M \(aplicaciones móviles\)/);
    assert.deepEqual(readdirSync(e.destino), []);
    assert.equal(await main(['--destino', e.destino], io), 2);
    assert.match(err, /--tipo A\|B\|C\|M/);
  } finally { e.limpiar(); }
});

test('la ficha del tipo M: sin stack ni proveedor, comprobaciones vacías, Android y lectura de claves denegada', () => {
  const f = fichaBase();
  assert.equal(f.tipo, 'M');
  assert.equal(f.despliegue.proveedor, '');
  assert.equal(f.baseDeDatos.proveedor, '');
  assert.equal(f.distribucion.proveedor, '');
  assert.deepEqual(f.distribucion.plataformas, ['android']);
  assert.equal(f.kit.preset, '');
  assert.deepEqual(f.kit.checks, []);
  assert.ok(!('front' in f.kit), 'el tipo M no usa la biblioteca de front web');
  assert.match(f._ayuda, /java-gradle, verificado solo sobre el esqueleto Android del kit[\s\S]*no trae el envoltorio de Gradle/);
  const { allow, deny } = generarSettings(ficha()).permissions;
  for (const r of ['Read(./keystore.properties)', 'Read(./**/keystore.properties)', 'Read(./**/*.jks)', 'Read(./**/*.keystore)']) assert.ok(deny.includes(r), r);
  assert.ok(!allow.some((r) => /gradle/.test(r)), 'sin preset no se autoriza Gradle');
  assert.deepEqual(generarKitConfig(ficha()).checks, []);
});

test('el tipo M solo ofrece java-gradle, con su propio estado: verificado sobre el esqueleto Android y el del tipo B no', () => {
  assert.deepEqual([...IDS_PRESETS_M], ['java-gradle']);
  assert.notEqual(PRESETS_M['java-gradle'], PRESETS['java-gradle']);
  assert.deepEqual(PRESETS_M['java-gradle'].comandos, PRESETS['java-gradle'].comandos, 'mismo comando que el del tipo B');
  assert.equal(PRESETS_M['java-gradle'].verificado, true);
  assert.equal(PRESETS_M['java-gradle'].esqueleto, 'android-compose');
  assert.match(PRESETS_M['java-gradle'].nota, /Verificado solo sobre el esqueleto android-compose[\s\S]*\.\\gradlew\.bat --no-daemon check/);
  assert.equal(PRESETS['java-gradle'].verificado, false);
  assert.match(avisoDePreset('java-gradle'), /NO está verificado/, 'en el tipo B el sello sigue avisando');
  const kit = generarKitConfig(ficha('java-gradle'));
  assert.deepEqual(kit.checks, checksDePreset('java-gradle', 'M'));
  assert.equal(kit.preset.aviso, null);
  assert.equal(avisoDePreset('java-gradle', 'M'), null);
  const { allow } = generarSettings(ficha('java-gradle')).permissions;
  for (const p of permisosDePreset('java-gradle', 'M')) assert.ok(allow.includes(p), p);
  const e = destino();
  try {
    const f = join(e.base, 'ficha.json');
    spawnSync(process.execPath, ['-e', 'require("fs").writeFileSync(process.argv[1], process.argv[2])', f, JSON.stringify(ficha('java-gradle'))], { timeout: 20000 });
    const plan = planM(e, { fichaRuta: f });
    assert.equal(plan.esqueleto, 'android-compose', 'con el preset llega el esqueleto Android');
  } finally { e.limpiar(); }
});

test('un preset de otro tipo se rechaza en el tipo M con un mensaje claro', () => {
  for (const malo of ['node', 'java-maven', 'dotnet', 'python', 'go', 'rust']) assert.throws(() => validarFicha(ficha(malo)), (e) => e instanceof FichaInvalida && /para el tipo M \(usa java-gradle/.test(e.message), malo);
});

test('evaluar-viabilidad tiene la rama M: ocho ejes propios y tres veredictos', () => {
  assert.ok(ramaViabilidad.length > 2000, 'falta la sección 8');
  for (const letra of 'abcdefgh') assert.match(ramaViabilidad, new RegExp(`^\\| \\(${letra}\\) `, 'm'), letra);
  for (const x of [/GO\*\*, \*\*REDISEÑO\*\* y \*\*NO-GO/, /no hay GO-CONDICIONADO/i, /\*\*accesible\*\*, \*\*estable\*\* y está \*\*permitido\*\*/, /mapas, rutas, mensajería/, /Cobros y suscripciones/, /ubicación, segundo plano, cámara, notificaciones/, /declarar en la tienda/,
    /moderación|¿Quién modera/, /denuncia, bloqueo/, /privacidad desde el diseño/, /Funcionamiento sin conexión/, /Cuenta de desarrollador, plazos de revisión y costo/, /presupuesto cero/, /kit\/PLATAFORMA-ANDROID\.md/, /VIABILIDAD-TIPO-M\.md/, /NO-GO, o en REDISEÑO sin aprobar, te detienes/, /Solo con GO/]) assert.match(ramaViabilidad, x, String(x));
  const tabla = seccion(viabilidad, '8\\. Rama del tipo M').split('### 8.2')[1];
  assert.deepEqual([...tabla.matchAll(/^\| \*\*([^*]+)\*\* \|/gm)].map((m) => m[1]), ['GO', 'REDISEÑO', 'NO-GO']);
  assert.match(viabilidad, /^description:.*tipo M/m);
});

test('elegir-stack-proporcional tiene la rama M: cuatro alternativas, la más simple primero, equipo pequeño, presupuesto cero y cuestionar', () => {
  assert.ok(ramaStack.length > 2000, 'falta la sección 9');
  for (const x of [/Mínimo dos alternativas entre Kotlin con Compose, React Native con Expo, Flutter y un envoltorio web \(Capacitor o PWA\), con la más simple primero/, /cumple la viabilidad/, /equipo pequeño y presupuesto cero/i, /Cuestiona el encargo/, /protocolo de la sección 6/, /una PWA para algo que debe seguir en segundo plano/,
    /ADR con lo descartado y por qué/, /Qué NO construir todavía/, /Versión para iOS/, /El catálogo del tipo M está en `kit\/catalogo-m\/`/, /en el tipo M son `kit\/catalogo-m\/` y `kit\/ejemplos-adr-m\/`/, /que exista no es una razón para elegirla/, /deja que decida el humano/, /el preset está verificado \*\*solo\*\* sobre ese esqueleto/]) assert.match(ramaStack, x, String(x));
  for (const alternativa of ['Envoltorio web', 'Kotlin con Compose', 'React Native con Expo', 'Flutter']) assert.match(ramaStack, new RegExp(`^\\| ${alternativa}`, 'm'), alternativa);
  assert.match(stack, /^description:.*tipo M/m);
});

test('la guía del tipo M: qué es, qué queda fuera (iOS), recorrido, esqueleto opcional, catálogo, sello y lo que falta', () => {
  for (const x of [/Estado: \*\*disponible como guía\*\*/, /no impone lenguaje, framework ni arquitectura/, /es \*\*una\*\* de las salidas posibles y no la obligatoria/, /y un catálogo de problemas \(`kit\/catalogo-m\/`/, /Cuando aparece un problema concreto, se consulta el catálogo/, /\*\*iOS\.\*\* El alcance del tipo M es Android/, /GO\*\*, \*\*REDISEÑO\*\* o \*\*NO-GO/, /Now in Android/,
    /## Esqueleto Android \(opcional\)/, /\*\*El envoltorio de Gradle lo genera quien lo adopta\*\*/, /primero con `--dry-run`/, /Que solo una alternativa tenga esqueleto no inclina la elección: decide el humano/,
    /`kit\.preset` y `kit\.checks` \*\*vacíos\*\*/, /`java-gradle`/, /\*\*verificado solo sobre el esqueleto Android del kit\*\*/, /no verifica tu proyecto, otras versiones ni otros sistemas/, /`\.\\gradlew\.bat --no-daemon check`/, /Lo que falta todavía, aunque el sello salga/, /Qué no recortar nunca/, /no se inventan/]) assert.match(guia, x, String(x));
  const falta = guia.split('Lo que falta todavía')[1].split('\n## ')[0];
  assert.deepEqual([...falta.matchAll(/^(\d)\. /gm)].map((m) => Number(m[1])), [1, 2, 3, 4, 5]);
  for (const x of [/equipo real[^\n]*R1, R2, R7/, /pruebas instrumentadas/, /publicación/, /Android Auto/]) assert.match(falta, x, String(x));
  assert.doesNotMatch(falta, /catálogo/, 'el catálogo ya no falta');
});

test('los requisitos de referencia: R1 a R7, cada uno con qué resolver, cómo se comprueba y en qué hechos se apoya', () => {
  const requisitos = seccion(guia, 'Requisitos de referencia');
  const trozos = requisitos.split(/^### /m).slice(1);
  const esperado = [/^R1\. .*primer plano de ubicación.*cierres/, /^R2\. Tiempo real sin que el servidor sepa dónde está cada usuario/, /^R3\. Contenido generado por usuarios con denuncia, bloqueo y sanciones/,
    /^R4\. Acceso decidido por el servidor en una app solo de consumo/, /^R5\. Requisitos de publicación en la tienda/, /^R6\. Ubicación mínima y privacidad desde el diseño/, /^R7\. Uso al volante/];
  assert.equal(trozos.length, esperado.length);
  trozos.forEach((t, i) => {
    assert.match(t, esperado[i]);
    for (const campo of ['**Resolver:**', '**Comprobar:**', '**Plataforma:**']) assert.ok(t.includes(campo), `R${i + 1} sin ${campo}`);
    assert.match(t.split('**Plataforma:**')[1], /\[P-[A-Z]+-\d+\]/, `R${i + 1} sin hechos citados`);
  });
  const contenido = [[/turno activo/, /fabricante/], [/primer|abierta/, /segundo plano/, /en el equipo/], [/denunciar/i, /bloquear/, /sanciones/], [/Prueba gratuita, bloqueo y planes/, /solo consumo|no vende/], [/Seguridad de los datos/, /política de privacidad/, /eliminación de cuenta/, /prueba cerrada/, /formato de paquete/], [/aproximada antes que precisa/, /sin coordenadas/], [/Objetivos táctiles grandes, texto corto y nada dinámico que distraiga/]];
  contenido.forEach((res, i) => { for (const x of res) assert.match(trozos[i], x, `R${i + 1} ${x}`); });
});

test('la plantilla de viabilidad del tipo M solo usa marcadores conocidos y pide los ocho ejes y los tres veredictos', () => {
  const t = leer('types', 'M', 'plantillas', 'VIABILIDAD-TIPO-M.md');
  assert.deepEqual(marcadoresUsados(t).filter((m) => !MARCADORES.includes(m)), []);
  for (const letra of 'abcdefgh') assert.match(t, new RegExp(`^\\| \\(${letra}\\) `, 'm'), letra);
  assert.match(t, /\*\*GO \/ REDISEÑO \/ NO-GO\*\*/);
  assert.doesNotMatch(t, /GO-CONDICIONADO/);
});

test('el ADR 0021 dice por qué el tipo M, el alcance, lo que no entra y la referencia pública', () => {
  const t = leer('docs', 'adr', '0021-tipo-m-como-guia-de-decision.md');
  assert.match(t, /^# 0021\./);
  for (const x of [/Estado: aceptada/, /## Contexto/, /\*\*Alcance: Android\.\*\* iOS queda fuera/, /## Qué no entra todavía/, /\*\*M2:\*\*/, /\*\*M3:\*\*/, /github\.com\/android\/nowinandroid/, /## Alternativas descartadas/]) assert.match(t, x, String(x));
  assert.match(leer('docs', 'adr', '0006-tipos-de-proyecto-con-manifiestos.md'), /tipo M/);
});

test('el ADR 0023 recoge las decisiones del esqueleto, lo descartado y lo que no se verificó', () => {
  const t = leer('docs', 'adr', '0023-esqueleto-android-y-preset-del-tipo-m.md');
  assert.match(t, /^# 0023\./);
  for (const x of [/Estado: aceptada/, /## Contexto/, /## Decisión/, /\*\*El envoltorio de Gradle queda fuera del kit\.\*\*/, /\*\*Kotlin con Compose, como una de las salidas\.\*\*/, /\*\*Verificación en Windows, de verdad\.\*\*/, /## Alternativas descartadas/, /Incluir el envoltorio en el kit/, /React Native|Flutter/, /## Consecuencias/, /## Sin hacer/]) assert.match(t, x, String(x));
});

test('la documentación del kit recoge el tipo M y la versión 0.14.0', () => {
  assert.equal(JSON.parse(leer('package.json')).version, '0.14.0');
  const readme = leer('README.md');
  assert.match(readme, /Versión 0\.14\.0/);
  assert.match(readme, /types\/M\/catalogo\//);
  assert.match(readme, /\*\*M — aplicaciones móviles, Android primero/);
  assert.match(readme, /--tipo M --dry-run/);
  assert.match(readme, /types\/M\/esqueletos\/verificar\.mjs android-compose/);
  assert.match(leer('CHANGELOG.md'), /^## \[0\.14\.0\] - 2026-11-26/m);
  assert.match(leer('CHANGELOG.md'), /^## \[0\.13\.0\] - 2026-11-26/m);
  assert.match(leer('CHANGELOG.md'), /^## \[0\.12\.0\] - 2026-11-26/m);
  assert.match(leer('CHANGELOG.md'), /^## \[0\.11\.0\] - 2026-11-26/m);
  const handoff = leer('HANDOFF.md');
  assert.match(handoff, /\(0\.14\.0, etapa M3\)/);
  assert.match(handoff, /Etapa M2 cerrada e integrada en `main` \(commit `73a2f98`\)/);
  assert.match(handoff, /Mejora pendiente[\s\S]*no regenera `\.claude\/kit\.json`/);
  assert.match(handoff, /Etapa M1 cerrada/);
  assert.match(handoff, /Etapa M2b cerrada e integrada en `main` \(commit `ce1da65`\)/);
  assert.match(handoff, /M3/);
});
