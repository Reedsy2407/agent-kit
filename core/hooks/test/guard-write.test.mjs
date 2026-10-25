import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { evaluar } from '../guard-write.mjs';
import { CONFIG_POR_DEFECTO } from '../lib/common.mjs';

const proyecto = join(homedir(), 'proyecto-de-prueba');
const ctx = { projectDir: proyecto, config: { ...CONFIG_POR_DEFECTO }, git: () => null };
const escribe = (file_path, content = 'hola', tool = 'Write') => evaluar({ tool_name: tool, tool_input: { file_path, content } }, ctx);
// Se arman en tiempo de ejecución para que el propio repo no contenga cadenas con forma de secreto.
const clavePrivada = `-----BEGIN ${'RSA'} PRIVATE KEY-----`;
const claveAws = `AKIA${'ABCDEFGHIJKLMNOP'}`;
const jwt = ['eyJ' + 'a'.repeat(20), 'eyJ' + 'b'.repeat(20), 'c'.repeat(20)].join('.');

test('deja escribir dentro del proyecto', () => assert.equal(escribe(join(proyecto, 'src', 'a.js')), null));
test('deja escribir en la carpeta temporal', () => assert.equal(escribe(join(tmpdir(), 'x.log')), null));
test('bloquea escribir fuera del proyecto', () => assert.match(escribe(join(homedir(), 'otra', 'a.txt')), /fuera del proyecto/));
test('bloquea escribir en la carpeta padre con ..', () => assert.ok(escribe(join(proyecto, '..', 'a.txt'))));
test('deja escribir la memoria de Claude en el home', () => assert.equal(escribe(join(homedir(), '.claude', 'projects', 'p', 'memory', 'a.md')), null));
test('bloquea los hooks', () => assert.match(escribe(join(proyecto, '.claude', 'hooks', 'guard-shell.mjs')), /reglas que se hacen cumplir/));
test('bloquea kit.json', () => assert.ok(escribe(join(proyecto, '.claude', 'kit.json'))));
test('bloquea settings.local.json', () => assert.ok(escribe(join(proyecto, '.claude', 'settings.local.json'))));
test('bloquea settings del home', () => assert.ok(escribe(join(homedir(), '.claude', 'settings.json'))));
test('bloquea .env', () => assert.match(escribe(join(proyecto, '.env.local')), /secretos/));
test('deja escribir .env.example', () => assert.equal(escribe(join(proyecto, '.env.example'), 'DB_URL='), null));
test('deja escribir .env.ejemplo y .env.plantilla (los esqueletos del tipo B usan «ejemplo»), pero no otros .env.*', () => {
  assert.equal(escribe(join(proyecto, '.env.ejemplo'), 'APP_ENTORNO='), null);
  assert.equal(escribe(join(proyecto, '.env.plantilla'), 'APP_ENTORNO='), null);
  assert.match(escribe(join(proyecto, '.env.produccion'), 'APP_ENTORNO='), /secretos o claves/);
});
test('bloquea claves .pem', () => assert.ok(escribe(join(proyecto, 'certs', 'a.pem'))));
test('bloquea clave privada en el contenido', () => assert.match(escribe(join(proyecto, 'a.txt'), clavePrivada), /clave privada/));
test('bloquea clave AWS en Edit', () => assert.match(evaluar({ tool_name: 'Edit', tool_input: { file_path: join(proyecto, 'a.js'), new_string: `k="${claveAws}"` } }, ctx), /AWS/));
test('bloquea JWT', () => assert.match(escribe(join(proyecto, 'a.js'), `t="${jwt}"`), /JWT/));
test('bloquea conexión con contraseña', () => assert.ok(escribe(join(proyecto, 'a.yml'), 'url: postgres://usuario:' + 'clave123' + '@host/db')));
test('deja una URL sin contraseña', () => assert.equal(escribe(join(proyecto, 'a.yml'), 'url: postgres://host/db'), null));
test('respeta escrituraExtra', () => {
  const c = { ...ctx, config: { ...ctx.config, escrituraExtra: ['../compartido'] } };
  assert.equal(evaluar({ tool_name: 'Write', tool_input: { file_path: join(proyecto, '..', 'compartido', 'a.txt'), content: 'x' } }, c), null);
});
test('ignora otras herramientas', () => assert.equal(evaluar({ tool_name: 'Bash', tool_input: { command: 'ls' } }, ctx), null));
