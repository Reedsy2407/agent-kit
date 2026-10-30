// Esqueletos ejecutables por stack (ADR 0016): estructura, YAML, .env.ejemplo, ausencia de secretos y de artefactos de compilación,
// instalación solo cuando el proyecto declara el stack, y verificación manual importable sin efectos. Sin red y sin herramientas
// del stack: lo que sí compila y arranca se comprueba a mano con types/B/esqueletos/verificar.mjs (registro en VERIFICACION.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { planificar, aplicar, describirPlan, esqueletoDe, cargarManifiesto, InstalacionInvalida } from '../../../install/install.mjs';
import { IDS_PRESETS, PRESETS } from '../../../infra/presets.mjs';
import { lineasConHuella, versionado } from '../../../core/test/lib/pureza.mjs';
import { leerYaml, YamlInvalido } from './lib/yaml-minimo.mjs';
import { prepararProyecto } from '../esqueletos/verificar.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ESQ = join(raiz, 'types', 'B', 'esqueletos');
const STACKS = { 'java-spring': 'java-maven', dotnet: 'dotnet', node: 'node', python: 'python' };
const COMUNES = ['Dockerfile', '.dockerignore', '.env.ejemplo', '.github/workflows/ci.yml', 'README.md', 'esqueleto.json', 'ops/salud.config.esqueleto.json'];
const PROPIOS = {
  'java-spring': ['pom.xml', 'src/main/resources/application.yml', 'src/main/java/app/servicio/Aplicacion.java', 'src/main/java/app/servicio/AjustesApp.java', 'src/main/java/app/servicio/ManejadorErrores.java', 'src/test/java/app/servicio/EndpointsTest.java'],
  dotnet: ['Servicio.sln', 'src/Servicio/Servicio.csproj', 'src/Servicio/Program.cs', 'tests/Servicio.Pruebas/Servicio.Pruebas.csproj', 'tests/Servicio.Pruebas/EndpointsTests.cs'],
  node: ['package.json', 'src/app.mjs', 'src/config.mjs', 'src/errores.mjs', 'src/server.mjs', 'pruebas/app.spec.mjs'],
  python: ['pyproject.toml', 'requirements.txt', 'requirements-dev.txt', 'app/main.py', 'app/config.py', 'app/errores.py', 'app/__main__.py', 'tests/test_app.py'],
};
const recorrer = (dir, base = dir) => readdirSync(dir).flatMap((n) => { const r = join(dir, n); return statSync(r).isDirectory() ? recorrer(r, base) : [r.slice(base.length + 1).replace(/\\/g, '/')]; });
const leer = (stack, rel) => readFileSync(join(ESQ, stack, rel), 'utf8');
const tmp = () => { const base = mkdtempSync(join(tmpdir(), 'kit-esq-t-')); for (const d of ['destino', 'respaldo']) mkdirSync(join(base, d)); return { base, destino: join(base, 'destino'), respaldo: join(base, 'respaldo'), limpiar: () => rmSync(base, { recursive: true, force: true }) }; };
const conPreset = (e, preset) => { const f = JSON.parse(readFileSync(join(raiz, 'types', 'B', 'ficha-infra.json'), 'utf8')); f.kit.preset = preset; const ruta = join(e.base, 'ficha.json'); writeFileSync(ruta, JSON.stringify(f)); return ruta; };
const planB = (e, preset, extra = {}) => planificar({ destino: e.destino, tipo: 'B', proyecto: 'demo', respaldo: e.respaldo, fichaRuta: conPreset(e, preset), ...extra });

test('el lector de YAML mínimo entiende el subconjunto y rechaza lo que no entiende', () => {
  const y = leerYaml('a: 1\nb:\n  c: [x, y]\n  d: "z"\nl:\n  - uses: q@v1\n    with:\n      k: 2\n  - run: cmd -t a:b .\n');
  assert.deepEqual(y, { a: 1, b: { c: ['x', 'y'], d: 'z' }, l: [{ uses: 'q@v1', with: { k: 2 } }, { run: 'cmd -t a:b .' }] });
  assert.throws(() => leerYaml('a: 1\n\tb: 2\n'), YamlInvalido);
  assert.throws(() => leerYaml('a: 1\na: 2\n'), /repetida/);
  assert.throws(() => leerYaml('a: &ancla 1\n'), YamlInvalido);
  assert.throws(() => leerYaml('a:\n   b: 1\n  c: 2\n'), YamlInvalido);
});

