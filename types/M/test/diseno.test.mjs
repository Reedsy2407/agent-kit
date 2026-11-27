// Diseño móvil del tipo M (ADR 0022): instalación de las dos skills y las dos plantillas, contenido obligatorio, regla de
// conducción, paso en la guía, pureza (sin código ni valores de diseño) y las frases sobre imágenes de las skills. No usa la red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { planificar, aplicar, main } from '../../../install/install.mjs';
import { MARCADORES, marcadoresUsados } from '../../../install/marcadores.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const leer = (...p) => readFileSync(join(raiz, ...p), 'utf8');
const estudio = leer('types', 'M', 'skills', 'estudiar-referencia-movil', 'SKILL.md');
const direcciones = leer('types', 'M', 'skills', 'explorar-direcciones-movil', 'SKILL.md');
const brief = leer('types', 'M', 'plantillas', 'BRIEF-DISENO-MOVIL.md');
const revision = leer('types', 'M', 'plantillas', 'REVISION-VISUAL-MOVIL.md');
const guia = leer('types', 'M', 'GUIA-DECISION.md');
const hechos = leer('types', 'M', 'PLATAFORMA-ANDROID.md');
const NUEVOS = [['estudio', estudio], ['direcciones', direcciones], ['brief', brief], ['revisión', revision]];
const frontmatter = (t) => t.split('---')[1];
const apartado = (t, titulo) => t.split(new RegExp(`^## ${titulo}`, 'm'))[1]?.split(/^## /m)[0] ?? '';

const DESTINOS = ['.claude/skills/estudiar-referencia-movil/SKILL.md', '.claude/skills/explorar-direcciones-movil/SKILL.md', 'kit/plantillas/BRIEF-DISENO-MOVIL.md', 'kit/plantillas/REVISION-VISUAL-MOVIL.md'];
const AHORA = new Date('2026-11-26T10:00:00Z');
function destino() {
  const base = mkdtempSync(join(tmpdir(), 'kit-m-diseno-'));
  mkdirSync(join(base, 'destino')); mkdirSync(join(base, 'respaldo'));
  return { base, destino: join(base, 'destino'), respaldo: join(base, 'respaldo'), limpiar: () => rmSync(base, { recursive: true, force: true }) };
}
const planM = (e, extra = {}) => planificar({ destino: e.destino, tipo: 'M', proyecto: 'demo', respaldo: e.respaldo, ahora: AHORA, ...extra });
const salida = () => { const s = { out: '', err: '' }; s.io = { stdout: { write: (t) => { s.out += t; } }, stderr: { write: (t) => { s.err += t; } }, interactivo: false, ahora: AHORA }; return s; };
const listar = (d) => readdirSync(d).flatMap((n) => { const r = join(d, n); return statSync(r).isDirectory() ? listar(r) : [r]; });

test('--tipo M instala las dos skills y las dos plantillas, con los marcadores resueltos y sin crear design/', () => {
  const e = destino();
  try {
    const plan = planM(e);
    assert.deepEqual(plan.advertencias.filter((w) => /marcadores sin valor/.test(w)), []);
    aplicar(plan);
    for (const d of DESTINOS) assert.ok(existsSync(join(e.destino, d)), d);
    assert.match(readFileSync(join(e.destino, 'kit', 'plantillas', 'BRIEF-DISENO-MOVIL.md'), 'utf8'), /# Brief de diseño móvil — demo[\s\S]*Perfil de expresión:\*\* sobrio/);
    assert.ok(!existsSync(join(e.destino, 'design')), 'el brief se copia a design/ al elegir una dirección, no al instalar');
    for (const web of ['estudiar-referencia', 'explorar-direcciones', 'revision-visual', 'pulir-front', 'elegir-tipografia-paleta']) assert.ok(!existsSync(join(e.destino, '.claude', 'skills', web)), `skill web ${web}`);
  } finally { e.limpiar(); }
});

test('--dry-run los anuncia sin escribir nada', async () => {
  const e = destino();
  try {
    const s = salida();
    assert.equal(await main(['--destino', e.destino, '--tipo', 'M', '--respaldo', e.respaldo, '--dry-run'], s.io), 0);
    for (const d of DESTINOS) assert.ok(s.out.includes(d), d);
    assert.deepEqual(readdirSync(e.destino), []);
  } finally { e.limpiar(); }
});

test('--diff muestra el cambio de una skill editada sin escribir; reinstalar no la pisa sin --forzar', async () => {
  const e = destino();
  try {
    aplicar(planM(e));
    const ruta = join(e.destino, DESTINOS[0]);
    writeFileSync(ruta, `${readFileSync(ruta, 'utf8')}\nlínea propia del proyecto\n`);
    const s = salida();
    assert.equal(await main(['--destino', e.destino, '--tipo', 'M', '--respaldo', e.respaldo, '--diff'], s.io), 0);
    assert.ok(s.out.includes(DESTINOS[0]));
    assert.match(s.out, /línea propia del proyecto/);
    assert.match(readFileSync(ruta, 'utf8'), /línea propia del proyecto/);
    assert.equal(planM(e).acciones.find((a) => a.destino === DESTINOS[0]).accion, 'omitir');
  } finally { e.limpiar(); }
});

test('un proyecto M anterior recibe lo nuevo al reinstalar; su guía antigua solo cambia con --forzar', () => {
  const e = destino();
  try {
    aplicar(planM(e));
    for (const d of DESTINOS) rmSync(join(e.destino, d));
    writeFileSync(join(e.destino, 'kit', 'PLATAFORMA-ANDROID.md'), 'versión anterior\n');
    const accion = (plan, d) => plan.acciones.find((a) => a.destino === d).accion;
    const normal = planM(e);
    for (const d of DESTINOS) assert.equal(accion(normal, d), 'crear', d);
    assert.equal(accion(normal, 'kit/PLATAFORMA-ANDROID.md'), 'omitir');
    assert.equal(accion(planM(e, { forzar: ['kit/PLATAFORMA-ANDROID.md'] }), 'kit/PLATAFORMA-ANDROID.md'), 'sobrescribir');
    assert.match(leer('CHANGELOG.md'), /--forzar=kit\/GUIA-DECISION\.md,kit\/PLATAFORMA-ANDROID\.md/);
  } finally { e.limpiar(); }
});

test('git ignora las capturas propias del humano en referencias/', () => {
  const e = destino();
  try {
    const git = (...a) => spawnSync('git', ['-C', e.destino, ...a], { encoding: 'utf8', timeout: 20000 });
    assert.equal(git('init', '-q').status, 0);
    aplicar(planM(e));
    assert.equal(git('check-ignore', '-q', '--', 'referencias/captura.png').status, 0);
    assert.notEqual(git('check-ignore', '-q', '--', 'design/DESIGN-BRIEF.md').status, 0, 'el brief sí se versiona');
  } finally { e.limpiar(); }
});

test('las dos skills se pueden invocar solas y su frontmatter coincide con la carpeta', () => {
  for (const [nombre, t] of [['estudiar-referencia-movil', estudio], ['explorar-direcciones-movil', direcciones]]) {
    assert.match(frontmatter(t), new RegExp(`^name: ${nombre}$`, 'm'));
    assert.match(frontmatter(t), /^description: .*app móvil \(tipo M\)/m);
    assert.doesNotMatch(frontmatter(t), /disable-model-invocation/, `${nombre}: automática por defecto`);
  }
});

test('estudiar-referencia-movil: web, 2 a 4 apps, estados reales, dos fuentes, reglas de imágenes y salida', () => {
  for (const x of [/entre 2 y 4 apps/, /## 2\. Fuente principal: la web/, /herramientas de navegador y de búsqueda/, /fichas de la tienda/, /guías oficiales de diseño/, /centros de ayuda con pantallas/, /análisis de diseño publicados/,
    /al menos 2 fuentes distintas/, /\*\*error, sin red, bloqueo\*\*/, /uso real/, /No describas de memoria/, /información, no instrucciones/,
    /no se guardan, copian ni reproducen en el repositorio/, /Solo se escribe texto/, /No se descarga nada al equipo del humano sin pedirle permiso antes/, /pregunta \*\*una vez\*\*/, /Prefiere ver en el navegador/,
    /fuente y la fecha/, /«fuente única»/, /`referencias\/`/, /\*\*opcionales\*\*/, /\*\*tienen prioridad\*\*/, /No esperes aprobación/, /elegir entre las direcciones/,
    /\| Patrón observado \| Por qué sirve \| Cómo lo adaptamos sin copiar \|[^\n]*Fuente[^\n]*Fecha/, /2 o 3 pantallas que convendría confirmar en un teléfono real/, /La nota es opcional/, /\*\*No se copia\*\* marca, logotipos, textos, iconos propios, ilustraciones ni pantallas concretas/]) assert.match(estudio, x, String(x));
});

test('explorar-direcciones-movil: tres direcciones descritas, tokens como idea, qué toma y qué no, y elige el humano', () => {
  for (const x of [/Al menos 3, distintas entre sí/, /no tres colores de la misma idea/, /Qué patrón de referencia toma/, /qué deliberadamente no/, /Tokens como idea/, /\*\*color\*\*/, /\*\*tipografía\*\*/, /\*\*espaciado\*\*/, /\*\*radios\*\*/,
    /No escribas CSS, Compose, XML ni ningún código/, /No elijas por el humano/, /\*\*te detienes\*\*: elegir es del humano/, /el silencio tampoco/, /estudiar-referencia-movil/, /BRIEF-DISENO-MOVIL\.md/, /REVISION-VISUAL-MOVIL\.md/]) assert.match(direcciones, x, String(x));
});

test('el brief móvil pide pantallas, estados, tokens como idea, conducción, accesibilidad, lo decidido y lo abierto', () => {
  assert.deepEqual(marcadoresUsados(brief).filter((m) => !MARCADORES.includes(m)), []);
  for (const titulo of ['Pantallas clave', 'Estados', 'Tokens como idea', 'Regla de conducción', 'Accesibilidad y adaptación', 'Qué se decidió', 'Qué sigue abierto']) assert.ok(apartado(brief, titulo).length > 40, titulo);
  assert.match(apartado(brief, 'Estados'), /\| Pantalla \| Carga \| Vacío \| Error \| Sin red \| Bloqueo \|/);
  assert.match(apartado(brief, 'Regla de conducción'), /decisión del kit \[P-CON-5\][\s\S]*\[P-CON-8\]/);
  assert.match(brief, /única fuente de verdad del diseño/i);
});

test('la lista de revisión visual cubre los puntos pedidos y admite «No comprobado»', () => {
  for (const punto of ['Contraste', 'Tamaños táctiles', 'Estados', 'Orientación', 'Tamaño de letra del sistema', 'Modo oscuro', 'Lectura de un vistazo', 'Sin red']) assert.match(revision, new RegExp(`^\\| ${punto} \\|`, 'm'), punto);
  assert.match(revision, /\*\*No comprobado\*\*/);
  assert.deepEqual(marcadoresUsados(revision).filter((m) => !MARCADORES.includes(m)), []);
});

test('la regla de conducción: decisión del kit en [P-CON-5], límites de acciones en [P-CON-7] y lo no confirmado marcado', () => {
  const fila = (id) => hechos.split('\n').find((l) => l.startsWith(`- **[${id}]**`));
  assert.match(fila('P-CON-5'), /decisión del kit/);
  assert.match(fila('P-CON-5'), /\[P-CON-1\] a \[P-CON-4\][\s\S]*\[P-CON-7\][\s\S]*\[P-CON-8\]/);
  assert.match(fila('P-CON-5'), /no la decisión\. Verificado el 2026-11-26: https:/);
  assert.match(fila('P-CON-7'), /3 pasos o menos[\s\S]*máximo es 5 pasos[\s\S]*hasta 2 botones/);
  assert.match(fila('P-CON-7'), /Ninguna de las páginas leídas fija un número de acciones para una pantalla completa/);
  assert.match(fila('P-CON-8'), /No verificado/);
  assert.match(guia, /decisión de diseño del kit \[P-CON-5\], no una obligación comprobada \[P-CON-8\]/);
  for (const x of [/sin animaciones/, /una acción principal por pantalla/, /escribir o leer párrafos en marcha/, /lo no esencial se hace detenido/]) {
    assert.match(fila('P-CON-5'), x, String(x));
    for (const [nombre, t] of [...NUEVOS, ['guía', guia]]) assert.doesNotMatch(t, x, `${nombre} repite la regla en vez de citarla`);
  }
  assert.match(fila('P-CON-4'), /ajena a la conducción/);
  assert.match(apartado(brief, 'Regla de conducción'), /entera y tal como está escrita en \[P-CON-5\]/);
  assert.match(revision, /^\| En marcha \| La regla de conducción del kit, entera y punto por punto \[P-CON-5\] \|/m);
});

test('la guía pone el diseño tras viabilidad y stack y antes del esqueleto, con el principio de imitar sin copiar', () => {
  const recorrido = apartado(guia, 'El recorrido');
  const orden = ['**Viabilidad**', '**Stack proporcional**', '**Diseño de la interfaz**', '**Especificación**', '**Construcción por rebanadas'].map((x) => recorrido.indexOf(x));
  assert.ok(orden.every((n, i) => n >= 0 && (i === 0 || n > orden[i - 1])), `orden: ${orden}`);
  assert.deepEqual([...recorrido.matchAll(/^(\d)\. /gm)].map((m) => Number(m[1])), [1, 2, 3, 4, 5, 6, 7]);
  assert.match(recorrido, /antes del esqueleto/);
  const diseno = apartado(guia, 'Diseño de la interfaz');
  for (const x of [/imitar su \*\*estilo\*\*/, /\*\*no copiar\*\* marca, logotipos, textos, iconos propios, ilustraciones ni pantallas concretas/, /elige el humano/, /No se guardan imágenes/]) assert.match(diseno, x, String(x));
});

test('el principio general está donde el kit ya habla de diseño, y el ADR 0022 explica fuente e imágenes', () => {
  assert.match(leer('design', 'DESIGN-BRIEF.md'), /### Referencias sin copiar\n\*\*Principio \(cualquier tipo de proyecto y sector\):\*\*[^\n]*sin copiar marca, logotipos, textos/);
  const adr = leer('docs', 'adr', '0022-diseno-movil-del-tipo-m.md');
  for (const x of [/^# 0022\./, /Estado: aceptada/, /## Contexto/, /## Decisión/, /\*\*La web es la fuente principal\.\*\*/, /\*\*Las imágenes no se guardan\.\*\*/, /## Alternativas descartadas/, /## Consecuencias/]) assert.match(adr, x, String(x));
});

/* Hex de color, medidas de CSS o Compose y bloques de código: los tokens van como idea. */
const VALOR_DE_DISENO = /#[0-9a-f]{3,8}\b|\b\d+(?:[.,]\d+)?[\s.]?(?:px|dp|sp|rem|em|pt)\b|```|@Composable|\bmodifier\b|:root\b/i;
test('pureza del diseño móvil: sin colores, medidas, código, direcciones ni material web', () => {
  for (const malo of ['fondo #fff', '16 px', '8.dp', '14sp', '@Composable', '```css']) assert.match(malo, VALOR_DE_DISENO, malo);
  for (const bueno of ['[P-ACC-1]', 'tres direcciones', '## 1. Prepara', 'costo S/M/L']) assert.doesNotMatch(bueno, VALOR_DE_DISENO, bueno);
  for (const [nombre, t] of NUEVOS) t.split('\n').forEach((l, i) => {
    assert.doesNotMatch(l, VALOR_DE_DISENO, `${nombre}:${i + 1}`);
    assert.doesNotMatch(l, /https?:\/\/|github|tests\/front|design\/refs|playwright/i, `${nombre}:${i + 1}`);
  });
});

/* Ninguna skill puede ordenar guardar imágenes en el repositorio. Adivinarlo con expresiones deja huecos, así que se fija la
   lista de todas las frases que nombran una imagen en las skills instaladas: ninguna de estas lo ordena. Una frase nueva o
   cambiada hace fallar la prueba; se revisa que no mande guardar, copiar ni subir imágenes y entonces se actualiza la lista.
   Límite: no ve una orden que hable de imágenes sin nombrarlas («guárdalas», «las pantallas»). */
const IMAGEN = /(?<!\p{L})(?:imagen|im[aá]genes|c[aá]ptur\p{L}*|pantallazos?|recortes?|screenshots?|fotos?|fotograf\p{L}*|png|jpe?g)(?!\p{L})/iu;
const frasesDeImagen = (texto) => texto.replace(/\r\n/g, '\n').split('\n').flatMap((l) => l.split(/(?<=[.;!?])\s+/)).map((f) => f.replace(/\*/g, '').trim()).filter((f) => IMAGEN.test(f));
const REVISADAS = [
  'cierre-de-modulo | - criterios de aceptación de la especificación: cuáles `CA-n` quedaron cubiertos y con qué evidencia (prueba, captura, salida), y cuáles no y por qué;',
  'cierre-de-modulo | - evidencias para la revisión del humano (rutas de capturas, informes).',
  'especificar-funcionalidad | - comprobable con una prueba o una evidencia concreta (captura, salida de un comando, consulta).',
  'estudiar-referencia-movil | Lo haces tú con las herramientas de la sesión: al humano no se le pide que busque apps ni que haga capturas.',
  'estudiar-referencia-movil | - Si existe `referencias/` con capturas del humano, empieza por ellas (sección 3).',
  'estudiar-referencia-movil | Si la sesión no tiene herramientas de navegador ni de búsqueda, dilo, trabaja solo con las capturas del humano si existen y marca todo lo demás como «No verificado».',
  'estudiar-referencia-movil | Imágenes, descargas y capturas del humano',
  'estudiar-referencia-movil | - Las imágenes se miran en la sesión y no se guardan, copian ni reproducen en el repositorio: ni capturas, ni recortes, ni imágenes incrustadas, ni calcos de sus pantallas, ni sus textos transcritos.',
  'estudiar-referencia-movil | No uses la opción de guardar la captura en disco, aunque la herramienta de navegador la ofrezca.',
  'estudiar-referencia-movil | Si para ver una imagen hace falta bajarla, pregunta una vez, di cuáles y dónde quedarían, fuera del repositorio;',
  'estudiar-referencia-movil | - Las capturas propias del humano en `referencias/` del proyecto son opcionales y, si existen, tienen prioridad sobre lo hallado en la web: muestran el uso real.',
  'estudiar-referencia-movil | Una captura del humano cuenta como fuente («captura del humano», con su fecha).',
  'evaluar-viabilidad | No es evidencia: «debería haber una API», documentación sin sondeo, lo que hace otra empresa, una captura antigua, un ejemplo de un foro, «seguro nos lo dan».',
  'evaluar-viabilidad | | Privilegios y radio de daño | ¿Qué permisos pide (administrador o root, capacidades del sistema, pertenencia a grupos, acceso al socket de control de un runtime de contenedores, captura global de teclado o de pantalla, puertos reservados)?',
];

test('las skills instaladas en un proyecto M no dicen sobre imágenes nada fuera de las frases revisadas', () => {
  for (const orden of ['Guarda las capturas en docs/.', 'No olvides guardar las capturas en docs/.', 'No dejes de descargar la imagen.', 'No copies, guarda las capturas en docs/.',
    'No hace falta preguntar: descarga las imágenes fuera del repositorio.', 'Captura cada pantalla y súbela a docs/.', 'Haz un pantallazo y adjúntalo.']) assert.equal(frasesDeImagen(orden).length, 1, orden);
  assert.deepEqual(frasesDeImagen('Escribe el patrón en texto. Guarda la tabla en un archivo.'), []);
  const e = destino();
  try {
    aplicar(planM(e));
    const base = join(e.destino, '.claude', 'skills');
    const halladas = listar(base).flatMap((r) => frasesDeImagen(readFileSync(r, 'utf8')).map((f) => `${relative(base, r).split(/[\\/]/)[0]} | ${f}`));
    assert.deepEqual(halladas.filter((f) => !REVISADAS.includes(f)), [], 'frases nuevas o cambiadas sobre imágenes: revísalas');
    assert.deepEqual(REVISADAS.filter((f) => !halladas.includes(f)), [], 'frases revisadas que ya no existen: quítalas de la lista');
  } finally { e.limpiar(); }
});
