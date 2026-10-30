import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { generarSettings, generarKitConfig, validarFicha, detectarTapadas, escribirGenerados, FichaInvalida, ALLOW_BASE, DENY_BASE } from '../generate-settings.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const plantilla = () => ({ ...JSON.parse(readFileSync(join(raiz, 'infra', 'ficha-infra.template.json'), 'utf8')), proyecto: 'demo' });
const con = (cambios) => ({ ...plantilla(), ...cambios });

test('la plantilla de ficha, con nombre de proyecto, genera settings válidos', () => {
  const s = generarSettings(plantilla());
  assert.deepEqual(s.permissions.allow, ALLOW_BASE);
  assert.deepEqual(s.permissions.deny, DENY_BASE);
});

test('registra cada hook con el ejecutable node en forma exec y ruta de CLAUDE_PROJECT_DIR', () => {
  const { hooks } = generarSettings(plantilla());
  const entradas = hooks.PreToolUse.flatMap((g) => g.hooks);
  assert.ok(entradas.length >= 4);
  for (const h of entradas) {
    assert.equal(h.type, 'command');
    assert.equal(h.command, 'node');
    const ruta = h.args[0].replace('${CLAUDE_PROJECT_DIR}/.claude/hooks/', '');
    assert.ok(existsSync(join(raiz, 'core', 'hooks', ruta)), `${ruta} debe existir en core/hooks`);
  }
  assert.equal(hooks.PreToolUse[0].matcher, 'Bash');
});

test('añade las autorizaciones y denegaciones de la ficha', () => {
  const s = generarSettings(con({
    despliegue: { proveedor: 'x', cli: 'mi-cli', servicios: ['srv-1'], permitidos: ['Bash(mi-cli deploys create srv-1:*)'], denegados: ['Bash(mi-cli deploys list:*)'] },
    logs: { metodo: 'x', permitidos: ['Bash(mi-cli logs:*)'] },
    urlsPublicas: ['https://ejemplo.org'],
  }));
  assert.ok(s.permissions.allow.includes('Bash(mi-cli deploys create srv-1:*)'));
  assert.ok(s.permissions.allow.includes('Bash(mi-cli logs:*)'));
  assert.ok(s.permissions.allow.includes('Bash(curl * https://ejemplo.org/*)'));
  assert.ok(s.permissions.deny.includes('Bash(mi-cli deploys list:*)'));
});

test('falla si una denegación general tapa una autorización específica (una denegación gana)', () => {
  const ficha = con({ despliegue: { permitidos: ['Bash(mi-cli deploys create srv-1:*)'], denegados: ['Bash(mi-cli deploys:*)'] } });
  assert.throws(() => generarSettings(ficha), (e) => e instanceof FichaInvalida && /queda tapada/.test(e.message) && /mi-cli deploys create srv-1/.test(e.message));
});

test('no falla si las denegaciones son específicas', () => {
  const ficha = con({ despliegue: { permitidos: ['Bash(mi-cli deploys create srv-1:*)'], denegados: ['Bash(mi-cli deploys list:*)', 'Bash(mi-cli deploys cancel:*)'] } });
  assert.doesNotThrow(() => generarSettings(ficha));
});

test('detectarTapadas entiende x:* y x * como equivalentes y los comodines intermedios', () => {
  assert.equal(detectarTapadas(['Bash(a b c:*)'], ['Bash(a b *)']).length, 1);
  assert.equal(detectarTapadas(['Bash(a b c)'], ['Bash(a b:*)']).length, 1);
  assert.equal(detectarTapadas(['Bash(a b c:*)'], ['Bash(a d:*)']).length, 0);
  assert.equal(detectarTapadas(['Bash(curl * https://x.org/*)'], ['Bash(curl * -X *)']).length, 0);
  assert.equal(detectarTapadas(['Bash(neonctl branches delete pre-:*)'], ['Bash(neonctl branches delete main:*)']).length, 0);
  assert.equal(detectarTapadas(['Bash(a)'], ['Bash']).length, 1);
  assert.equal(detectarTapadas(['Read(./x)'], ['Bash(./x:*)']).length, 0);
});

test('una autorización base tapada por una denegación de la ficha también falla', () => {
  assert.throws(() => generarSettings(con({ permisos: { permitidos: [], denegados: ['Bash(git push:*)'] } })), FichaInvalida);
});

test('rechaza reglas mal formadas', () => {
  assert.throws(() => generarSettings(con({ permisos: { permitidos: ['no es una regla!'], denegados: [] } })), /no es una regla/);
});

test('rechaza una ficha con forma de secreto', () => {
  const clave = `AKIA${'ABCDEFGHIJKLMNOP'}`;
  assert.throws(() => generarSettings(con({ loginManual: [`usar la clave ${clave}`] })), /no lleva secretos/);
});

test('rechaza ficha sin proyecto, con tipo inválido o URLs con comodines', () => {
  assert.throws(() => validarFicha({ ...plantilla(), proyecto: '' }), /proyecto/);
  assert.throws(() => validarFicha({ ...plantilla(), tipo: 'D' }), /tipo/);
  assert.throws(() => validarFicha(con({ urlsPublicas: ['http://x.org/*'] })), /https/);
});

test('rechaza límites y comprobaciones mal formados', () => {
  assert.throws(() => validarFicha(con({ kit: { maxBranchCommits: 0 } })), /maxBranchCommits/);
  assert.throws(() => validarFicha(con({ kit: { modules: [{ path: 'a/' }] } })), /modules/);
  assert.throws(() => validarFicha(con({ kit: { checks: [{ paths: ['a/'] }] } })), /checks/);
});

test('kit.json toma los valores de la ficha y completa los que faltan', () => {
  const k = generarKitConfig(con({ kit: { maxBranchCommits: 7, modules: [{ path: 'web/', max: 30 }] } }));
  assert.equal(k.maxBranchCommits, 7);
  assert.equal(k.baseBranch, 'main');
  assert.deepEqual(k.modules, [{ path: 'web/', max: 30 }]);
  assert.equal(k.gitleaks, true);
});

test('escribirGenerados no pisa un settings.local.json existente', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-infra-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, '.claude'));
  writeFileSync(join(dir, '.claude', 'settings.local.json'), '{"original":true}');
  const r = escribirGenerados(plantilla(), dir);
  assert.equal(r.existente, true);
  assert.equal(readFileSync(join(dir, '.claude', 'settings.local.json'), 'utf8'), '{"original":true}');
  assert.ok(existsSync(join(dir, '.claude', 'settings.local.generado.json')));
  assert.ok(existsSync(join(dir, '.claude', 'kit.json')));
});

test('escribirGenerados crea settings.local.json si no hay uno', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-infra-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const r = escribirGenerados(plantilla(), dir);
  assert.equal(r.existente, false);
  assert.ok(JSON.parse(readFileSync(r.settings, 'utf8')).permissions.deny.length > 5);
});