for (const [stack, preset] of Object.entries(STACKS)) {
  test(`esqueleto ${stack}: tiene todos los archivos esperados y su esqueleto.json es coherente con el preset`, () => {
    const hay = recorrer(join(ESQ, stack));
    for (const f of [...COMUNES, ...PROPIOS[stack]]) assert.ok(hay.includes(f), `${stack} no tiene ${f}`);
    const meta = JSON.parse(leer(stack, 'esqueleto.json'));
    assert.equal(meta.stack, stack);
    assert.equal(meta.preset, preset);
    assert.ok(IDS_PRESETS.includes(meta.preset));
    assert.equal(PRESETS[meta.preset].esqueleto, stack, 'el preset apunta a este esqueleto');
    assert.equal(meta.verificacion.sello, PRESETS[meta.preset].comandos[0], 'el sello del esqueleto es el comando del preset');
    assert.ok(Number.isInteger(meta.verificacion.puerto) && meta.verificacion.puerto >= 18000 && meta.verificacion.puerto < 19000, 'puerto no bloqueado por navegadores');
    assert.deepEqual(hay.filter((r) => /(^|\/)(target|bin|obj|node_modules|__pycache__|\.venv)\//.test(r)), [], 'sin artefactos de compilación');
  });

  test(`esqueleto ${stack}: el flujo de integración continua es YAML válido, de solo lectura, con pruebas y construcción`, () => {
    const ci = leerYaml(leer(stack, '.github/workflows/ci.yml'));
    assert.ok(ci.name && ci.on && ci.jobs);
    assert.deepEqual(ci.permissions, { contents: 'read' }, 'permisos mínimos');
    assert.deepEqual(Object.keys(ci.jobs), ['pruebas', 'imagen']);
    for (const j of Object.values(ci.jobs)) {
      assert.equal(j['runs-on'], 'ubuntu-latest');
      assert.ok(Number.isInteger(j['timeout-minutes']));
      assert.ok(j.steps.length >= 2);
      for (const s of j.steps) assert.ok(s.uses ? /^[\w.-]+\/[\w.-]+@v\d+$/.test(s.uses) : typeof s.run === 'string', `paso inválido en ${stack}`);
    }
    assert.ok(ci.jobs.pruebas.steps.some((s) => s.run && s.run.includes(JSON.parse(leer(stack, 'esqueleto.json')).verificacion.sello.split(' ')[0])), 'el job de pruebas corre el comando del sello');
    assert.ok(ci.jobs.imagen.steps.some((s) => /docker build/.test(s.run ?? '')));
    assert.ok(!/docker (push|login)|secrets\./.test(leer(stack, '.github/workflows/ci.yml')), 'la integración continua no publica ni usa secretos');
    assert.ok(ci.jobs.pruebas.steps.some((s) => (s.uses ?? '').startsWith('actions/checkout@')));
  });

  test(`esqueleto ${stack}: .env.ejemplo solo trae nombres de variables y APP_ENTORNO es obligatoria; el Dockerfile es multietapa y sin privilegios`, () => {
    const lineas = leer(stack, '.env.ejemplo').split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
    assert.ok(lineas.length >= 1);
    for (const l of lineas) assert.match(l, /^[A-Z][A-Z0-9_]*=$/, `.env.ejemplo con valor o formato raro: ${l.split('=')[0]}`);
    assert.ok(lineas.includes('APP_ENTORNO='));
    const d = leer(stack, 'Dockerfile');
    assert.ok((d.match(/^FROM /gm) ?? []).length >= 2, 'multietapa');
    assert.match(d, /^USER \S+/m, 'no corre como root');
    assert.match(d, /^HEALTHCHECK /m);
    assert.doesNotMatch(d, /^ENV .*APP_ENTORNO/m, 'la variable obligatoria no se fija en la imagen');
    assert.doesNotMatch(d, /^(ENV|ARG) \S*(SECRET|PASSWORD|TOKEN|KEY|CLAVE)\S*=/mi, 'ningún secreto en la imagen');
    assert.match(leer(stack, '.dockerignore'), /^\.env$/m);
  });

  test(`esqueleto ${stack}: README breve que enlaza al runbook de ops, sin secretos ni valores por defecto en secretos`, () => {
    const r = leer(stack, 'README.md');
    assert.ok(r.split('\n').length < 60);
    for (const d of ['ops/RUNBOOK.md', 'ops/PLAN-REVERSA.md', 'ops/ROTACION-SECRETOS.md']) assert.match(r, new RegExp(d.replace('.', '\\.')));
    assert.match(r, /Verificado el \d{4}-\d{2}-\d{2}/);
    assert.match(r, new RegExp(`kit\\.preset\` = \`${STACKS[stack]}\``));
    for (const rel of recorrer(join(ESQ, stack))) {
      const t = readFileSync(join(ESQ, stack, rel), 'utf8');
      assert.doesNotMatch(t, /-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:ghp|gho|github_pat|sk|AKIA)[_A-Z0-9-]{16,}|(?:postgres|mysql|mongodb|amqp)s?:\/\/[^\s:@]+:[^\s@]+@/, `${stack}/${rel}: parece un secreto`);
      assert.doesNotMatch(t, /\$\{[A-Z_]*(SECRET|PASSWORD|TOKEN|KEY|CLAVE)[A-Z_]*:[^}]+\}/, `${stack}/${rel}: valor por defecto en un secreto`);
      assert.deepEqual(lineasConHuella(t), [], `${stack}/${rel}: nombre vetado`);
    }
  });

  test(`esqueleto ${stack}: la configuración de salud del esqueleto apunta a /salud y usa las claves de salud.mjs`, () => {
    const c = JSON.parse(leer(stack, 'ops/salud.config.esqueleto.json'));
    assert.equal(c.rutas[0].ruta, '/salud');
    assert.deepEqual(c.cabecerasValores, { 'x-content-type-options': 'nosniff' });
  });
}

