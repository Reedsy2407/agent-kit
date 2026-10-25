// Presets del sello por stack: el generador los expande a checks con tiempo máximo, autoriza solo los comandos del preset
// declarado, guard-shell exige timeout en ellos y el sello los corre (con dobles: nunca se ejecuta un comando real).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { PRESETS, IDS_PRESETS, checksDePreset, permisosDePreset, avisoDePreset } from '../presets.mjs';
import { generarSettings, generarKitConfig, validarFicha, FichaInvalida } from '../generate-settings.mjs';
import { evaluar as guardShell } from '../../core/hooks/guard-shell.mjs';
import { ejecutar } from '../../core/hooks/premerge-check.mjs';
import { CONFIG_POR_DEFECTO, git as gitReal } from '../../core/hooks/lib/common.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const plantilla = () => ({ ...JSON.parse(readFileSync(new URL('../ficha-infra.template.json', import.meta.url), 'utf8')), proyecto: 'demo' });
const conPreset = (id, extra = {}) => { const f = plantilla(); f.kit = { ...f.kit, preset: id, ...extra }; return f; };

test('hay un preset para java-maven, java-gradle, dotnet, node y python, cada uno con comando y tiempo máximo', () => {
  assert.deepEqual([...IDS_PRESETS].sort(), ['dotnet', 'java-gradle', 'java-maven', 'node', 'python']);
  for (const id of IDS_PRESETS) {
    const p = PRESETS[id];
    assert.ok(p.comandos.length && p.comandos.every((c) => typeof c === 'string' && c.trim()), id);
    assert.ok(Number.isInteger(p.timeoutSeconds) && p.timeoutSeconds > 0 && p.timeoutSeconds <= 3600, id);
    assert.equal(typeof p.verificado, 'boolean');
  }
  /* Solo es «verificado» un preset cuyo comando se ejecutó con éxito sobre el esqueleto de su stack (types/B/esqueletos/VERIFICACION.md). */
  for (const id of ['java-maven', 'dotnet', 'node', 'python']) {
    assert.equal(PRESETS[id].verificado, true, id);
    assert.match(PRESETS[id].verificadoEl, /^\d{4}-\d{2}-\d{2}$/, id);
    assert.ok(existsSync(join(raiz, 'types', 'B', 'esqueletos', PRESETS[id].esqueleto, 'esqueleto.json')), `${id}: el esqueleto existe`);
    assert.equal(JSON.parse(readFileSync(join(raiz, 'types', 'B', 'esqueletos', PRESETS[id].esqueleto, 'esqueleto.json'), 'utf8')).preset, id);
  }
  assert.equal(PRESETS['java-gradle'].verificado, false, 'no hay Gradle en la máquina de verificación: sigue sin verificar');
  assert.equal(PRESETS['java-gradle'].verificadoEl, undefined);
});

for (const id of IDS_PRESETS) {
  test(`preset ${id}: la ficha genera checks con timeout y autoriza solo sus comandos`, () => {
    const ficha = conPreset(id);
    const kit = generarKitConfig(ficha);
    assert.deepEqual(kit.checks, checksDePreset(id));
    assert.ok(kit.checks[0].timeoutSeconds > 0);
    assert.equal(kit.preset.id, id);
    assert.equal(kit.preset.aviso === null, PRESETS[id].verificado);
    const { allow } = generarSettings(ficha).permissions;
    for (const permiso of permisosDePreset(id)) assert.ok(allow.includes(permiso), permiso);
    /* sin declarar el preset, sus comandos no están autorizados */
    const sin = generarSettings(plantilla()).permissions.allow;
    for (const permiso of permisosDePreset(id)) assert.ok(!sin.includes(permiso), `${permiso} no debe estar sin declarar ${id}`);
    /* ni los de otros presets */
    for (const otro of IDS_PRESETS.filter((x) => x !== id)) for (const permiso of permisosDePreset(otro)) if (!permisosDePreset(id).includes(permiso)) assert.ok(!allow.includes(permiso), `${permiso} de ${otro} no debe colarse en ${id}`);
  });

  test(`preset ${id}: guard-shell exige timeout en su comando y lo deja pasar con timeout`, () => {
    const ctx = { projectDir: join(homedir(), 'p'), config: { ...CONFIG_POR_DEFECTO }, git: () => null };
    for (const c of PRESETS[id].comandos) {
      const r = guardShell({ tool_name: 'Bash', tool_input: { command: c } }, ctx);
      assert.match(r ?? '', /timeout/, `«${c}» debería exigir timeout`);
      assert.equal(guardShell({ tool_name: 'Bash', tool_input: { command: `timeout 600 ${c}` } }, ctx), null);
      assert.equal(guardShell({ tool_name: 'Bash', tool_input: { command: c, timeout: 600000 } }, ctx), null);
    }
  });

  test(`preset ${id}: el sello corre el comando con su tiempo máximo y avisa si no está verificado`, (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'kit-preset-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const g = (...a) => { const r = spawnSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); assert.equal(r.status, 0, r.stderr); };
    g('init', '-q', '-b', 'main'); g('config', 'user.name', 'T'); g('config', 'user.email', 't@users.noreply.example');
    writeFileSync(join(dir, 'a.txt'), '1\n'); g('add', '.'); g('commit', '-q', '-m', 'chore: base');
    const ejecutados = []; const logs = [];
    const io = { spawn: (c, o) => { ejecutados.push([c, o?.timeout]); return { status: 0 }; }, escribir() {}, borrar() {}, log: (x) => logs.push(x), ahora: () => 'hoy', escanear: () => ({ ok: true, hallazgos: [], archivos: 1, commits: 1 }) };
    const config = { ...CONFIG_POR_DEFECTO, ...generarKitConfig(conPreset(id)), gitleaks: false };
    const r = ejecutar({ projectDir: dir, config, git: (a) => gitReal(a, dir), io });
    assert.equal(r.ok, true, r.motivo);
    assert.deepEqual(ejecutados, PRESETS[id].comandos.map((c) => [c, PRESETS[id].timeoutSeconds * 1000]));
    assert.equal(logs.some((l) => /NO está verificado/.test(l)), !PRESETS[id].verificado);
  });
}

test('un preset desconocido invalida la ficha; vacío no es un error', () => {
  assert.throws(() => validarFicha(conPreset('cobol')), (e) => e instanceof FichaInvalida && /kit\.preset «cobol»/.test(e.message));
  assert.doesNotThrow(() => validarFicha(conPreset('')));
  assert.equal(avisoDePreset('node'), null);
  assert.equal(avisoDePreset('dotnet'), null);
  assert.match(avisoDePreset('java-gradle'), /NO está verificado/);
  assert.equal(avisoDePreset(''), null);
});

test('timeoutSeconds inválido invalida la ficha', () => {
  for (const t of [0, -5, 'rápido', 1.5, 99999]) assert.throws(() => validarFicha(conPreset('', { checks: [{ commands: ['x'], timeoutSeconds: t }] })), /timeoutSeconds/, String(t));
});

test('si la ficha define sus propios checks, mandan sobre el preset (que solo aporta permisos)', () => {
  const propios = [{ commands: ['dotnet test MiSolucion.sln'], timeoutSeconds: 120 }];
  const kit = generarKitConfig(conPreset('dotnet', { checks: propios }));
  assert.deepEqual(kit.checks, propios);
});
