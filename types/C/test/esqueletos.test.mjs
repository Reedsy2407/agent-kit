// Esqueletos del tipo C (ADR 0019): estructura, YAML de CI y release, cero dependencias de producción, ausencia de secretos y de
// artefactos, y la instalación solo cuando la ficha declara el preset. Sin red ni herramientas del stack: lo que compila y se
// ejecuta se comprueba a mano con types/C/esqueletos/verificar.mjs (registro en types/C/esqueletos/VERIFICACION.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { planificar, aplicar, esqueletoDe, cargarManifiesto } from '../../../install/install.mjs';
import { PRESETS_C, IDS_PRESETS_C } from '../../../infra/presets.mjs';
import { leerYaml } from '../../B/test/lib/yaml-minimo.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ESQ = join(raiz, 'types', 'C', 'esqueletos');
const presentes = IDS_PRESETS_C.filter((s) => existsSync(join(ESQ, s, 'esqueleto.json')));
const PROPIOS = {
  go: ['go.mod', 'cmd/herramienta/main.go', 'internal/cli/cli.go', 'internal/cli/cli_test.go', 'internal/config/config.go', 'internal/config/config_test.go', 'internal/entrada/entrada.go', 'internal/demonio/demonio.go', 'internal/demonio/demonio_test.go', 'internal/registro/registro.go', 'internal/formato/formato_test.go'],
  python: ['pyproject.toml', 'herramienta/__init__.py', 'herramienta/__main__.py', 'herramienta/cli.py', 'herramienta/config.py', 'herramienta/entrada.py', 'herramienta/demonio.py', 'herramienta/registro.py', 'tests/test_cli.py', 'tests/test_config.py', 'tests/test_demonio.py', 'tests/test_entrada.py'],
  rust: ['Cargo.toml', 'Cargo.lock', 'src/main.rs', 'src/lib.rs', 'src/cli.rs', 'src/config.rs', 'src/entrada.rs', 'src/demonio.rs', 'src/registro.rs', 'src/senal.rs', 'src/json.rs', 'tests/cli.rs'],
};
const COMUNES = ['.github/workflows/ci.yml', '.github/workflows/release.yml', 'README.md', 'esqueleto.json'];
const recorrer = (dir, base = dir) => readdirSync(dir).flatMap((n) => { const r = join(dir, n); return statSync(r).isDirectory() ? recorrer(r, base) : [r.slice(base.length + 1).replace(/\\/g, '/')]; });
const leer = (stack, rel) => readFileSync(join(ESQ, stack, rel), 'utf8');
const tmp = () => { const base = mkdtempSync(join(tmpdir(), 'kit-esq-c-')); for (const d of ['destino', 'respaldo']) mkdirSync(join(base, d)); return { base, destino: join(base, 'destino'), respaldo: join(base, 'respaldo'), limpiar: () => rmSync(base, { recursive: true, force: true }) }; };
const conPreset = (e, preset) => { const f = JSON.parse(readFileSync(join(raiz, 'types', 'C', 'ficha-infra.json'), 'utf8')); f.kit.preset = preset; const ruta = join(e.base, 'ficha.json'); writeFileSync(ruta, JSON.stringify(f)); return ruta; };
const planC = (e, preset) => planificar({ destino: e.destino, tipo: 'C', proyecto: 'demo', respaldo: e.respaldo, fichaRuta: conPreset(e, preset) });

test('el contrato común define subcomandos, códigos de salida, configuración, entrada, registro y apagado ordenado', () => {
  const t = readFileSync(join(ESQ, 'CONTRATO.md'), 'utf8');
  for (const x of [/herramienta version/, /check-config/, /run --config RUTA \[--once\]/, /\| 0 \|/, /\| 4 \|/, /Configuración/, /max_entrada_bytes/, /timeout_entrada_ms/, /\*\*Permisos\*\*/, /Entrada no confiable/, /Registro/, /Nunca\*\* se registra el valor del token/, /Apagado ordenado/, /drenar/, /Pruebas que debe tener/]) assert.match(t, x, String(x));
});

test('hay un esqueleto por cada preset del tipo C declarado como disponible y apunta al preset correcto', () => {
  assert.ok(presentes.length >= 1);
  for (const s of presentes) {
    const meta = JSON.parse(leer(s, 'esqueleto.json'));
    assert.equal(meta.stack, s);
    assert.equal(meta.preset, s);
    assert.equal(PRESETS_C[s].esqueleto, s);
    assert.ok(Array.isArray(meta.verificacion.ejecutar) && meta.verificacion.ejecutar.length, `${s}: cómo se ejecuta`);
    assert.ok(Array.isArray(meta.gitignore) && meta.gitignore.length);
  }
});

