// Auto-aplicación (ADR 0014): la copia .claude/ del propio kit se genera desde core/ y la ficha del kit; si se desvía, falla.
// Con esas reglas aplicadas, el trabajo normal de una rama de etapa sigue siendo posible.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { planAuto, aplicarAuto, entradasAuto, describirAuto } from '../auto.mjs';
import { main } from '../install.mjs';
import { generarSettings, generarKitConfig, permiteComando } from '../../infra/generate-settings.mjs';
import { evaluar as guardShell } from '../../core/hooks/guard-shell.mjs';
import { evaluar as guardCommit } from '../../core/hooks/guard-commit.mjs';
import { evaluar as guardMerge } from '../../core/hooks/guard-merge.mjs';
import { evaluar as guardWrite } from '../../core/hooks/guard-write.mjs';
import { CONFIG_POR_DEFECTO } from '../../core/hooks/lib/common.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ficha = () => JSON.parse(readFileSync(join(raiz, 'infra', 'ficha-kit.json'), 'utf8'));
const salida = () => { let t = ''; return { write: (x) => { t += x; }, get texto() { return t; } }; };

test('la copia .claude/ del kit coincide con lo que generan core/ y la ficha del kit (si falla: node install/install.mjs --auto)', () => {
  const plan = planAuto();
  assert.deepEqual(plan.desviado.map((a) => `${a.accion} ${a.destino}`), [], 'la copia de .claude/ se desvió de core/: corre «node install/install.mjs --auto» y commitea');
  assert.ok(plan.acciones.some((a) => a.destino === '.claude/hooks/guard-shell.mjs'));
  assert.ok(plan.acciones.some((a) => a.destino === 'kit/FICHA-INFRA.json'));
});

