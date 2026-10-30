// Activación del tipo C (ADR 0019): el instalador y el generador de fichas lo aceptan con los presets go, python y rust
// y rechazan cualquier otro con un mensaje claro; los presets del tipo B no se mezclan con los del C.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planificar, aplicar, main } from '../../../install/install.mjs';
import { generarSettings, generarKitConfig, validarFicha, FichaInvalida } from '../../../infra/generate-settings.mjs';
import { PRESETS_C, IDS_PRESETS_C, IDS_PRESETS, checksDePreset, permisosDePreset, avisoDePreset } from '../../../infra/presets.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ficha = (preset, tipo = 'C') => ({ ...JSON.parse(readFileSync(join(raiz, 'types', 'C', 'ficha-infra.json'), 'utf8')), proyecto: 'demo', tipo, kit: { ...JSON.parse(readFileSync(join(raiz, 'types', 'C', 'ficha-infra.json'), 'utf8')).kit, preset } });

test('los presets del tipo C son go, python y rust, con comandos propios y distintos de los del tipo B', () => {
  assert.deepEqual([...IDS_PRESETS_C].sort(), ['go', 'python', 'rust']);
  for (const id of IDS_PRESETS_C) {
    const p = PRESETS_C[id];
    assert.ok(p.comandos.length >= 2 && p.comandos.every((c) => typeof c === 'string' && c.trim()), id);
    assert.ok(Number.isInteger(p.timeoutSeconds) && p.timeoutSeconds > 0 && p.timeoutSeconds <= 3600, id);
    assert.equal(p.esqueleto, id);
  }
  assert.ok(IDS_PRESETS.includes('python') && !PRESETS_C.python.comandos.some((c) => /pytest/.test(c)), 'el python del tipo C no es el de pytest');
  assert.match(PRESETS_C.rust.comandos.join(' '), /fmt --check[\s\S]*clippy[\s\S]*-D warnings[\s\S]*test/);
  assert.match(PRESETS_C.python.comandos.join(' '), /ruff check[\s\S]*ruff format --check[\s\S]*unittest/);
  assert.match(PRESETS_C.go.comandos.join(' '), /go vet[\s\S]*go test/);
});

for (const id of IDS_PRESETS_C) {
  test(`preset C ${id}: la ficha genera checks y autoriza solo sus comandos; sin declararlo no hay permisos`, () => {
    const f = ficha(id);
    const kit = generarKitConfig(f);
    assert.deepEqual(kit.checks, checksDePreset(id, 'C'));
    assert.equal(kit.preset.id, id);
    assert.equal(kit.preset.aviso === null, PRESETS_C[id].verificado);
    const { allow } = generarSettings(f).permissions;
    for (const permiso of permisosDePreset(id, 'C')) assert.ok(allow.includes(permiso), permiso);
    const sin = generarSettings(ficha('')).permissions.allow;
    for (const permiso of permisosDePreset(id, 'C')) assert.ok(!sin.includes(permiso), permiso);
    if (!PRESETS_C[id].verificado) assert.match(avisoDePreset(id, 'C'), /NO está verificado/);
  });
}

test('un preset ajeno al tipo se rechaza con mensaje claro, en los dos sentidos', () => {
  for (const malo of ['node', 'java-maven', 'dotnet', 'ruby', 'Go']) assert.throws(() => validarFicha(ficha(malo)), (e) => e instanceof FichaInvalida && /para el tipo C \(usa go, python, rust/.test(e.message), malo);
  assert.throws(() => validarFicha(ficha('go', 'B')), /no existe.*usa java-maven/);
  assert.throws(() => validarFicha(ficha('rust', 'A')), /no existe/);
  assert.doesNotThrow(() => validarFicha(ficha('')));
  assert.deepEqual(generarKitConfig(ficha('')).checks, [], 'sin preset ni pruebas el sello se niega (premerge-check)');
});

test('la ficha del tipo C no asume proveedor y declara cómo se distribuye', () => {
  const f = JSON.parse(readFileSync(join(raiz, 'types', 'C', 'ficha-infra.json'), 'utf8'));
  assert.equal(f.tipo, 'C');
  assert.equal(f.despliegue.proveedor, '');
  assert.equal(f.distribucion.proveedor, '');
  assert.match(f.distribucion.integridad, /SHA-256/);
  assert.deepEqual(f.kit.checks, []);
  assert.equal(f.kit.preset, '');
  assert.ok(!('front' in f.kit), 'el tipo C no tiene front');
});

function destino() {
  const base = mkdtempSync(join(tmpdir(), 'kit-c-inst-'));
  mkdirSync(join(base, 'destino')); mkdirSync(join(base, 'respaldo'));
  return { base, destino: join(base, 'destino'), respaldo: join(base, 'respaldo'), limpiar: () => rmSync(base, { recursive: true, force: true }) };
}

test('el instalador acepta --tipo C (y su mensaje de error lo menciona) y rechaza un preset ajeno antes de escribir', async () => {
  const e = destino();
  try {
    let err = '';
    const io = { stdout: { write: () => {} }, stderr: { write: (t) => { err += t; } }, interactivo: false };
    assert.equal(await main(['--destino', e.destino, '--tipo', 'Z'], io), 2);
    assert.match(err, /usa A, B o C/);
    const p = planificar({ destino: e.destino, tipo: 'C', proyecto: 'demo', respaldo: e.respaldo, ahora: new Date('2026-10-29T10:00:00Z') });
    assert.equal(p.pendienteEtapa2, false);
    const destinos = p.acciones.map((a) => a.destino);
    for (const d of ['kit/GUIA-DECISION.md', 'kit/plantillas/VIABILIDAD-TIPO-C.md', 'kit/plantillas/ADR.md', 'kit/ejemplos-viabilidad-c/go-verificador-de-copias.json', 'kit/ejemplos-adr-c/herramienta-simple-primero.md', '.claude/skills/evaluar-viabilidad/SKILL.md', '.claude/skills/elegir-stack-proporcional/SKILL.md', 'kit/FICHA-INFRA.json'])
      assert.ok(destinos.includes(d), d);
    assert.ok(!destinos.some((d) => /consultar-catalogo|^kit\/catalogo|casos-privados|^tests\/front|^design\//.test(d)), 'del tipo B solo viajan las dos skills de decisión');
    assert.deepEqual(p.gitignore.añadir.filter((l) => l.includes('casos-privados')), []);
  } finally { e.limpiar(); }
});