for (const s of presentes) {
  test(`esqueleto ${s}: tiene los archivos esperados, README con «qué no construir todavía» y sin artefactos`, () => {
    const hay = recorrer(join(ESQ, s));
    for (const f of [...COMUNES, ...PROPIOS[s]]) assert.ok(hay.includes(f), `${s} no tiene ${f}`);
    /* Solo cuenta lo que git versionaría (rastreado o nuevo y no ignorado): las cachés locales ignoradas no son del esqueleto. */
    const versionables = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', `types/C/esqueletos/${s}`], { cwd: raiz, encoding: 'utf8', timeout: 20000 }).split('\0').filter(Boolean);
    assert.ok(versionables.length >= PROPIOS[s].length, 'git ve los archivos del esqueleto');
    assert.deepEqual(versionables.filter((r) => /(^|\/)(target|bin|dist|node_modules|__pycache__|\.venv|\.ruff_cache)\//.test(r) || /\.(exe|pyc|test)$/.test(r)), [], 'sin artefactos de compilación');
    const readme = leer(s, 'README.md');
    assert.match(readme, /kit\/CONTRATO-ESQUELETOS\.md/);
    assert.match(readme, /## Qué no construir todavía/);
    assert.match(readme, /Actualizador propio/);
    assert.match(readme, /\*\*Queda manual:\*\*/);
    assert.match(readme, /## Límites conocidos/);
    for (const f of hay.filter((x) => /\.(md|yml|json|toml)$/.test(x))) {
      leer(s, f).split('\n').forEach((l, i) => assert.doesNotMatch(l, /github\.com|\bGitHub\b|[Rr]epositorio/, `${s}/${f}:${i + 1}: las plantillas públicas no mencionan el repositorio ni su alojamiento`));
    }
  });

  test(`esqueleto ${s}: CI con matriz ubuntu, windows y macos, de solo lectura y con acciones y herramientas fijadas`, () => {
    const texto = leer(s, '.github/workflows/ci.yml');
    const ci = leerYaml(texto);
    assert.deepEqual(ci.permissions, { contents: 'read' });
    const trabajos = Object.values(ci.jobs);
    assert.ok(trabajos.some((j) => ['ubuntu-latest', 'windows-latest', 'macos-latest'].every((o) => j.strategy.matrix.os.includes(o))), 'matriz de tres sistemas');
    for (const u of texto.matchAll(/uses:\s*(\S+)/g)) assert.match(u[1], /^[\w.-]+\/[\w.-]+@v\d+$/, `acción sin versión mayor fijada: ${u[1]}`);
    assert.doesNotMatch(texto, /\bsecrets\./);
    assert.doesNotMatch(texto, /(curl|wget)[^\n]*\|\s*(ba)?sh/);
    assert.match(texto, /actions\/checkout@v7/);
    assert.doesNotMatch(texto, /(deploy|publish|push)\b.*(registry|release)/i, 'la integración continua no publica');
  });

  test(`esqueleto ${s}: el flujo de publicación empaqueta por plataforma, genera SHA-256 y no usa secretos ni firmas`, () => {
    const texto = leer(s, '.github/workflows/release.yml');
    const r = leerYaml(texto);
    assert.deepEqual(r.permissions, { contents: 'read' }, 'sin permisos de escritura');
    assert.ok(r.on.push.tags, 'se dispara por etiqueta');
    assert.match(texto, /sha256sum|shasum -a 256/);
    assert.match(texto, /SHA256SUMS/);
    assert.match(texto, /upload-artifact@v7/);
    assert.doesNotMatch(texto, /\bsecrets\.|GITHUB_TOKEN|gpg|cosign|sign-blob|id-token/i, 'sin secretos ni firmas inventadas');
    assert.ok(Object.keys(r.jobs).length >= 2);
  });

  test(`esqueleto ${s}: se instala solo si la ficha declara kit.preset=${s}, con su .gitignore y el contrato`, () => {
    const e = tmp();
    try {
      const sin = planC(e, '');
      assert.equal(sin.esqueleto, undefined, 'sin preset no se copia ningún esqueleto');
      assert.ok(!sin.acciones.some((a) => PROPIOS[s].includes(a.destino)));
      const p = planC(e, s);
      assert.equal(p.esqueleto, s);
      const destinos = p.acciones.map((a) => a.destino);
      for (const f of [...COMUNES.filter((c) => c !== 'esqueleto.json'), ...PROPIOS[s]]) assert.ok(destinos.includes(f), f);
      assert.ok(!destinos.includes('esqueleto.json'), 'los metadatos no se instalan');
      assert.ok(destinos.includes('kit/CONTRATO-ESQUELETOS.md'));
      for (const otro of presentes.filter((x) => x !== s)) assert.ok(!destinos.some((d) => PROPIOS[otro].filter((f) => !PROPIOS[s].includes(f) && f !== 'README.md').includes(d)), `no debe colarse ${otro}`);
      assert.ok(p.gitignore.añadir.some((l) => JSON.parse(leer(s, 'esqueleto.json')).gitignore.includes(l)));
      assert.ok(p.advertencias.some((w) => w.includes(`esqueleto del stack «${s}»`) && w.includes('types/C/esqueletos/VERIFICACION.md')));
      const r = aplicar(p);
      assert.ok(r.escritos.includes('README.md'));
      assert.ok(existsSync(join(e.destino, '.claude', 'kit.json')));
      assert.deepEqual(JSON.parse(readFileSync(join(e.destino, '.claude', 'kit.json'), 'utf8')).checks[0].commands, PRESETS_C[s].comandos);
    } finally { e.limpiar(); }
  });

  test(`esqueleto ${s}: sin dependencias de producción, sin secretos y sin «unsafe» fuera de lo declarado`, () => {
    const hay = recorrer(join(ESQ, s));
    if (s === 'go') assert.doesNotMatch(leer(s, 'go.mod'), /\brequire\b/, 'go.mod sin dependencias');
    if (s === 'python') {
      const p = leer(s, 'pyproject.toml');
      assert.match(p, /^dependencies\s*=\s*\[\s*\]/m, 'cero dependencias de producción');
      assert.match(p, /requires-python\s*=\s*">=3\.\d+"/);
      assert.match(p, /\[project\.scripts\][\s\S]*herramienta\s*=/);
    }
    if (s === 'rust') {
      const c = leer(s, 'Cargo.toml');
      assert.doesNotMatch(c, /\[(dev-|build-)?dependencies/, 'Cargo.toml sin dependencias');
      assert.doesNotMatch(leer(s, 'Cargo.lock'), /\[\[package\]\]\s*\nname = "(?!herramienta")/, 'Cargo.lock solo con el propio paquete');
      for (const f of hay.filter((x) => x.endsWith('.rs') && x !== 'src/senal.rs')) assert.doesNotMatch(leer(s, f), /\bunsafe\b/, `${f}: unsafe solo en senal.rs`);
    }
    for (const f of hay.filter((x) => /\.(go|py|rs|toml|md|json|yml|mod)$/.test(x) && !x.endsWith('Cargo.lock'))) {
      const t = leer(s, f);
      assert.doesNotMatch(t, /AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}/, `${f}: parece un secreto`);
    }
  });
}

test('un preset del tipo C solo figura como verificado si VERIFICACION.md lo registra con su fecha', () => {
  const reg = readFileSync(join(ESQ, 'VERIFICACION.md'), 'utf8');
  for (const [id, p] of Object.entries(PRESETS_C)) {
    if (!p.verificado) continue;
    assert.match(p.verificadoEl, /^\d{4}-\d{2}-\d{2}$/, id);
    assert.ok(existsSync(join(ESQ, p.esqueleto, 'esqueleto.json')), `${id}: el esqueleto existe`);
    assert.ok(reg.includes(`Verificado el ${p.verificadoEl}`), `${id}: sin registro con esa fecha`);
  }
});

test('el manifiesto C declara la carpeta de esqueletos y el contrato, y nunca lista los metadatos ni lo privado', () => {
  const m = cargarManifiesto('C');
  assert.equal(m.esqueletos, 'types/C/esqueletos');
  assert.ok(m.archivos.some((a) => a.origen === 'types/C/esqueletos/CONTRATO.md' && a.destino === 'kit/CONTRATO-ESQUELETOS.md'));
  assert.ok(!m.archivos.some((a) => a.privado || /casos-privados/.test(a.origen)), 'el tipo C no instala material privado');
  for (const s of presentes) assert.ok(esqueletoDe(m, s)?.archivos.length > 5, s);
  assert.equal(esqueletoDe(m, 'node'), null, 'un preset del tipo B no instala esqueleto del C');
});