test('no hay hooks de prueba en la copia, ni se genera settings.local.json (solo .generado)', () => {
  const destinos = entradasAuto().map((e) => e.destino);
  assert.ok(!destinos.some((d) => /\.claude\/hooks\/test\//.test(d)));
  assert.ok(destinos.includes('.claude/settings.local.generado.json'));
  assert.ok(!destinos.includes('.claude/settings.local.json'));
});

test('el settings generado y kit.json salen de la ficha del kit con el generador (sin duplicar a mano)', () => {
  const f = ficha();
  assert.deepEqual(JSON.parse(readFileSync(join(raiz, '.claude', 'settings.local.generado.json'), 'utf8')), generarSettings(f));
  assert.deepEqual(JSON.parse(readFileSync(join(raiz, '.claude', 'kit.json'), 'utf8')), generarKitConfig(f));
  assert.deepEqual(JSON.parse(readFileSync(join(raiz, 'kit', 'FICHA-INFRA.json'), 'utf8')), f);
});

test('el sello del kit corre con la ficha del kit: node --test con tiempo máximo y alcance «kit»', () => {
  const cfg = JSON.parse(readFileSync(join(raiz, '.claude', 'kit.json'), 'utf8'));
  assert.deepEqual(cfg.checks, [{ commands: ['node --test'], timeoutSeconds: 900 }]);
  assert.deepEqual(cfg.commitScopes, ['kit']);
  assert.equal(cfg.baseBranch, 'main');
  assert.equal(cfg.maxBranchCommits, 10);
  assert.equal(cfg.gitleaks, true);
});

test('aplicar en una carpeta: crea, es idempotente, detecta desvíos y sobrantes, y nunca crea settings.local.json', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-auto-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const p1 = planAuto({ destino: dir });
  assert.ok(p1.acciones.every((a) => a.accion === 'crear'));
  aplicarAuto(p1);
  assert.equal(planAuto({ destino: dir }).desviado.length, 0, 'idempotente');
  assert.ok(!existsSync(join(dir, '.claude', 'settings.local.json')));

  writeFileSync(join(dir, '.claude', 'hooks', 'guard-shell.mjs'), '// editado a mano\n');
  writeFileSync(join(dir, '.claude', 'hooks', 'viejo.mjs'), '// ya no existe en core\n');
  writeFileSync(join(dir, '.claude', 'settings.local.json'), '{"propio":true}\n');
  const p2 = planAuto({ destino: dir });
  assert.deepEqual(p2.desviado.map((a) => `${a.accion} ${a.destino}`).sort(), ['sobrante .claude/hooks/viejo.mjs', 'sobrescribir .claude/hooks/guard-shell.mjs']);
  assert.match(describirAuto(p2, { dryRun: true, diff: true }), /SOBRANTE/);

  const r = aplicarAuto(p2); // sin forzar: el sobrante se conserva
  assert.deepEqual(r.escritos, ['.claude/hooks/guard-shell.mjs']);
  assert.ok(existsSync(join(dir, '.claude', 'hooks', 'viejo.mjs')));
  aplicarAuto(planAuto({ destino: dir }), { forzar: true });
  assert.ok(!existsSync(join(dir, '.claude', 'hooks', 'viejo.mjs')));
  assert.equal(readFileSync(join(dir, '.claude', 'settings.local.json'), 'utf8'), '{"propio":true}\n', 'el settings.local.json del humano no se toca');
});

test('--auto: dry-run no escribe, rechaza opciones de instalación en otro destino y no admite rutas en --forzar', async () => {
  const o = salida(); const e = salida();
  assert.equal(await main(['--auto', '--dry-run'], { stdout: o, stderr: e }), 0);
  assert.match(o.texto, /AUTO-APLICACIÓN \(dry-run/);
  assert.match(o.texto, /Paso manual del humano/);
  for (const extra of [['--destino', tmpdir()], ['--tipo', 'A'], ['--forzar=a/b']]) {
    const e2 = salida();
    assert.equal(await main(['--auto', ...extra], { stdout: salida(), stderr: e2 }), 2, extra.join(' '));
    assert.match(e2.texto, /--auto/);
  }
});

// --- Con las reglas aplicadas, el trabajo normal de la rama sigue siendo posible --------------------------------------

const settings = () => JSON.parse(readFileSync(join(raiz, '.claude', 'settings.local.generado.json'), 'utf8'));
const config = () => ({ ...CONFIG_POR_DEFECTO, ...JSON.parse(readFileSync(join(raiz, '.claude', 'kit.json'), 'utf8')) });

test('permisos: tests, commits, merge squash, borrar la rama con -D y la propia auto-aplicación están autorizados', () => {
  const { allow, deny } = settings().permissions;
  for (const c of [
    'node --test', 'node --test core/test/pureza.test.mjs', 'timeout 900 node --test', 'git status --short', 'git add -A', 'git commit -m "feat(kit): x"',
    'git switch main', 'git switch -c v1/etapa-2f', 'git merge --squash v1/etapa-2e', 'git branch -D v1/etapa-2e', 'git diff main v1/etapa-2e --stat',
    'git rev-list --count main..HEAD', 'git log --oneline', 'node .claude/hooks/premerge-check.mjs', 'timeout 900 node .claude/hooks/premerge-check.mjs',
    'node install/install.mjs --auto', 'node install/install.mjs --auto --dry-run --diff',
  ]) assert.ok(permiteComando(allow, deny, c), `debería estar autorizado: ${c}`);
  for (const c of ['git rebase main', 'git push --force', 'git push origin main -f', 'curl -X POST https://x.example', 'rm -rf ..', 'wrangler deploy', 'node install/install.mjs --destino x --tipo B', 'node infra/generate-settings.mjs --ficha f.json --destino .'])
    assert.ok(!permiteComando(allow, deny, c), `no debería estar autorizado: ${c}`);
});

test('hooks: lo normal de la rama pasa y lo prohibido se bloquea, con la configuración real del kit', () => {
  const cfg = config();
  const arbol = 'a'.repeat(40);
  const git = (a) => ({
    'rev-parse --abbrev-ref HEAD': 'v1/etapa-2e', 'rev-parse --verify --quiet main': 'x', 'rev-list --count main..HEAD': '3', 'diff --cached --name-only': 'infra/presets.mjs',
    'rev-parse --absolute-git-dir': '/tmp/x/.git',
  })[a.join(' ')] ?? (a[0] === 'rev-parse' && a[1].endsWith('^{tree}') ? arbol : null);
  const ctx = { projectDir: raiz, config: cfg, git, leerSello: () => ({ ok: true, tree: arbol }) };
  const bash = (command, extra = {}) => ({ tool_name: 'Bash', tool_input: { command, ...extra } });
  const todos = (input) => [guardShell(input, ctx), guardCommit(input, ctx), guardMerge(input, ctx)].find(Boolean) ?? null;

  for (const c of [
    'timeout 900 node --test', 'git add -A && git commit -m "feat(kit): presets de sello por stack"', 'git switch main', 'git merge --squash v1/etapa-2e',
    'git commit -m "feat(kit): etapa 2e auto-aplicación, ops y sello por stack"', 'git branch -D v1/etapa-2e', 'git diff main v1/etapa-2e --stat',
    'timeout 600 node .claude/hooks/premerge-check.mjs', 'node install/install.mjs --auto --dry-run',
  ]) assert.equal(todos(bash(c)), null, c);
  assert.equal(todos(bash('node --test', { timeout: 600000 })), null);

  for (const c of ['git rebase main', 'git merge v1/etapa-2e', 'git commit -m "feat(kit): x\n\nCo-Authored-By: alguien <a@b.c>"', 'git commit -m "mala"', 'git commit -m "feat(otro): x"', 'git push --force origin main', 'cat > a.txt'])
    assert.ok(todos(bash(c)), `debería bloquearse: ${c}`);
  /* el merge sin sello vigente se bloquea */
  assert.match(guardMerge(bash('git merge --squash v1/etapa-2e'), { ...ctx, leerSello: () => null }) ?? '', /sello/);
});

test('guard-write con las reglas del kit: se puede escribir cualquier archivo versionado salvo las reglas generadas', () => {
  const cfg = config();
  const ctx = { projectDir: raiz, config: cfg, git: () => null };
  const ls = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: raiz, encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'ignore'] }).split('\0').filter(Boolean);
  const bloqueados = [];
  for (const rel of ls) {
    if (!/\.(md|json|mjs|txt|tpl|jsonc|css|html|plantilla)$/i.test(rel) || rel.startsWith('.claude/')) continue;
    if (!existsSync(join(raiz, rel))) continue;
    const r = guardWrite({ tool_name: 'Write', tool_input: { file_path: join(raiz, rel), content: readFileSync(join(raiz, rel), 'utf8') } }, ctx);
    if (r) bloqueados.push(rel);
  }
  assert.deepEqual(bloqueados, [], 'escribir estos archivos con las reglas aplicadas se bloquearía (¿un secreto de prueba en claro?): construye los falsos por partes');
  /* y las reglas generadas sí quedan protegidas */
  for (const rel of ['.claude/hooks/guard-shell.mjs', '.claude/kit.json', '.claude/settings.local.json'])
    assert.match(guardWrite({ tool_name: 'Edit', tool_input: { file_path: join(raiz, rel), new_string: 'x' } }, ctx) ?? '', /No edites/, rel);
});
