// Material privado del tipo C (ADR 0019): vive en una carpeta propia que git ignora, nunca se versiona y el instalador
// no lo copia a ningún proyecto (ni del tipo C ni del B). Nunca se lee su contenido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { planificar } from '../../../install/install.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const git = (...args) => spawnSync('git', args, { cwd: raiz, encoding: 'utf8', timeout: 20000 });

test('types/C/casos-privados/ y los archivos que se pongan dentro están ignorados por git y no versionados', () => {
  assert.equal(git('check-ignore', '-q', '--', 'types/C/casos-privados/referencias-tipo-c.md').status, 0, 'debe estar en .gitignore');
  assert.equal(git('check-ignore', '-q', '--', 'types/C/casos-privados/cualquier-cosa.md').status, 0);
  const rastreados = execFileSync('git', ['ls-files', '-z', '--', 'types/C/casos-privados'], { cwd: raiz, encoding: 'utf8', timeout: 20000 });
  assert.equal(rastreados, '', 'material privado rastreado por git');
  const versionables = git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'types/C/casos-privados').stdout;
  assert.equal(versionables, '', 'git lo versionaría');
});

test('el instalador no copia el material privado del tipo C a ningún proyecto, ni del tipo C ni del B', () => {
  for (const tipo of ['B', 'C']) {
    const base = mkdtempSync(join(tmpdir(), 'kit-priv-c-'));
    try {
      mkdirSync(join(base, 'destino')); mkdirSync(join(base, 'respaldo'));
      const plan = planificar({ destino: join(base, 'destino'), tipo, proyecto: 'demo', respaldo: join(base, 'respaldo'), ahora: new Date('2026-10-29T10:00:00Z') });
      const origenes = plan.acciones.map((a) => a.destino);
      assert.ok(!origenes.some((d) => /referencias-tipo-c/.test(d)), `tipo ${tipo}: no debe instalar las referencias del tipo C`);
      if (tipo === 'C') assert.ok(!origenes.some((d) => /casos-privados/.test(d)), 'el tipo C no instala ningún material privado');
    } finally { rmSync(base, { recursive: true, force: true }); }
  }
});
