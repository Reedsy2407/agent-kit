import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { evaluar } from '../guard-shell.mjs';
import { CONFIG_POR_DEFECTO } from '../lib/common.mjs';

const ctx = { projectDir: join(homedir(), 'proyecto-de-prueba'), config: { ...CONFIG_POR_DEFECTO }, git: () => null };
const bash = (command, extra = {}) => evaluar({ tool_name: 'Bash', tool_input: { command, ...extra } }, ctx);

const BLOQUEA = [
  ['cat con redirección de escritura', 'cat > notas.txt'],
  ['cat con heredoc', "cat <<'EOF' > a.txt\nhola\nEOF"],
  ['cat sin archivo', 'cat'],
  ['editor', 'vim archivo.txt'],
  ['paginador en tubería', 'git log | less'],
  ['read', 'read respuesta'],
  ['intérprete sin script', 'python3'],
  ['intérprete leyendo stdin', 'node -'],
  ['heredoc a un intérprete', "python - <<EOF\nprint(1)\nEOF"],
  ['pkill por nombre', 'pkill java'],
  ['taskkill por imagen', 'taskkill /F /IM node.exe'],
  ['bucle infinito', 'while true; do echo x; done'],
  ['yes como carga', 'yes > /dev/null'],
  ['tail -f', 'tail -f app.log'],
  ['--tail de una CLI', 'render logs --tail --resources x'],
  ['watch', 'watch ls'],
  ['git rebase -i', 'git rebase -i HEAD~3'],
  ['servidor en primer plano', 'ng serve'],
  ['rm con ..', 'rm -rf ../otra'],
  ['rm de la raíz', 'rm -rf /'],
  ['push forzado', 'git push --force origin main'],
  ['docker prune', 'docker system prune -af'],
  ['escritura a la carpeta padre', 'echo x > ../salida.log'],
  ['escritura fuera del proyecto', `echo x > ${join(homedir(), 'otra-carpeta', 'a.log').replace(/\\/g, '/')}`],
  ['runner largo sin timeout', 'mvn verify'],
  ['pruebas de front sin timeout', 'node tests/front/run.mjs --solo contraste'],
  ['capturas sin timeout', 'node tests/front/herramientas/capturas.mjs --etiqueta d1'],
  ['runner largo tras cd', 'cd app && npm test'],
  ['go test sin timeout', 'go test ./...'],
  ['go vet sin timeout', 'go vet ./...'],
  ['govulncheck sin timeout', 'govulncheck ./...'],
  ['cargo test sin timeout', 'cargo test'],
  ['cargo clippy sin timeout', 'cargo clippy --all-targets -- -D warnings'],
  ['cargo fmt sin timeout', 'cargo fmt --check'],
  ['ruff check sin timeout', 'ruff check .'],
  ['ruff format sin timeout', 'ruff format --check .'],
  ['unittest sin timeout', 'python -m unittest discover -s tests -t .'],
  ['pip-audit sin timeout', 'pip-audit .'],
];

for (const [nombre, cmd] of BLOQUEA) {
  test(`bloquea: ${nombre}`, () => assert.ok(bash(cmd), `debía bloquear: ${cmd}`));
}

const PASA = [
  ['lectura normal', 'git status'],
  ['cat de un archivo', 'cat README.md'],
  ['texto de un commit que menciona cat > y vim', 'git commit -m "no uses cat > ni vim"'],
  ['heredoc de un commit', "git commit -m \"$(cat <<'EOF'\nfeat: arregla cat > algo\nEOF\n)\""],
  ['redirección a /dev/null', 'ls 2>&1 > /dev/null'],
  ['redirección dentro del proyecto', `echo x > ${join(ctx.projectDir, 'log.txt').replace(/\\/g, '/')}`],
  ['redirección relativa', 'echo x > tmp/log.txt'],
  ['taskkill por PID', 'taskkill /PID 1234 /F'],
  ['kill por PID', 'kill 1234'],
  ['tail con límite', 'tail -n 50 app.log'],
  ['docker logs con --tail N', 'docker logs --tail 20 web'],
  ['rm de un archivo concreto', 'rm -f tmp/a.log'],
  ['git push normal', 'git push origin v1/etapa-1'],
  ['runner con timeout', 'timeout 900 mvn verify'],
  ['go test con timeout', 'timeout 900 go test ./...'],
  ['cargo test con timeout', 'timeout 900 cargo test'],
  ['ruff con timeout', 'timeout 900 ruff check .'],
  ['unittest con timeout', 'timeout 900 python -m unittest discover -s tests -t .'],
  ['cargo clippy con timeout en la herramienta', 'cargo clippy --all-targets -- -D warnings', { timeout: 600000 }],
  ['pruebas de front con timeout', 'timeout 600 node tests/front/run.mjs'],
  ['runner con timeout en la herramienta', 'mvn verify', { timeout: 600000 }],
  ['runner en segundo plano', 'mvn verify', { run_in_background: true }],
  ['servidor en segundo plano', 'ng serve', { run_in_background: true }],
  ['compose en segundo plano (-d)', 'timeout 120 docker compose up -d'],
  ['python con script', 'python script.py < /dev/null'],
];

for (const [nombre, cmd, extra] of PASA) {
  test(`deja pasar: ${nombre}`, () => assert.equal(bash(cmd, extra), null));
}

test('ignora herramientas que no son Bash', () => {
  assert.equal(evaluar({ tool_name: 'Read', tool_input: { file_path: 'x' } }, ctx), null);
});
