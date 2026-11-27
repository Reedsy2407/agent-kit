// Esqueleto Android del tipo M (ADR 0023): contrato, archivos, versiones coherentes con sus fuentes, integración continua,
// instalación (sin envoltorio y sin pisar nada) y las funciones puras del verificador. Sin red ni herramientas de Android:
// lo que compila y se ejecuta se comprueba a mano con types/M/esqueletos/verificar.mjs (registro en VERIFICACION.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { planificar, aplicar, esqueletoDe, cargarManifiesto, main as instalar } from '../../../install/install.mjs';
import { PRESETS, PRESETS_M, checksDePreset } from '../../../infra/presets.mjs';
import { leerYaml } from '../../B/test/lib/yaml-minimo.mjs';
import { escribirGenerados } from '../../../infra/generate-settings.mjs';
import { resumenDePruebas, leerZip, alineacionElf, clasificarArtefactos, origenDeRecursos, destinoMinimoDeLaTienda, almacenDelSistema, QUE_INSTALAR, main as verificar } from '../esqueletos/verificar.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ESQ = join(raiz, 'types', 'M', 'esqueletos');
const DIR = join(ESQ, 'android-compose');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');
const del = (rel) => readFileSync(join(DIR, rel), 'utf8');
const meta = JSON.parse(del('esqueleto.json'));
const contrato = readFileSync(join(ESQ, 'CONTRATO.md'), 'utf8');
const hechos = leer('types', 'M', 'PLATAFORMA-ANDROID.md');
const toml = del('gradle/libs.versions.toml');
const version = (n) => toml.match(new RegExp(`^${n} = "([^"]+)"`, 'm'))?.[1];
const fila = (id) => hechos.split('\n').find((l) => l.startsWith(`- **[${id}]**`)) ?? '';
const recorrer = (dir, base = dir) => readdirSync(dir).flatMap((n) => { const r = join(dir, n); return statSync(r).isDirectory() ? recorrer(r, base) : [r.slice(base.length + 1).replace(/\\/g, '/')]; });
/** Lo que git versionaría del esqueleto: lo local e ignorado (compilaciones, envoltorio) no cuenta. */
const versionables = () => execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'types/M/esqueletos/android-compose'], { cwd: raiz, encoding: 'utf8', timeout: 20000 })
  .split('\0').filter(Boolean).map((r) => r.slice('types/M/esqueletos/android-compose/'.length)).filter((r) => existsSync(join(DIR, r)));

const K = 'app/src/main/kotlin/invalid/ejemplo/app';
const ARCHIVOS = ['.github/workflows/ci.yml', 'README.md', 'app/build.gradle.kts', 'app/src/main/AndroidManifest.xml', `${K}/MainActivity.kt`, `${K}/PantallaVacia.kt`, `${K}/tema/Tema.kt`, `${K}/tema/Tokens.kt`,
  'app/src/main/res/xml/reglas_de_extraccion.xml', 'app/src/main/res/values/strings.xml', 'app/src/main/res/values/themes.xml', 'app/src/main/res/values-night/themes.xml', 'app/src/test/kotlin/invalid/ejemplo/app/tema/TokensTest.kt', 'app/src/androidTest/kotlin/invalid/ejemplo/app/PantallaInstrumentadaTest.kt',
  'build.gradle.kts', 'gradle.properties', 'gradle/libs.versions.toml', 'settings.gradle.kts'];

const entorno = () => { const base = mkdtempSync(join(tmpdir(), 'kit-esq-m-')); for (const d of ['destino', 'respaldo']) mkdirSync(join(base, d)); return { base, destino: join(base, 'destino'), respaldo: join(base, 'respaldo'), limpiar: () => rmSync(base, { recursive: true, force: true }) }; };
const fichaCon = (e, preset) => { const f = JSON.parse(leer('types', 'M', 'ficha-infra.json')); f.kit.preset = preset; const ruta = join(e.base, `ficha-${preset || 'sin'}.json`); writeFileSync(ruta, JSON.stringify(f)); return ruta; };
const AHORA = new Date('2026-11-26T10:00:00Z');
const plan = (e, preset = 'java-gradle', extra = {}) => planificar({ destino: e.destino, tipo: 'M', proyecto: 'demo', respaldo: e.respaldo, fichaRuta: fichaCon(e, preset), ahora: AHORA, ...extra });

