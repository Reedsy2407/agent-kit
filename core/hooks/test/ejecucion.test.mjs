// Prueba de extremo a extremo del contrato con Claude Code: JSON por stdin, 2 = bloquea (motivo en stderr), 0 = pasa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const aqui = dirname(fileURLToPath(import.meta.url));
const hook = (nombre) => join(aqui, '..', nombre);
const proyecto = mkdtempSync(join(tmpdir(), 'kit-hooks-'));
test.after(() => rmSync(proyecto, { recursive: true, force: true }));

function ejecuta(nombre, entrada, texto) {
  return spawnSync(process.execPath, [hook(nombre)], {
    input: texto ?? JSON.stringify(entrada), encoding: 'utf8', timeout: 20000,
    env: { ...process.env, CLAUDE_PROJECT_DIR: proyecto },
  });
}

test('guard-shell sale con 2 y explica en stderr', () => {
  const r = ejecuta('guard-shell.mjs', { tool_name: 'Bash', cwd: proyecto, tool_input: { command: 'cat > a.txt' } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /BLOQUEADO/);
});

test('guard-shell sale con 0 si el comando es válido', () => {
  const r = ejecuta('guard-shell.mjs', { tool_name: 'Bash', cwd: proyecto, tool_input: { command: 'git status' } });
  assert.equal(r.status, 0);
});

test('un error interno no bloquea (sale con 1)', () => {
  const r = ejecuta('guard-shell.mjs', null, '{no es json');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /error interno/);
});

test('guard-write bloquea fuera del proyecto con 2', () => {
  const r = ejecuta('guard-write.mjs', { tool_name: 'Write', cwd: proyecto, tool_input: { file_path: join(proyecto, '..', '..', 'fuera', 'a.txt'), content: 'x' } });
  assert.equal(r.status, 2);
});
