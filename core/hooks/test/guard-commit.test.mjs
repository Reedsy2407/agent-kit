import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluar, extraerMensaje, validarAsunto } from '../guard-commit.mjs';
import { CONFIG_POR_DEFECTO } from '../lib/common.mjs';

/** git simulado: respuestas por comando. */
function fakeGit(r = {}) {
  return (args) => {
    const clave = args.join(' ');
    for (const [k, v] of Object.entries(r)) if (clave === k) return v;
    return null;
  };
}
const base = { 'rev-parse --abbrev-ref HEAD': 'v1/etapa-1', 'rev-parse --verify --quiet main': 'abc', 'rev-list --count main..HEAD': '3', 'diff --cached --name-only': 'src/a.js' };
const ctx = (git = {}, config = {}) => ({ projectDir: '/p', config: { ...CONFIG_POR_DEFECTO, ...config }, git: fakeGit({ ...base, ...git }) });
const commit = (command, c = ctx()) => evaluar({ tool_name: 'Bash', tool_input: { command } }, c);

test('deja un commit convencional con scope', () => assert.equal(commit('git commit -m "feat(kit): añade el instalador"'), null));
test('deja un commit sin scope', () => assert.equal(commit('git commit -m "docs: ajusta el handoff"'), null));
test('deja scope doble separado por coma', () => assert.equal(commit('git commit -m "feat(shared-kernel,recycler-service): evento nuevo"'), null));
test('deja mensaje en heredoc', () => assert.equal(commit("git commit -m \"$(cat <<'EOF'\nfix(kit): corrige el conteo\n\ncuerpo largo\nEOF\n)\""), null));
test('deja git -C dir commit', () => assert.equal(commit('git -C sub commit -m "chore: limpia"'), null));
test('deja -am', () => assert.equal(commit('git commit -am "chore: limpia"'), null));
test('no toca otros comandos git', () => assert.equal(commit('git status'), null));

test('bloquea Co-Authored-By', () => assert.match(commit('git commit -m "feat(kit): x\n\nCo-Authored-By: Alguien <a@b.c>"'), /Co-Authored-By/));
test('bloquea Co-Authored-By en heredoc', () => assert.ok(commit("git commit -m \"$(cat <<'EOF'\nfeat(kit): x\n\nCo-authored-by: X <x@y.z>\nEOF\n)\"")));
test('bloquea la firma de la herramienta', () => assert.ok(commit('git commit -m "feat(kit): x\n\nGenerated with Claude Code"')));
test('bloquea mensaje sin tipo', () => assert.match(commit('git commit -m "arregla cosas"'), /Conventional Commits/));
test('bloquea tipo inválido', () => assert.match(commit('git commit -m "wip(kit): algo"'), /Tipo/));
test('bloquea sufijo (Task N)', () => assert.match(commit('git commit -m "feat(kit): algo (Task 4)"'), /Task/));
test('bloquea punto final', () => assert.match(commit('git commit -m "feat(kit): algo."'), /punto final/));
test('bloquea descripción en mayúscula', () => assert.match(commit('git commit -m "feat(kit): Algo"'), /minúscula/));
test('bloquea commit sin -m (abre editor)', () => assert.match(commit('git commit'), /editor/));

test('scopes permitidos: acepta un módulo real', () => assert.equal(commit('git commit -m "feat(api): x"', ctx({}, { commitScopes: ['api', 'web'] })), null));
test('scopes permitidos: rechaza una entidad interna', () => assert.match(commit('git commit -m "feat(Entidad): x"', ctx({}, { commitScopes: ['api'] })), /Scope/));
test('scopes permitidos: rechaza un módulo desconocido', () => assert.match(commit('git commit -m "feat(otro): x"', ctx({}, { commitScopes: ['api'] })), /fuera de los módulos/));

test('bloquea al llegar al tope de commits de la rama', () => {
  assert.match(commit('git commit -m "feat(kit): x"', ctx({ 'rev-list --count main..HEAD': '10' })), /tope 10/);
});
test('deja el commit 10 (9 previos)', () => assert.equal(commit('git commit -m "feat(kit): x"', ctx({ 'rev-list --count main..HEAD': '9' })), null));
test('--amend no cuenta contra el tope', () => assert.equal(commit('git commit --amend --no-edit', ctx({ 'rev-list --count main..HEAD': '10' })), null));
test('en la rama base no aplica el tope de rama', () => assert.equal(commit('git commit -m "feat(kit): etapa 1"', ctx({ 'rev-parse --abbrev-ref HEAD': 'main', 'rev-list --count main..HEAD': '0' })), null));
test('tope configurable', () => assert.ok(commit('git commit -m "feat(kit): x"', ctx({ 'rev-list --count main..HEAD': '5' }, { maxBranchCommits: 5 }))));

test('bloquea commit de solo registro dentro de una etapa', () => {
  assert.match(commit('git commit -m "docs: notas"', ctx({ 'diff --cached --name-only': 'tasks/todo.md\ndocs/a.md' })), /solo registro/);
});
test('deja registro mezclado con código', () => {
  assert.equal(commit('git commit -m "feat(kit): x"', ctx({ 'diff --cached --name-only': 'tasks/todo.md\nsrc/a.js' })), null);
});
test('solo registro en la rama base sí se deja', () => {
  assert.equal(commit('git commit -m "docs: notas"', ctx({ 'rev-parse --abbrev-ref HEAD': 'main', 'diff --cached --name-only': 'docs/a.md' })), null);
});

const modulos = { modules: [{ path: 'svc/', max: 30 }] };
test('bloquea el módulo que llegó a su tope de vida', () => {
  assert.match(commit('git commit -m "feat(svc): x"', ctx({ 'diff --cached --name-only': 'svc/a.js', 'rev-list --count main -- svc/': '30' }, modulos)), /tope 30/);
});
test('deja el módulo bajo su tope', () => {
  assert.equal(commit('git commit -m "feat(svc): x"', ctx({ 'diff --cached --name-only': 'svc/a.js', 'rev-list --count main -- svc/': '29' }, modulos)), null);
});
test('no cuenta el módulo si el stage no lo toca', () => {
  assert.equal(commit('git commit -m "feat(web): x"', ctx({ 'diff --cached --name-only': 'web/a.js', 'rev-list --count main -- svc/': '99' }, modulos)), null);
});

test('extraerMensaje lee -m y heredoc', () => {
  assert.equal(extraerMensaje('git commit -m "a b"'), 'a b');
  assert.equal(extraerMensaje("git commit -m 'x y'"), 'x y');
  assert.equal(extraerMensaje("git commit -m \"$(cat <<'EOF'\nuno\n\ndos\nEOF\n)\""), 'uno\n\ndos');
  assert.equal(extraerMensaje('git commit --amend --no-edit'), null);
});
test('validarAsunto acepta tipos de la configuración', () => {
  assert.equal(validarAsunto('ci: ajusta', { commitTypes: ['ci'] }), null);
});
