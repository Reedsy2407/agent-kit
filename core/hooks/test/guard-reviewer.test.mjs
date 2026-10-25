import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluar } from '../guard-reviewer.mjs';

const bash = (command) => evaluar({ tool_name: 'Bash', tool_input: { command } });

for (const c of ['git diff main..HEAD', 'git log --oneline -n 5', 'git show HEAD~1', 'git rev-list --count main..HEAD', 'git status',
  'node --test', 'timeout 900 mvn verify', 'npm run lint', 'npx playwright test', 'ng test --watch=false', 'ls -la src', 'git diff | wc -l', 'node --test 2>&1 > /dev/null'])
  test(`deja pasar: ${c}`, () => assert.equal(bash(c), null));

for (const c of ['git commit -m "x"', 'git push', 'git reset --hard', 'git checkout -- a.js', 'git add .', 'rm -rf src', 'sed -i s/a/b/ f', 'touch a', 'mkdir x',
  'node script.js', 'echo hola > a.txt', 'git diff > parche.txt', 'git log | tee salida.txt', 'curl https://ejemplo.org', 'npm install'])
  test(`bloquea: ${c}`, () => assert.ok(bash(c), c));

test('un mensaje entre comillas no cuenta como comando', () => assert.equal(bash('echo "git commit > a"'), null));
test('ignora otras herramientas', () => assert.equal(evaluar({ tool_name: 'Read', tool_input: {} }), null));
