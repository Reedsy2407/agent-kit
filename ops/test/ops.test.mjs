// ops/ (ADR 0015): la skill «operar», las plantillas, los permisos de la ficha y la instalación en los tipos A y B.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planificar, aplicar } from '../../install/install.mjs';
import { marcadoresUsados } from '../../install/marcadores.mjs';
import { MARCADORES } from '../../install/marcadores.mjs';
import { generarSettings, generarKitConfig, validarFicha, FichaInvalida, permiteComando } from '../../infra/generate-settings.mjs';
import { lineasConHuella } from '../../core/test/lib/pureza.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');
const fichaDe = (tipo, ops) => { const f = JSON.parse(leer('types', tipo, 'ficha-infra.json')); f.proyecto = 'demo'; if (ops) f.ops = { ...f.ops, ...ops }; return f; };
const PLANTILLAS = ['RUNBOOK.md', 'PLAN-REVERSA.md', 'ROTACION-SECRETOS.md', 'INCIDENTE.md', 'SALUD-MINIMA.md'];

test('la skill operar tiene frontmatter válido y fija las reglas de operación', () => {
  const t = leer('ops', 'skills', 'operar', 'SKILL.md');
  const fm = t.match(/^---\n([\s\S]*?)\n---\n/)[1];
  assert.match(fm, /^name:\s*operar$/m);
  assert.match(fm, /^description:\s*\S/m);
  assert.doesNotMatch(fm, /allowed-tools/);
  assert.ok(t.split('\n').length < 500);
  assert.match(t, /Ninguna acción de operación se ejecuta sin que la ficha la permita/);
  assert.match(t, /Nada irreversible sin autorización explícita/);
  assert.match(t, /Los secretos no se escriben/);
  for (const d of PLANTILLAS) assert.match(t, new RegExp(d.replace('.', '\\.')), `la skill nombra ${d}`);
});

test('cada plantilla de ops existe, usa solo marcadores conocidos y no lleva secretos, proveedores ni nombres vetados', () => {
  for (const d of PLANTILLAS) {
    const t = leer('ops', 'plantillas', d);
    assert.ok(t.length > 400, d);
    assert.deepEqual(marcadoresUsados(t).filter((m) => !MARCADORES.includes(m)), [], d);
    assert.doesNotMatch(t, /\b(render|neon|supabase|vercel|netlify|cloudflare|github|wrangler)\b/i, `${d} nombra un proveedor`);
    assert.deepEqual(lineasConHuella(t), [], d);
  }
  const rev = leer('ops', 'plantillas', 'PLAN-REVERSA.md');
  assert.match(rev, /volver a desplegar el commit anterior/i);
  assert.match(rev, /sin perder datos/);
  const rot = leer('ops', 'plantillas', 'ROTACION-SECRETOS.md');
  assert.match(rot, /nunca contiene un valor secreto/);
  assert.ok(rot.indexOf('Crear el nuevo') < rot.indexOf('Revocar el viejo'), 'primero crear, luego revocar');
  assert.match(leer('ops', 'plantillas', 'INCIDENTE.md'), /Detección[\s\S]*Mitigación[\s\S]*Causa[\s\S]*Aprendizaje/);
});

test('sin declararlo en la ficha no se autoriza ningún script ni acción de operación', () => {
  for (const tipo of ['A', 'B']) {
    const s = generarSettings(fichaDe(tipo));
    assert.ok(!s.permissions.allow.some((r) => /salud|sondeo/.test(r)), tipo);
    assert.equal(s.permissions.ask, undefined);
    assert.deepEqual(generarKitConfig(fichaDe(tipo)).ops, { salud: false, sondeoAcceso: false });
  }
});

test('ops.salud.permitida autoriza solo ese script (con y sin timeout); sondeoAcceso, el suyo', () => {
  const s = generarSettings(fichaDe('B', { salud: { permitida: true, config: 'ops/salud.config.json' }, sondeoAcceso: { permitida: true, config: 'ops/dependencias.json' } }));
  const { allow, deny } = s.permissions;
  assert.ok(permiteComando(allow, deny, 'node scripts/salud.mjs https://sitio.example'));
  assert.ok(permiteComando(allow, deny, 'timeout 60 node scripts/salud.mjs https://sitio.example --json'));
  assert.ok(permiteComando(allow, deny, 'timeout 60 node scripts/sondeo-acceso.mjs ops/dependencias.json'));
  assert.ok(!permiteComando(allow, deny, 'node scripts/otro.mjs'));
  assert.deepEqual(generarKitConfig(fichaDe('B', { salud: { permitida: true } })).ops, { salud: true, sondeoAcceso: false });
});