test('la configuración de Spring está en YAML válido, con APP_ENTORNO sin valor por defecto y cierre ordenado', () => {
  const y = leerYaml(leer('java-spring', 'src/main/resources/application.yml'));
  assert.equal(y.server.shutdown, 'graceful');
  assert.equal(y.app, undefined, 'app.entorno se enlaza solo desde APP_ENTORNO: no se escribe aquí');
  assert.doesNotMatch(leer('java-spring', 'src/main/resources/application.yml'), /APP_ENTORNO:/);
});

test('no hay artefactos de compilación versionados ni sin ignorar bajo types/B/esqueletos', () => {
  const rastreados = (versionado() ?? []).filter((r) => r.startsWith('types/B/esqueletos/'));
  assert.ok(rastreados.length > 0);
  assert.deepEqual(rastreados.filter((r) => /(^|\/)(target|bin|obj|node_modules|__pycache__|\.venv)\//.test(r) || /\.(class|jar|dll|exe|pyc)$/.test(r)), []);
});

test('el manifiesto B declara la carpeta de esqueletos y esqueletoDe solo devuelve el del preset declarado', () => {
  const m = cargarManifiesto('B');
  assert.equal(m.esqueletos, 'types/B/esqueletos');
  assert.equal(esqueletoDe(m, ''), null);
  assert.equal(esqueletoDe(m, 'java-gradle'), null, 'sin esqueleto para Gradle');
  assert.equal(esqueletoDe(m, 'cobol'), null);
  for (const [stack, preset] of Object.entries(STACKS)) {
    const e = esqueletoDe(m, preset);
    assert.equal(e.stack, stack);
    assert.ok(!e.archivos.some((a) => a.destino === 'esqueleto.json'), 'los metadatos no se instalan');
    assert.ok(e.archivos.some((a) => a.destino === 'Dockerfile') && e.archivos.some((a) => a.destino === '.github/workflows/ci.yml'));
  }
  assert.throws(() => esqueletoDe({ esqueletos: '../fuera' }, 'node'), InstalacionInvalida);
});

for (const [stack, preset] of Object.entries(STACKS)) {
  test(`el instalador copia el esqueleto ${stack} solo cuando la ficha declara kit.preset=${preset}, y ningún otro`, (t) => {
    const e = tmp();
    t.after(e.limpiar);
    const plan = planB(e, preset);
    assert.equal(plan.esqueleto, stack);
    assert.ok(plan.advertencias.some((w) => w.includes(`«${stack}»`)));
    assert.ok(describirPlan(plan, { dryRun: true, diff: true }).includes('Dockerfile'), '--dry-run y --diff lo listan');
    assert.deepEqual(readdirSync(e.destino), [], 'el plan no escribe');
    aplicar(plan);
    for (const f of PROPIOS[stack]) assert.ok(existsSync(join(e.destino, f)), f);
    assert.ok(existsSync(join(e.destino, 'Dockerfile')) && existsSync(join(e.destino, '.env.ejemplo')));
    assert.ok(!existsSync(join(e.destino, 'esqueleto.json')));
    for (const otro of Object.keys(STACKS).filter((s) => s !== stack)) assert.ok(!existsSync(join(e.destino, PROPIOS[otro][0])) || PROPIOS[otro][0] === PROPIOS[stack][0], `se coló ${otro}`);
    assert.match(readFileSync(join(e.destino, '.gitignore'), 'utf8'), /^\/\.env$/m);
    const ficha = JSON.parse(readFileSync(join(e.destino, 'kit', 'FICHA-INFRA.json'), 'utf8'));
    assert.equal(ficha.kit.preset, preset);
    const otra = planB(e, preset);
    assert.ok(otra.acciones.filter((a) => a.accion === 'omitir' || a.accion === 'sobrescribir').length === 0, 'reinstalar no cambia nada');
  });
}

test('sin preset, con un preset sin esqueleto o en el tipo A no se instala ningún esqueleto', (t) => {
  const e = tmp();
  t.after(e.limpiar);
  for (const preset of ['', 'java-gradle']) {
    const plan = planB(e, preset);
    assert.equal(plan.esqueleto, undefined);
    assert.ok(!plan.acciones.some((a) => a.destino === 'Dockerfile'), preset);
  }
  const planA = planificar({ destino: e.destino, tipo: 'A', proyecto: 'demo', respaldo: e.respaldo });
  assert.ok(!planA.acciones.some((a) => a.destino === 'Dockerfile' || a.destino === '.env.ejemplo'));
});

test('si el proyecto ya tiene su propio README o Dockerfile, el instalador no los pisa sin --forzar', (t) => {
  const e = tmp();
  t.after(e.limpiar);
  writeFileSync(join(e.destino, 'README.md'), 'mío\n');
  const plan = planB(e, 'node');
  assert.equal(plan.acciones.find((a) => a.destino === 'README.md').accion, 'omitir');
  aplicar(plan);
  assert.equal(readFileSync(join(e.destino, 'README.md'), 'utf8'), 'mío\n');
});

test('prepararProyecto (la verificación manual) instala cada esqueleto con el instalador y deja salud permitida; importarla no ejecuta nada', (t) => {
  for (const stack of Object.keys(STACKS)) {
    const base = mkdtempSync(join(tmpdir(), 'kit-esq-v-'));
    t.after(() => rmSync(base, { recursive: true, force: true }));
    const esq = JSON.parse(leer(stack, 'esqueleto.json'));
    const proyecto = prepararProyecto(esq, base);
    assert.ok(existsSync(join(proyecto, 'Dockerfile')), stack);
    assert.ok(existsSync(join(proyecto, 'scripts', 'salud.mjs')));
    assert.equal(JSON.parse(readFileSync(join(proyecto, 'kit', 'FICHA-INFRA.json'), 'utf8')).ops.salud.permitida, true);
  }
  const r = spawnSync(process.execPath, [join(ESQ, 'verificar.mjs')], { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
  assert.equal(r.status, 2, 'sin argumentos solo explica el uso');
  assert.match(r.stderr, /Uso:/);
});

test('el esqueleto node pasa sus propias pruebas con el Node del kit (sin red ni dependencias)', () => {
  const r = spawnSync(process.execPath, ['--test', 'pruebas/app.spec.mjs'], { cwd: join(ESQ, 'node'), encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_TEST_CONTEXT: undefined } });
  assert.equal(r.status, 0, r.stdout.slice(-600) + r.stderr.slice(-300));
});

test('VERIFICACION.md existe, tiene fecha y marca lo verificado, lo no verificado y lo no ejecutado', () => {
  const v = readFileSync(join(ESQ, 'VERIFICACION.md'), 'utf8');
  assert.match(v, /\d{4}-\d{2}-\d{2}/);
  for (const s of Object.keys(STACKS)) assert.match(v, new RegExp(s));
  assert.match(v, /no ejecutado/i);
  assert.match(v, /no verificado/i);
  assert.match(v, /node types\/B\/esqueletos\/verificar\.mjs/);
});

test('CHANGELOG, ADR 0016 y HANDOFF siguen contando la etapa 2F', () => {
  assert.match(readFileSync(join(raiz, 'CHANGELOG.md'), 'utf8'), /^## \[0\.6\.0\] - \d{4}-\d{2}-\d{2}/m);
  assert.match(readFileSync(join(raiz, 'docs', 'adr', '0016-esqueletos-por-stack-y-notas-verificadas.md'), 'utf8'), /^# 0016\./);
  const handoff = readFileSync(join(raiz, 'HANDOFF.md'), 'utf8');
  assert.match(handoff, /Etapa 2F cerrada/);
  assert.match(handoff, /autoría/);
  assert.match(handoff, /Sin verificar \(y por qué\)/);
});

test('versión 0.9.1 en package.json, README, CHANGELOG (con la 0.7.0 previa) y HANDOFF; ADR 0017 aceptada', () => {
  const { version } = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'));
  assert.equal(version, '0.9.1');
  assert.match(readFileSync(join(raiz, 'CHANGELOG.md'), 'utf8'), /^## \[0.9.1] - \d{4}-\d{2}-\d{2}/m);
  assert.match(readFileSync(join(raiz, 'CHANGELOG.md'), 'utf8'), /^## \[0\.7\.0\] - \d{4}-\d{2}-\d{2}/m);
  assert.match(readFileSync(join(raiz, 'README.md'), 'utf8'), /Versión 0.9.1/);
  assert.match(readFileSync(join(raiz, 'HANDOFF.md'), 'utf8'), /0.9.1, etapa C2/);
  assert.match(readFileSync(join(raiz, 'docs', 'adr', '0017-especificar-antes-de-construir.md'), 'utf8'), /^# 0017\.[\s\S]*Estado: aceptada/);
});
