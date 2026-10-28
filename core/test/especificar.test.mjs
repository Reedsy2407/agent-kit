// Paso «especificar» (etapa 2h): estructura de la skill y la plantilla, instalación en A y B, e integración con el resto del proceso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planificar, aplicar, cargarManifiesto, archivosDelManifiesto, cubiertaPorGitignore } from '../../install/install.mjs';
import { marcadoresUsados, MARCADORES } from '../../install/marcadores.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');
const SKILL = leer('core', 'skills', 'especificar-funcionalidad', 'SKILL.md');
const PLANTILLA = leer('core', 'plantillas', 'ESPECIFICACION.md');

test('la skill tiene frontmatter válido, nombre igual a su carpeta y es breve', () => {
  const fm = SKILL.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(fm, 'sin frontmatter');
  assert.match(fm[1], /^name: especificar-funcionalidad$/m);
  assert.match(fm[1], /^description: .{40,}/m);
  assert.ok(SKILL.split('\n').length <= 80, 'la skill debe ser breve');
});

test('la skill pide ids CA-n, Dado/Cuando/Entonces, máximo 3 preguntas con parada y el contraste con el plan', () => {
  for (const p of [/CA-1/, /Dado/, /Cuando/, /Entonces/, /máximo 3/, /te detienes/, /Contrastar especificación y plan/, /Toda rebanada del plan cita/, /docs\/specs\//, /DECISION-VIABILIDAD\.md/, /ningún hook la exige/])
    assert.match(SKILL, p, `falta ${p}`);
});

test('la plantilla trae todas las secciones pedidas, en orden, y solo marcadores conocidos', () => {
  const orden = ['Resumen y por qué', 'Usuarios y casos de uso', 'Requisitos', 'Criterios de aceptación', 'Fuera de alcance', 'Dependencias externas', 'Datos y estados relevantes', 'Preguntas abiertas', 'Contraste con el plan'];
  let desde = 0;
  for (const s of orden) {
    const i = PLANTILLA.indexOf(`## ${s}`, desde);
    assert.ok(i >= 0, `falta o está desordenada la sección «${s}»`);
    desde = i;
  }
  assert.match(PLANTILLA, /\*\*CA-1\*\*/);
  assert.deepEqual(marcadoresUsados(PLANTILLA).filter((m) => !MARCADORES.includes(m)), []);
});

test('prompt-de-modulo y PROMPT-MODULO leen la especificación y citan los CA-n', () => {
  const prompt = leer('core', 'PROMPT-MODULO.md');
  const skill = leer('core', 'skills', 'prompt-de-modulo', 'SKILL.md');
  for (const t of [prompt, skill]) assert.match(t, /docs\/specs\/<nombre>\.md/);
  assert.match(prompt, /LEE PRIMERO\n<el HANDOFF\.md, la especificación/);
  assert.match(prompt, /CRITERIOS DE CALIDAD\n<los criterios de aceptación de la especificación, citados por id \(CA-n\)/);
  assert.match(prompt, /INFORME DE CIERRE\n<[^\n]*CA-n[^\n]*evidencia/);
  assert.match(skill, /CA-n/);
});

test('cierre-de-modulo pide qué CA quedaron cubiertos y con qué evidencia', () => {
  assert.match(leer('core', 'skills', 'cierre-de-modulo', 'SKILL.md'), /cuáles `CA-n` quedaron cubiertos y con qué evidencia/);
});

test('el proceso, CLAUDE.md y la guía del tipo B colocan «especificar» antes del prompt del módulo', () => {
  assert.match(leer('core', 'PROCESO-MODULOS-Y-REVISION.md'), /Antes del módulo: especificar[\s\S]*ningún hook lo exige/);
  const claude = leer('core', 'CLAUDE.md');
  assert.ok(claude.indexOf('especificar-funcionalidad') < claude.indexOf('kit/PROMPT-MODULO.md'));
  const guia = leer('types', 'B', 'GUIA-DECISION.md');
  const pos = (t) => guia.indexOf(t);
  assert.ok(pos('(`evaluar-viabilidad`)') < pos('(`elegir-stack-proporcional`)') && pos('(`elegir-stack-proporcional`)') < pos('(`especificar-funcionalidad`)') && pos('(`especificar-funcionalidad`)') < pos('**Construcción por rebanadas verticales**'));
  assert.match(guia, /DECISION-VIABILIDAD\.md/);
});

for (const tipo of ['A', 'B']) {
  test(`el manifiesto del tipo ${tipo} instala la skill y la plantilla; la plantilla no se versiona`, () => {
    const m = cargarManifiesto(tipo);
    const a = archivosDelManifiesto(m).find((x) => x.destino === 'kit/plantillas/ESPECIFICACION.md');
    assert.ok(a, 'falta la plantilla en el manifiesto');
    assert.equal(a.origen, join(raiz, 'core', 'plantillas', 'ESPECIFICACION.md'));
    assert.equal(cubiertaPorGitignore(a.destino, m.gitignore), !a.versionado);
    assert.ok(m.archivos.some((x) => x.origen === 'core/skills'), 'las skills del núcleo se instalan completas');
  });

  test(`instalar el tipo ${tipo} deja la skill y la plantilla de especificación`, () => {
    const base = mkdtempSync(join(tmpdir(), `kit-espec-${tipo}-`));
    try {
      const destino = join(base, 'proyecto');
      mkdirSync(destino);
      const plan = planificar({ destino, tipo, proyecto: 'demo', respaldo: join(base, 'respaldo'), ahora: new Date('2026-10-28T10:00:00Z') });
      aplicar(plan);
      assert.ok(existsSync(join(destino, '.claude', 'skills', 'especificar-funcionalidad', 'SKILL.md')));
      const p = readFileSync(join(destino, 'kit', 'plantillas', 'ESPECIFICACION.md'), 'utf8');
      assert.match(p, /Proyecto: demo\. Fecha: 2026-10-28\./);
      assert.doesNotMatch(p, /\{\{/);
    } finally { rmSync(base, { recursive: true, force: true }); }
  });
}