test('estado, arranque y parada se autorizan si la ficha los permite; reversa y rotación siempre preguntan (ask), nunca se autorizan solas', () => {
  const acciones = {
    estado: { permitida: true, comandos: ['Bash(proveedor status)'] }, arranque: { permitida: true, comandos: ['Bash(proveedor start)'] },
    parada: { permitida: false, comandos: ['Bash(proveedor stop)'] },
    reversa: { permitida: true, comandos: ['Bash(proveedor rollback)'] }, rotacion: { permitida: true, comandos: ['Bash(proveedor rotate)'] },
  };
  const { permissions } = generarSettings(fichaDe('B', { acciones }));
  assert.ok(permissions.allow.includes('Bash(proveedor status)') && permissions.allow.includes('Bash(proveedor start)'));
  assert.ok(!permissions.allow.includes('Bash(proveedor stop)'), 'no permitida: no entra');
  assert.ok(!permissions.allow.includes('Bash(proveedor rollback)') && !permissions.allow.includes('Bash(proveedor rotate)'), 'lo irreversible no se autoriza');
  assert.deepEqual(permissions.ask, ['Bash(proveedor rollback)', 'Bash(proveedor rotate)']);
});

test('una ficha de ops inválida se rechaza: acción desconocida, permitida no booleana, ruta fuera del proyecto, comando que una denegación tapa', () => {
  const mala = (ops) => () => validarFicha(fichaDe('B', ops));
  assert.throws(mala({ acciones: { borrar: { permitida: true, comandos: [] } } }), (e) => e instanceof FichaInvalida && /ops\.acciones\.borrar/.test(e.message));
  assert.throws(mala({ acciones: { estado: { permitida: 'sí', comandos: [] } } }), /ops\.acciones\.estado/);
  assert.throws(mala({ salud: { permitida: 'sí' } }), /ops\.salud\.permitida/);
  assert.throws(mala({ salud: { permitida: true, config: '../fuera.json' } }), /ops\.salud\.config/);
  assert.throws(mala({ salud: { permitida: true, config: 'C:\\x.json' } }), /ops\.salud\.config/);
  assert.throws(mala({ acciones: { reversa: { permitida: true, comandos: ['Bash(git push --force)'] } } }), /queda tapada/);
});

for (const tipo of ['A', 'B']) {
  test(`el instalador del tipo ${tipo} instala ops/: skill, plantillas con marcadores resueltos, script de salud y configuración`, (t) => {
    const destino = mkdtempSync(join(tmpdir(), 'kit-ops-'));
    const respaldo = mkdtempSync(join(tmpdir(), 'kit-ops-resp-'));
    t.after(() => { rmSync(destino, { recursive: true, force: true }); rmSync(respaldo, { recursive: true, force: true }); });
    const plan = planificar({ destino, tipo, proyecto: 'demo', respaldo });
    aplicar(plan);
    assert.ok(existsSync(join(destino, '.claude', 'skills', 'operar', 'SKILL.md')));
    for (const d of PLANTILLAS) {
      const t2 = readFileSync(join(destino, 'ops', d), 'utf8');
      assert.doesNotMatch(t2, /\{\{/, `${d} con marcadores sin resolver`);
      assert.match(t2, /demo/);
    }
    assert.ok(existsSync(join(destino, 'scripts', 'salud.mjs')));
    JSON.parse(readFileSync(join(destino, 'ops', 'salud.config.json'), 'utf8'));
    assert.equal(existsSync(join(destino, 'scripts', 'sondeo-acceso.mjs')), tipo === 'B', 'el sondeo de acceso es del tipo B');
    assert.equal(existsSync(join(destino, 'ops', 'dependencias.json')), tipo === 'B');
    const ficha = JSON.parse(readFileSync(join(destino, 'kit', 'FICHA-INFRA.json'), 'utf8'));
    assert.equal(ficha.ops.salud.permitida, false, 'nada permitido por defecto');
    const ignore = readFileSync(join(destino, '.gitignore'), 'utf8');
    assert.equal(/^\/ops\/$/m.test(ignore), tipo === 'A', 'en el tipo A ops/ es local; en el B se versiona');
    assert.equal(readdirSync(join(destino, 'ops')).filter((n) => PLANTILLAS.includes(n)).length, PLANTILLAS.length);
  });
}