test('el contrato fija E1 a E9, cada uno con su comprobación, y dice lo que no comprueba', () => {
  assert.deepEqual([...contrato.matchAll(/^\| (E\d) \|/gm)].map((m) => m[1]), ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9']);
  for (const l of contrato.split('\n').filter((x) => /^\| E\d \|/.test(x))) assert.equal(l.split(' | ').length, 3, l.slice(0, 20));
  assert.match(contrato, /\*\*una de las salidas\*\*[\s\S]*no impone stack/);
  const no = contrato.split('## Qué NO comprueba')[1].split('\n## ')[0];
  for (const x of [/Nada en un equipo real/, /R1[\s\S]*R2[\s\S]*R7/, /pruebas instrumentadas no se ejecutan/i, /Android Auto/, /no se firma/]) assert.match(no, x, String(x));
});

test('el esqueleto tiene los archivos esperados y nada más: sin envoltorio, binarios, claves ni compilaciones', () => {
  const hay = versionables();
  assert.deepEqual([...hay].sort(), [...ARCHIVOS, 'esqueleto.json'].sort());
  for (const r of hay) {
    assert.doesNotMatch(r, /(^|\/)(gradlew(\.bat)?|local\.properties|keystore\.properties)$|gradle\/wrapper\/|\.(jar|aar|apk|aab|class|dex|so|png|jpg|webp|jks|keystore)$|(^|\/)(build|\.gradle|\.kotlin)\//, r);
    assert.ok(!readFileSync(join(DIR, r)).includes(0), `${r}: parece binario`);
  }
});

test('las plantillas del esqueleto no mencionan el alojamiento, no traen secretos ni rutas de una máquina', () => {
  for (const r of [...versionables().map((x) => `android-compose/${x}`), 'CONTRATO.md']) {
    readFileSync(join(ESQ, r), 'utf8').split('\n').forEach((l, i) => {
      assert.doesNotMatch(l, /github\.com|\bGitHub\b|[Rr]epositorio/, `${r}:${i + 1}`);
      assert.doesNotMatch(l, /AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|storePassword|keyPassword|signingConfig/, `${r}:${i + 1}: secreto o firma`);
      assert.doesNotMatch(l, /[A-Z]:\\Users|\/home\/\w|\/Users\/\w|sdk\.dir/, `${r}:${i + 1}: ruta de una máquina`);
    });
  }
});

test('versiones fijadas en un solo archivo, cada una exacta, con su fila de plataforma', () => {
  const bloque = toml.split('[versions]')[1].split('[libraries]')[0];
  const nombres = [...bloque.matchAll(/^(\w+) = /gm)].map((m) => m[1]);
  assert.deepEqual(nombres, ['agp', 'kotlin', 'composeBom', 'activityCompose', 'junit', 'androidxTestRunner', 'compileSdk', 'compileSdkMinor', 'targetSdk', 'minSdk']);
  for (const n of nombres) assert.match(version(n), /^\d+(\.\d+)*$/, `${n}: versión exacta`);
  assert.match(toml, /leídas en su fuente el \d{4}-\d{2}-\d{2}/);
  for (const [, id] of toml.matchAll(/\[(P-[A-Z]+-\d+)\]/g)) assert.ok(fila(id), `${id} no existe`);
  assert.match(fila('P-HER-5'), /2\.2\.10/);
  for (const [n, id] of [['agp', 'P-HER-6'], ['kotlin', 'P-HER-6'], ['composeBom', 'P-HER-7'], ['activityCompose', 'P-HER-8'], ['junit', 'P-HER-8'], ['androidxTestRunner', 'P-HER-8']]) assert.ok(fila(id).includes(version(n)), `${n} ${version(n)} no está en ${id}`);
  assert.match(fila('P-HER-7'), new RegExp(`compileSdk\` ${version('compileSdk')} con nivel menor ${version('compileSdkMinor')}[\\s\\S]*\`minSdk\` ${version('minSdk')}`));
  assert.ok(Number(version('targetSdk')) >= Number(fila('P-PUB-6').match(/API (\d+)/)[1]), 'el destino cumple el mínimo de la tienda');
  assert.equal(meta.verificacion.plataformaAndroid, `android-${version('compileSdk')}.${version('compileSdkMinor')}`);
  assert.ok(fila('P-HER-4').includes(meta.verificacion.buildTools));
  assert.doesNotMatch(del('app/build.gradle.kts') + del('build.gradle.kts'), /["'][\w.-]+:[\w.-]+:[\w.+-]+["']|version\s+"[\d.]+"/, 'ninguna versión fuera del catálogo');
});

test('solo las dependencias necesarias: Compose, actividad y las de prueba', () => {
  const libs = toml.split('[libraries]')[1].split('[plugins]')[0];
  assert.deepEqual([...libs.matchAll(/group = "([^"]+)", name = "([^"]+)"/g)].map((m) => `${m[1]}:${m[2]}`), ['androidx.compose:compose-bom', 'androidx.compose.material3:material3', 'androidx.compose.ui:ui', 'androidx.compose.ui:ui-test-junit4', 'androidx.compose.ui:ui-test-manifest', 'androidx.activity:activity-compose', 'junit:junit', 'androidx.test:runner']);
  assert.deepEqual([...toml.split('[plugins]')[1].matchAll(/id = "([^"]+)"/g)].map((m) => m[1]), ['com.android.application', 'org.jetbrains.kotlin.plugin.compose']);
  const app = del('app/build.gradle.kts');
  for (const l of app.split('dependencies {')[1].split('\n').map((x) => x.trim()).filter((x) => /Implementation|implementation/.test(x))) assert.match(l, /\((libs\.[\w.]+|composeBom)\)$/, l);
});

test('las sumas y la versión de Gradle son las mismas en los metadatos, el README y la fila de plataforma', () => {
  const g = meta.verificacion.gradle;
  for (const s of [g.distribucionSha256, g.envoltorioSha256]) assert.match(s, /^[0-9a-f]{64}$/);
  for (const [nombre, t] of [['README', del('README.md')], ['P-HER-9', fila('P-HER-9')]]) for (const x of [g.version, g.distribucionSha256, g.envoltorioSha256]) assert.ok(t.includes(x), `${nombre} sin ${x}`);
  assert.deepEqual([...new Set(del('README.md').match(/\b[0-9a-f]{64}\b/g))].sort(), [g.distribucionSha256, g.envoltorioSha256].sort());
});

test('el README explica generar el envoltorio, comprobar que es el oficial y versionarlo', () => {
  const r = del('README.md');
  for (const x of [/\*\*sin\*\* `gradlew`, `gradlew\.bat` ni `gradle\/wrapper\/`/, /gradle wrapper --gradle-version [\d.]+ --distribution-type bin --gradle-distribution-sha256-sum/, /Get-FileHash/, /sha256sum/, /wrapper\.jar\.sha256/, /distributionSha256Sum/, /\*\.bat text eol=crlf/, /git update-index --chmod=\+x gradlew/,
    /kit\/CONTRATO-ESQUELETOS\.md/, /\*\*una de las salidas\*\*/, /\.\\gradlew\.bat --no-daemon check/, /No desactives la verificación/, /## Límites conocidos/, /## Qué no construir todavía/]) assert.match(r, x, String(x));
  for (const [, id] of r.matchAll(/\[(P-[A-Z]+-\d+)\]/g)) assert.ok(fila(id), `${id} no existe`);
});

test('todo identificador citado en el esqueleto y en el contrato existe', () => {
  let citas = 0;
  for (const r of [...versionables().map((x) => `android-compose/${x}`), 'CONTRATO.md']) for (const [, id] of readFileSync(join(ESQ, r), 'utf8').matchAll(/\[(P-[A-Z]+-\d+)\]/g)) { citas += 1; assert.ok(fila(id), `${r} cita ${id}`); }
  assert.ok(citas > 25, `solo ${citas}`);
});

test('manifiesto de la app sin permisos ni copia de seguridad, nombres marcador y sin firma', () => {
  const m = del('app/src/main/AndroidManifest.xml');
  assert.doesNotMatch(m, /uses-permission|usesCleartextTraffic|<service|<receiver|<provider/);
  assert.match(m, /android:allowBackup="false"/);
  assert.match(m, /android:fullBackupContent="false"/);
  assert.match(m, /android:dataExtractionRules="@xml\/reglas_de_extraccion"/);
  const reglas = del('app/src/main/res/xml/reglas_de_extraccion.xml');
  for (const via of ['cloud-backup', 'device-transfer']) {
    const s = reglas.split(`<${via}>`)[1].split(`</${via}>`)[0];
    for (const dominio of ['root', 'file', 'database', 'sharedpref', 'external']) assert.ok(s.includes(`<exclude domain="${dominio}" path="." />`), `${via} ${dominio}`);
    assert.doesNotMatch(s, /<include/, via);
  }
  const app = del('app/build.gradle.kts');
  assert.match(app, /namespace = "invalid\.ejemplo\.app"/);
  assert.match(app, /applicationId = "invalid\.ejemplo\.app"/);
  assert.doesNotMatch(app, /signing/i);
});

test('el tema: tokens como ideas en un solo archivo, ceden ante el brief; la pantalla deja libres las barras', () => {
  const tokens = del(`${K}/tema/Tokens.kt`);
  assert.match(tokens, /Si existe design\/DESIGN-BRIEF\.md, manda ese archivo/);
  assert.match(tokens, /provisionales y neutros/);
  for (const g of ['object Colores', 'object Letra', 'object Espaciado', 'object Radios']) assert.ok(tokens.includes(g), g);
  for (const r of versionables().filter((x) => x.endsWith('.kt') && !x.endsWith('Tokens.kt') && !x.includes('Test'))) assert.doesNotMatch(del(r), /Color\(0x|\b\d+\.(sp|dp)\b/, `${r}: valor de diseño fuera de los tokens`);
  assert.match(del(`${K}/tema/Tema.kt`), /isSystemInDarkTheme\(\)/);
  assert.match(del(`${K}/MainActivity.kt`), /enableEdgeToEdge\(\)/);
  assert.match(del(`${K}/PantallaVacia.kt`), /\.padding\(barrasDelSistema\)/);
});

test('una prueba local (la corre check) y una de interfaz marcada como instrumentada', () => {
  const local = del('app/src/test/kotlin/invalid/ejemplo/app/tema/TokensTest.kt');
  assert.ok((local.match(/@Test/g) ?? []).length >= 2);
  assert.match(local, /\[P-ACC-2\]/);
  const ui = del('app/src/androidTest/kotlin/invalid/ejemplo/app/PantallaInstrumentadaTest.kt');
  assert.match(ui, /PRUEBA INSTRUMENTADA[\s\S]*NO la ejecuta \[P-HER-1\]/);
  assert.match(ui, /import androidx\.compose\.ui\.test\.junit4\.v2\.createAndroidComposeRule/, 'la forma vigente: la anterior está obsoleta');
  assert.match(ui, /createAndroidComposeRule<MainActivity>\(\)/);
  assert.match(del('app/build.gradle.kts'), /testInstrumentationRunner = "androidx\.test\.runner\.AndroidJUnitRunner"/);
});

test('integración continua de ejemplo: solo lectura, acciones fijadas, envoltorio comprobado, comando del preset y sin secretos', () => {
  const texto = del('.github/workflows/ci.yml');
  const ci = leerYaml(texto);
  assert.deepEqual(ci.permissions, { contents: 'read' });
  for (const d of ['push', 'pull_request', 'workflow_dispatch']) assert.ok(d in ci.on, d);
  const pasos = ci.jobs.comprobar.steps;
  assert.ok(ci.jobs.comprobar['timeout-minutes'] > 0);
  for (const p of pasos.filter((x) => x.uses)) assert.match(p.uses, /^[\w.-]+(\/[\w.-]+)+@v\d+$/, p.uses);
  const i = (f) => pasos.findIndex(f);
  const validar = i((p) => /\/wrapper-validation@/.test(p.uses ?? ''));
  const check = i((p) => p.run === './gradlew --no-daemon check');
  assert.ok(validar >= 0 && check > validar, 'el envoltorio se comprueba antes de ejecutarlo');
  assert.equal(pasos[check].run, PRESETS_M['java-gradle'].comandos[0]);
  assert.ok(pasos.some((p) => /assembleDebugAndroidTest/.test(p.run ?? '')), 'compila las instrumentadas');
  assert.doesNotMatch(texto, /connected(Android|Debug)?\w*Test/, 'no ejecuta instrumentadas');
  assert.doesNotMatch(texto, /\bsecrets\.|TOKEN|password|\b(curl|wget)\b|setup-gradle|publish|release|upload/i);
});

test('el manifiesto del tipo M declara el esqueleto como una de las salidas e instala el contrato', () => {
  const m = cargarManifiesto('M');
  assert.equal(m.esqueletos, 'types/M/esqueletos');
  assert.match(m.esqueletosNota, /no impone stack[\s\S]*UNA de las salidas[\s\S]*React Native con Expo, Flutter[\s\S]*nunca incluye el envoltorio/);
  assert.ok(m.archivos.some((a) => a.origen === 'types/M/esqueletos/CONTRATO.md' && a.destino === 'kit/CONTRATO-ESQUELETOS.md'));
  assert.ok(!m.archivos.some((a) => /VERIFICACION|verificar/.test(a.origen)), 'el registro y el verificador se quedan en el kit');
  const e = esqueletoDe(m, 'java-gradle');
  assert.equal(e.stack, 'android-compose');
  assert.deepEqual(e.archivos.map((a) => a.destino).sort(), [...ARCHIVOS].sort());
  for (const p of ['', 'node', 'java-maven', 'go']) assert.equal(esqueletoDe(m, p), null, p);
  assert.equal(esqueletoDe(cargarManifiesto('B'), 'java-gradle'), null, 'el tipo B no recibe el esqueleto Android');
});

test('el instalador nunca copia un envoltorio, binarios, claves ni compilaciones aunque estén en el disco del kit', () => {
  const e = entorno();
  try {
    const falso = join(e.base, 'kit', 'types', 'M', 'esqueletos', 'x');
    const poner = (rel) => { mkdirSync(dirname(join(falso, rel)), { recursive: true }); writeFileSync(join(falso, rel), '{"preset":"java-gradle"}'); };
    const malos = ['gradlew', 'gradlew.bat', 'gradle/wrapper/gradle-wrapper.jar', 'gradle/wrapper/gradle-wrapper.properties', 'app/libs/a.jar', 'app/build/salida.txt', 'build/x', '.gradle/y', '.kotlin/z', 'local.properties', 'keystore.properties', 'subida.jks', 'a.apk', 'app/src/main/jniLibs/b.so'];
    for (const r of ['esqueleto.json', 'gradle/libs.versions.toml', 'app/src/A.kt', ...malos]) poner(r);
    const r = esqueletoDe({ esqueletos: 'types/M/esqueletos' }, 'java-gradle', join(e.base, 'kit'));
    assert.deepEqual(r.archivos.map((a) => a.destino).sort(), ['app/src/A.kt', 'gradle/libs.versions.toml']);
  } finally { e.limpiar(); }
});

test('instalar el tipo M con el preset: copia el esqueleto sin envoltorio, ignora la compilación y deja versionar el envoltorio', () => {
  const e = entorno();
  try {
    const git = (...a) => spawnSync('git', ['-C', e.destino, ...a], { encoding: 'utf8', timeout: 20000 });
    assert.equal(git('init', '-q').status, 0);
    const p = plan(e);
    assert.equal(p.esqueleto, 'android-compose');
    assert.ok(p.advertencias.some((w) => /una de las salidas de la guía, no la obligatoria[\s\S]*sin el envoltorio de Gradle[\s\S]*types\/M\/esqueletos\/VERIFICACION\.md/.test(w)), p.advertencias.join(' | '));
    aplicar(p);
    for (const f of [...ARCHIVOS, 'kit/CONTRATO-ESQUELETOS.md']) assert.ok(existsSync(join(e.destino, f)), f);
    const instalados = recorrer(e.destino).filter((r) => !r.startsWith('.git/'));
    assert.deepEqual(instalados.filter((r) => /(^|\/)gradlew|gradle\/wrapper|\.jar$|esqueleto\.json$/.test(r)), []);
    for (const r of ['.gradle/x', 'build/x', 'app/build/x', '.kotlin/x', 'captures/x', 'local.properties', 'subida.jks']) assert.equal(git('check-ignore', '-q', '--', r).status, 0, r);
    for (const r of ['gradlew', 'gradlew.bat', 'gradle/wrapper/gradle-wrapper.jar', 'gradle/wrapper/gradle-wrapper.properties', 'gradle/libs.versions.toml']) assert.notEqual(git('check-ignore', '-q', '--', r).status, 0, `${r} debe poder versionarse`);
    const kit = JSON.parse(readFileSync(join(e.destino, '.claude', 'kit.json'), 'utf8'));
    assert.deepEqual(kit.checks, checksDePreset('java-gradle', 'M'));
  } finally { e.limpiar(); }
});

test('sin preset no hay esqueleto; --dry-run lo anuncia sin escribir; reinstalar no pisa y --diff muestra el cambio', async () => {
  const e = entorno();
  try {
    const sin = plan(e, '');
    assert.equal(sin.esqueleto, undefined);
    assert.ok(!sin.acciones.some((a) => ARCHIVOS.includes(a.destino)));
    let out = '';
    const io = { stdout: { write: (t) => { out += t; } }, stderr: { write: (t) => { out += t; } }, interactivo: false, ahora: AHORA };
    const args = ['--destino', e.destino, '--tipo', 'M', '--respaldo', e.respaldo, '--ficha', fichaCon(e, 'java-gradle')];
    assert.equal(await instalar([...args, '--dry-run'], io), 0);
    for (const f of ARCHIVOS) assert.ok(out.includes(f), f);
    assert.deepEqual(readdirSync(e.destino), []);
    /* Un archivo propio del proyecto no se pisa. */
    writeFileSync(join(e.destino, 'settings.gradle.kts'), '// mío\n');
    aplicar(plan(e));
    assert.equal(readFileSync(join(e.destino, 'settings.gradle.kts'), 'utf8'), '// mío\n');
    /* El envoltorio que el proyecto genere tampoco se toca. */
    writeFileSync(join(e.destino, 'gradlew'), 'propio\n');
    const otra = plan(e);
    assert.ok(!otra.acciones.some((a) => a.destino === 'gradlew'));
    assert.equal(otra.acciones.find((a) => a.destino === 'settings.gradle.kts').accion, 'omitir');
    out = '';
    assert.equal(await instalar([...args, '--diff'], io), 0);
    assert.match(out, /--- settings\.gradle\.kts[\s\S]*\/\/ mío/);
    assert.equal(readFileSync(join(e.destino, 'settings.gradle.kts'), 'utf8'), '// mío\n');
    assert.equal(readFileSync(join(e.destino, 'gradlew'), 'utf8'), 'propio\n');
  } finally { e.limpiar(); }
});

test('declarar el preset en un proyecto ya instalado: reinstalar no sobrescribe .claude/kit.json y regenerar desde la ficha activa el sello', () => {
  const e = entorno();
  try {
    const planPropio = () => planificar({ destino: e.destino, tipo: 'M', proyecto: 'demo', respaldo: e.respaldo, ahora: AHORA });
    const kit = () => JSON.parse(readFileSync(join(e.destino, '.claude', 'kit.json'), 'utf8'));
    aplicar(planPropio());
    const rutaFicha = join(e.destino, 'kit', 'FICHA-INFRA.json');
    const f = JSON.parse(readFileSync(rutaFicha, 'utf8'));
    f.kit.preset = 'java-gradle';
    writeFileSync(rutaFicha, `${JSON.stringify(f, null, 2)}\n`);
    const p = planPropio();
    assert.equal(p.esqueleto, 'android-compose');
    assert.equal(p.acciones.find((a) => a.destino === '.claude/kit.json').accion, 'omitir');
    assert.ok(p.advertencias.some((w) => /no sobrescribe \.claude\/kit\.json[\s\S]*infra\/generate-settings\.mjs[\s\S]*\.\\gradlew\.bat --no-daemon check[\s\S]*--diff/.test(w)), p.advertencias.join(' | '));
    aplicar(p);
    assert.deepEqual(kit().checks, [], 'reinstalar solo no configura el sello');
    escribirGenerados(JSON.parse(readFileSync(rutaFicha, 'utf8')), e.destino);
    assert.deepEqual(kit().checks, checksDePreset('java-gradle', 'M'));
    assert.equal(kit().preset.aviso, null);
    /* Lo que la guía, la skill, la ficha y el README del esqueleto dicen de ese paso. */
    assert.match(leer('types', 'M', 'GUIA-DECISION.md'), /node infra\/generate-settings\.mjs --ficha <proyecto>\/kit\/FICHA-INFRA\.json --destino <proyecto>`[\s\S]*Sin el paso 3 el sello sigue sin comprobaciones/);
    assert.match(leer('types', 'B', 'skills', 'elegir-stack-proporcional', 'SKILL.md'), /se regenera `\.claude\/` desde la ficha[\s\S]*sin eso el sello sigue sin comprobaciones/);
    assert.match(leer('types', 'M', 'ficha-infra.json'), /reinstalar no sobrescribe \.claude\/kit\.json/);
    assert.match(del('README.md'), /reinstalar no sobrescribe `\.claude\/kit\.json`/);
  } finally { e.limpiar(); }
});

test('el verificador lee el destino mínimo de la tienda de su única fuente', () => {
  assert.equal(destinoMinimoDeLaTienda(), Number(fila('P-PUB-6').match(/API (\d+)/)[1]));
  assert.throws(() => destinoMinimoDeLaTienda('sin la fila'), /P-PUB-6/);
});

test('el preset java-gradle figura como verificado solo en el tipo M, con esqueleto y registro con su fecha', () => {
  const p = PRESETS_M['java-gradle'];
  assert.equal(PRESETS['java-gradle'].verificado, false, 'en el tipo B nunca se ejecutó sobre un servicio');
  if (!p.verificado) return assert.equal(p.verificadoEl, undefined);
  assert.equal(p.esqueleto, 'android-compose');
  assert.equal(meta.preset, 'java-gradle');
  assert.match(p.verificadoEl, /^\d{4}-\d{2}-\d{2}$/);
  const registro = readFileSync(join(ESQ, 'VERIFICACION.md'), 'utf8');
  assert.ok(registro.includes(`Verificado el ${p.verificadoEl}`), 'registro sin esa fecha');
  for (const v of [meta.verificacion.gradle.version, version('agp'), version('kotlin'), meta.verificacion.plataformaAndroid]) assert.ok(registro.includes(v), `registro sin ${v}`);
});

test('el registro dice qué se comprobó, qué se reutilizó de la caché y qué no se comprobó', () => {
  const r = readFileSync(join(ESQ, 'VERIFICACION.md'), 'utf8');
  for (const x of [/node types\/M\/esqueletos\/verificar\.mjs android-compose/, /caché de dependencias reutilizada y revalidada/, /--no-daemon --no-build-cache --refresh-dependencies/, /## Qué NO está verificado/, /equipo real/, /instrumentadas/, /Android Auto/, /## Integración continua/]) assert.match(r, x, String(x));
  assert.doesNotMatch(r, /desde cero/i);
});

/* ---------- Funciones puras del verificador ---------- */

/** ELF64 mínimo con los segmentos dados: [tipo, vaddr, memsz, align]. */
function elf(segmentos, clase = 2) {
  const b = Buffer.alloc(64 + 56 * segmentos.length);
  b.writeUInt32BE(0x7f454c46, 0); b[4] = clase; b[5] = 1;
  b.writeBigUInt64LE(64n, 32); b.writeUInt16LE(56, 54); b.writeUInt16LE(segmentos.length, 56);
  segmentos.forEach(([tipo, vaddr, memsz, align], i) => {
    const p = 64 + 56 * i;
    b.writeUInt32LE(tipo, p); b.writeBigUInt64LE(BigInt(vaddr), p + 16); b.writeBigUInt64LE(BigInt(memsz), p + 40); b.writeBigUInt64LE(BigInt(align), p + 48);
  });
  return b;
}
const LOAD = 1; const RELRO = 0x6474e552;

test('alineacionElf aplica la regla de 16 KB a LOAD y a GNU_RELRO', () => {
  assert.equal(alineacionElf(elf([[LOAD, 0, 0x680, 0x4000]])).valido, true);
  assert.equal(alineacionElf(elf([[LOAD, 0, 0x680, 0x10000]])).valido, true, 'más alineado también vale');
  assert.match(alineacionElf(elf([[LOAD, 0, 0x680, 0x1000]])).motivo, /LOAD alineado a 4096/);
  assert.equal(alineacionElf(elf([[LOAD, 0x4000, 0x2000, 0x4000], [RELRO, 0x4000, 0x4000, 1]])).valido, true, 'RELRO acaba en el límite');
  assert.equal(alineacionElf(elf([[LOAD, 0x4680, 0x980, 0x4000], [RELRO, 0x4680, 0x980, 1]])).valido, true, 'RELRO ocupa el resto de su LOAD');
  assert.match(alineacionElf(elf([[LOAD, 0x4680, 0x980, 0x4000], [RELRO, 0x4680, 0x1d8, 1]])).motivo, /GNU_RELRO/);
  assert.equal(alineacionElf(Buffer.alloc(80)).valido, false);
  assert.equal(alineacionElf(elf([[LOAD, 0, 1, 0x4000]], 1)).valido, false, '32 bits no se evalúa como válido');
  assert.equal(alineacionElf(elf([[RELRO, 0, 0x4000, 1]])).valido, false, 'sin LOAD no se da por bueno');
});

test('resumenDePruebas suma los informes y no inventa pruebas', () => {
  const x = (t, f, e, s) => `<?xml version="1.0"?>\n<testsuite name="a" tests="${t}" skipped="${s}" failures="${f}" errors="${e}">\n</testsuite>`;
  assert.deepEqual(resumenDePruebas([x(3, 0, 0, 1), x(2, 1, 1, 0)]), { archivos: 2, pruebas: 5, fallos: 1, errores: 1, omitidas: 1 });
  assert.deepEqual(resumenDePruebas([]), { archivos: 0, pruebas: 0, fallos: 0, errores: 0, omitidas: 0 });
});

test('leerZip lee las entradas guardadas sin comprimir y rechaza lo que no es un ZIP', () => {
  const nombre = Buffer.from('lib/x86_64/a.so'); const datos = Buffer.from('hola');
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt32LE(datos.length, 18); local.writeUInt16LE(nombre.length, 26);
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt32LE(datos.length, 20); central.writeUInt16LE(nombre.length, 28);
  const fin = Buffer.alloc(22); fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(1, 10); fin.writeUInt32LE(30 + nombre.length + datos.length, 16);
  const z = leerZip(Buffer.concat([local, nombre, datos, central, nombre, fin]));
  assert.equal(z.get('lib/x86_64/a.so')().toString(), 'hola');
  assert.throws(() => leerZip(Buffer.from('no soy un zip, de verdad que no')), /no es un ZIP/);
});

test('clasificarArtefactos separa lo que ya estaba en la caché de lo descargado', () => {
  const xml = '<components><component group="g" name="n" version="1"><artifact name="n-1.jar"><sha256 value="x"/></artifact><artifact name="n-1.pom"/></component><component group="h" name="m" version="2"><artifact name="m-2.jar"/></component></components>';
  const r = clasificarArtefactos(xml, [['g/n/1/abc/n-1.jar', 10]], [['g/n/1/abc/n-1.jar', 10], ['g/n/1/def/n-1.pom', 3]]);
  assert.deepEqual(r.reutilizados, [['g/n/1/n-1.jar', 10]]);
  assert.deepEqual(r.descargados, [['g/n/1/n-1.pom', 3]]);
  assert.deepEqual(r.sinLocalizar, [['h/m/2/m-2.jar', 0]]);
});

test('origenDeRecursos distingue lo revalidado, lo descargado y lo copiado, y si ya estaba', () => {
  const g = 'https://dl.google.com/dl/android/maven2';
  const registro = [
    `Cached resource ${g}/a/b/n/1/n-1.pom is up-to-date (lastModified: x).`,
    `Cached resource ${g}/a/b/n/1/n-1.jar is up-to-date (lastModified: x).`,
    `Downloading ${g}/a/b/n/1/n-1.module to C:\\x\\tmp`,
    'Downloading https://repo.maven.apache.org/maven2/c/m/2/m-2.jar to /tmp/y',
    'Found locally available resource with matching checksum: [https://repo.maven.apache.org/maven2/c/m/2/m-2.pom, C:\\Users\\x\\.m2\\repository\\c\\m-2.pom]',
    `Resource missing. [HTTP HEAD: ${g}/a/b/n/1/n-1.aar]`,
    '> Task :app:check',
  ].join('\r\n');
  assert.deepEqual(origenDeRecursos(registro, [['a.b/n/1/hh/n-1.pom', 1], ['c/m/2/hh/m-2.jar', 2]]), { revalidadosPrevios: 1, revalidadosPosteriores: 1, descargados: 2, descargadosQueYaEstaban: 1, copiadosDeMaven: 1, copiadosDeOtroSitio: 0, noEncontrados: 1 });
});

test('el verificador nunca desactiva la verificación de certificados ni instala por su cuenta, y pide un esqueleto válido', async () => {
  assert.equal(almacenDelSistema('win32'), '-Djavax.net.ssl.trustStoreType=Windows-ROOT');
  assert.equal(almacenDelSistema('linux'), null);
  const fuente = readFileSync(join(ESQ, 'verificar.mjs'), 'utf8');
  assert.doesNotMatch(fuente, /TrustManager|NODE_TLS_REJECT|rejectUnauthorized|--insecure|trustAll|checkRevocation=false|allowInsecure|isAllowInsecureProtocol|--no-validate-url/);
  assert.doesNotMatch(fuente, /sdkmanager|winget|choco |apt-get|brew install|taskkill|pkill/);
  assert.match(QUE_INSTALAR.join(' '), /JDK 17[\s\S]*android-37\.1[\s\S]*MB[\s\S]*Gradle [\d.]+[\s\S]*MB/);
  assert.ok(QUE_INSTALAR[1].includes(meta.verificacion.plataformaAndroid) && QUE_INSTALAR[1].includes(meta.verificacion.buildTools) && QUE_INSTALAR[2].includes(meta.verificacion.gradle.version));
  const original = console.error; console.error = () => {};
  try { assert.equal(await verificar([]), 2); assert.equal(await verificar(['no-existe']), 2); } finally { console.error = original; }
});
