// Verificación MANUAL del esqueleto Android del tipo M (necesita JDK, SDK de Android, Gradle y red; NO forma parte de
// node --test, ADR 0023). Instala el esqueleto con el instalador en una carpeta temporal FUERA del repositorio y comprueba:
//   1. JDK, SDK de Android y Gradle presentes (si faltan, para y dice qué instalar; no instala ninguno);
//   2. el proyecto llega limpio: sin envoltorio, sin build ni .gradle;
//   3. el envoltorio se genera como dice el README y coincide con las sumas publicadas;
//   4. `check` en estricto (--no-daemon --no-build-cache --refresh-dependencies) y el comando del preset tal cual;
//   5. pruebas locales ejecutadas de verdad e informe del análisis estático;
//   6. la app y las pruebas instrumentadas se compilan (no se ejecutan);
//   7. el paquete: destino, permisos y alineación de las bibliotecas nativas para páginas de 16 KB;
//   8. el sello del kit sobre ese proyecto;
//   9. qué artefactos salieron de la caché que ya había y cuáles se descargaron.
// Uso: node types/M/esqueletos/verificar.mjs android-compose [--gradle <gradle o gradle.bat>] [--cache-antes <foto.json>]
//        [--permitir-descargas] [--conservar]
// Salida: líneas «OK», «FALLO», «OMITIDO» o «DATO» por paso; código 0 sin FALLO, 1 con alguno, 2 si falta algo previo.
// Usa la caché de Gradle del usuario (GRADLE_USER_HOME o ~/.gradle) y le añade archivos. La verificación de certificados
// nunca se desactiva: solo si Java no valida y el sistema operativo sí confía, se usa su almacén (Windows y macOS).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { tmpdir, homedir, release, version as versionDelSistema } from 'node:os';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { planificar, aplicar } from '../../../install/install.mjs';
import { PRESETS_M } from '../../../infra/presets.mjs';
import { generarKitConfig } from '../../../infra/generate-settings.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..', '..');
const ES_WIN = process.platform === 'win32';
/** Descargas que un equipo sin la caché ni la plataforma tendría que hacer; tamaños leídos en los servidores el 2026-11-26. */
export const QUE_INSTALAR = [
  'un JDK 17 o superior (JAVA_HOME apuntando a él)',
  'el SDK de Android (ANDROID_HOME) con la plataforma android-37.1 (unos 65 MB) y las build-tools 36.0.0 (unos 56 MB), con la licencia aceptada',
  'Gradle 9.7.0 (unos 130 MB, de services.gradle.org, comprobando su suma SHA-256)',
];

export const resultados = [];
const anotar = (estado, paso, detalle = '') => { resultados.push({ estado, paso, detalle }); console.log(`${estado.padEnd(8)} ${paso}${detalle ? ` — ${detalle}` : ''}`); };
const cola = (texto, n = 30) => String(texto).replace(/\/\/[^\s/@]+@/g, '//***@').trimEnd().split(/\r?\n/).slice(-n).join('\n');

/* ---------- Funciones puras (con prueba en types/M/test/esqueleto.test.mjs) ---------- */

/** Suma los informes XML de JUnit. */
export function resumenDePruebas(xmls) {
  const total = { archivos: xmls.length, pruebas: 0, fallos: 0, errores: 0, omitidas: 0 };
  for (const x of xmls) {
    const cabecera = x.match(/<testsuite\b[^>]*>/)?.[0] ?? '';
    const n = (a) => Number(cabecera.match(new RegExp(`\\b${a}="(\\d+)"`))?.[1] ?? 0);
    total.pruebas += n('tests'); total.fallos += n('failures'); total.errores += n('errors'); total.omitidas += n('skipped');
  }
  return total;
}

/** Entradas de un ZIP (un APK lo es): Map nombre → función que devuelve su contenido. */
export function leerZip(zip) {
  let fin = zip.length - 22;
  while (fin >= 0 && zip.readUInt32LE(fin) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error('no es un ZIP');
  const n = zip.readUInt16LE(fin + 10);
  let p = zip.readUInt32LE(fin + 16);
  const salida = new Map();
  for (let i = 0; i < n; i++) {
    const metodo = zip.readUInt16LE(p + 10); const tam = zip.readUInt32LE(p + 20);
    const ln = zip.readUInt16LE(p + 28); const le = zip.readUInt16LE(p + 30); const lc = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42); const nombre = zip.toString('utf8', p + 46, p + 46 + ln);
    salida.set(nombre, () => {
      const ini = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const c = zip.subarray(ini, ini + tam);
      return metodo === 0 ? c : inflateRawSync(c);
    });
    p += 46 + ln + le + lc;
  }
  return salida;
}

const PAGINA = 0x4000n;
const PT_LOAD = 1;
const PT_GNU_RELRO = 0x6474e552;

/**
 * Regla de 16 KB para una biblioteca nativa ELF de 64 bits little-endian: cada segmento LOAD alineado a 16 KB o más y,
 * si hay GNU_RELRO, que acabe en un límite de 16 KB o que nada escribible lo siga en su mismo LOAD [P-HER-10].
 */
export function alineacionElf(b) {
  if (b.length < 64 || b.readUInt32BE(0) !== 0x7f454c46) return { valido: false, motivo: 'no es ELF' };
  if (b[4] !== 2 || b[5] !== 1) return { valido: false, motivo: 'no es ELF de 64 bits little-endian' };
  const desde = Number(b.readBigUInt64LE(32)); const tam = b.readUInt16LE(54); const n = b.readUInt16LE(56);
  const segmentos = [];
  for (let i = 0; i < n; i++) {
    const p = desde + i * tam;
    segmentos.push({ tipo: b.readUInt32LE(p), vaddr: b.readBigUInt64LE(p + 16), memsz: b.readBigUInt64LE(p + 40), align: b.readBigUInt64LE(p + 48) });
  }
  const loads = segmentos.filter((s) => s.tipo === PT_LOAD);
  if (!loads.length) return { valido: false, motivo: 'sin segmentos LOAD' };
  const problemas = [];
  for (const l of loads) if (l.align < PAGINA) problemas.push(`LOAD alineado a ${l.align}`);
  for (const r of segmentos.filter((s) => s.tipo === PT_GNU_RELRO)) {
    const final = r.vaddr + r.memsz;
    if (final % PAGINA === 0n) continue;
    const suyo = loads.find((l) => r.vaddr >= l.vaddr && r.vaddr < l.vaddr + l.memsz);
    if (suyo && suyo.vaddr + suyo.memsz === final) continue;
    problemas.push('GNU_RELRO acaba fuera de un límite de 16 KB con datos escribibles detrás');
  }
  return problemas.length ? { valido: false, motivo: problemas.join('; ') } : { valido: true, motivo: '' };
}

const claveDeArtefacto = (grupo, nombre, ver, archivo) => `${grupo}/${nombre}/${ver}/${archivo}`;
/** La caché de Gradle guarda cada archivo en grupo/nombre/versión/huella/archivo. */
const indice = (lista) => new Map(lista.map(([ruta, tam]) => { const p = ruta.split('/'); return [claveDeArtefacto(p[0], p[1], p[2], p.at(-1)), tam]; }));
const BASES = ['https://dl.google.com/dl/android/maven2/', 'https://repo.maven.apache.org/maven2/', 'https://plugins.gradle.org/m2/'];
const claveDeDireccion = (u) => { const b = BASES.find((x) => u.startsWith(x)); if (!b) return null; const p = u.slice(b.length).split('/'); return p.length < 4 ? null : claveDeArtefacto(p.slice(0, -3).join('.'), p.at(-3), p.at(-2), p.at(-1)); };

/**
 * De dónde sacó Gradle cada recurso en una ejecución con --info: revalidado desde la caché (separando lo que ya estaba
 * en la foto previa de lo bajado después), descargado (y cuántos de esos ya estaban), copiado de otro almacén local tras
 * comprobar la suma, o no encontrado en el servidor consultado.
 */
export function origenDeRecursos(registro, antes) {
  const previos = indice(antes);
  const r = { revalidadosPrevios: 0, revalidadosPosteriores: 0, descargados: 0, descargadosQueYaEstaban: 0, copiadosDeMaven: 0, copiadosDeOtroSitio: 0, noEncontrados: 0 };
  for (const l of registro.split(/\r?\n/)) {
    let m;
    if ((m = l.match(/^Cached resource (\S+) is up-to-date/))) previos.has(claveDeDireccion(m[1])) ? r.revalidadosPrevios++ : r.revalidadosPosteriores++;
    else if ((m = l.match(/^Downloading (https?:\S+)/))) { r.descargados++; if (previos.has(claveDeDireccion(m[1]))) r.descargadosQueYaEstaban++; }
    else if (/^Found locally available resource with matching checksum/.test(l)) /[\\/]\.m2[\\/]/.test(l) ? r.copiadosDeMaven++ : r.copiadosDeOtroSitio++;
    else if (/^Resource missing\./.test(l)) r.noEncontrados++;
  }
  return r;
}

/** Artefactos que Gradle dice haber resuelto (verification-metadata.xml) separados según estuvieran ya en la caché. */
export function clasificarArtefactos(xml, antes, ahora) {
  const clave = claveDeArtefacto;
  const a = indice(antes); const h = indice(ahora);
  const salida = { reutilizados: [], descargados: [], sinLocalizar: [] };
  for (const c of xml.matchAll(/<component group="([^"]+)" name="([^"]+)" version="([^"]+)"[^>]*>([\s\S]*?)<\/component>/g)) {
    for (const f of c[4].matchAll(/<artifact name="([^"]+)"/g)) {
      const k = clave(c[1], c[2], c[3], f[1]);
      if (a.has(k)) salida.reutilizados.push([k, a.get(k)]);
      else if (h.has(k)) salida.descargados.push([k, h.get(k)]);
      else salida.sinLocalizar.push([k, 0]);
    }
  }
  return salida;
}

/** Opción de Java para confiar en lo que ya confía el sistema operativo. null donde no hay un almacén del sistema que usar. */
export const almacenDelSistema = (plataforma = process.platform) => ({ win32: '-Djavax.net.ssl.trustStoreType=Windows-ROOT', darwin: '-Djavax.net.ssl.trustStoreType=KeychainStore' }[plataforma] ?? null);

/* ---------- Ejecución ---------- */

let ENTORNO = process.env;

/** Ejecuta una orden de terminal con tiempo máximo y sin leer stdin. En Windows usa cmd, como el sello. */
function ejecutar(orden, { cwd, timeoutMs = 900000, env } = {}) {
  const r = spawnSync(orden, { cwd, shell: true, env: env ?? ENTORNO, timeout: timeoutMs, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 });
  return { codigo: r.status ?? -1, salida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}
const entre = (s) => `"${s}"`;
const WRAPPER = ES_WIN ? '.\\gradlew.bat' : './gradlew';
const sha256 = (ruta) => createHash('sha256').update(readFileSync(ruta)).digest('hex');
const recorrer = (d, base = d) => (existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) => { const r = join(d, e.name); return e.isDirectory() ? recorrer(r, base) : [[relative(base, r).replace(/\\/g, '/'), statSync(r).size]]; }) : []);
const mb = (lista) => `${(lista.reduce((n, a) => n + a[1], 0) / 1048576).toFixed(1)} MB`;

function foto(gradleHome, sdk) {
  const dirs = (d) => (existsSync(d) ? readdirSync(d).sort() : []);
  return {
    artefactos: recorrer(join(gradleHome, 'caches', 'modules-2', 'files-2.1')),
    distribuciones: dirs(join(gradleHome, 'wrapper', 'dists')),
    sdk: { platforms: dirs(join(sdk, 'platforms')), 'build-tools': dirs(join(sdk, 'build-tools')) },
  };
}

/** Gradle instalado: el indicado, GRADLE_HOME, el del PATH o la distribución que ya descargó un envoltorio. */
function buscarGradle(indicado, version, gradleHome) {
  const exe = ES_WIN ? 'gradle.bat' : 'gradle';
  const candidatos = [];
  if (indicado) candidatos.push(resolve(indicado));
  else {
    if (process.env.GRADLE_HOME) candidatos.push(join(process.env.GRADLE_HOME, 'bin', exe));
    candidatos.push('gradle');
    const dist = join(gradleHome, 'wrapper', 'dists', `gradle-${version}-bin`);
    if (existsSync(dist)) for (const h of readdirSync(dist)) candidatos.push(join(dist, h, `gradle-${version}`, 'bin', exe));
  }
  for (const c of candidatos) {
    if (c !== 'gradle' && !existsSync(c)) continue;
    const r = ejecutar(`${entre(c)} --version`, { cwd: tmpdir(), timeoutMs: 180000 });
    const v = r.salida.match(/^Gradle (\S+)/m)?.[1];
    if (r.codigo === 0 && v) return { ruta: c, version: v };
  }
  return null;
}

const SONDA = `import java.net.URI;
import javax.net.ssl.HttpsURLConnection;
public class Sonda {
    public static void main(String[] args) throws Exception {
        for (String u : args) {
            HttpsURLConnection c = (HttpsURLConnection) URI.create(u).toURL().openConnection();
            c.setRequestMethod("HEAD"); c.setConnectTimeout(20000); c.setReadTimeout(20000);
            c.getResponseCode(); c.disconnect();
        }
    }
}
`;
const DESTINOS_DE_RED = ['https://dl.google.com/dl/android/maven2/index.html', 'https://repo.maven.apache.org/maven2/', 'https://plugins.gradle.org/m2/', 'https://services.gradle.org/versions/current'];

/** Deja Java listo para bajar dependencias sin desactivar nunca la verificación. Devuelve { opts, nota } o { omitido }. */
function prepararRed(base, java) {
  const ruta = join(base, 'Sonda.java');
  writeFileSync(ruta, SONDA);
  const probar = (extra) => ejecutar(`${entre(java)} ${extra} ${entre(ruta)} ${DESTINOS_DE_RED.join(' ')}`, { cwd: base, timeoutMs: 180000 });
  const primera = probar('');
  if (primera.codigo === 0) return { opts: '', nota: 'Java valida los certificados con su configuración habitual' };
  if (!/PKIX|SSLHandshakeException|certificate/i.test(primera.salida)) return { omitido: `sin red hacia los registros: ${cola(primera.salida, 3)}` };
  const opt = almacenDelSistema();
  if (!opt) return { omitido: 'Java no valida el certificado y en este sistema no hay un almacén del sistema que usar: añade la autoridad al almacén de Java a mano' };
  const segunda = probar(opt);
  if (segunda.codigo === 0) return { opts: opt, nota: `Java no validaba con su almacén (TLS inspeccionado en este equipo); valida con el almacén del sistema, solo en estos comandos: ${opt}` };
  return { omitido: `ni con el almacén del sistema valida Java: ${cola(segunda.salida, 3)}` };
}

const borrarCompilacion = (proyecto) => { for (const d of ['.gradle', '.kotlin', 'build', join('app', 'build')]) rmSync(join(proyecto, d), { recursive: true, force: true, maxRetries: 10, retryDelay: 500 }); };
const restos = (proyecto) => ['.gradle', '.kotlin', 'build', join('app', 'build')].filter((d) => existsSync(join(proyecto, d)));

/** Cada registro queda escrito en el momento: si la ejecución se interrumpe, lo anterior está en la carpeta temporal. */
const registrar = (base, nombre, r) => writeFileSync(join(base, `${nombre}.log`), r.salida);

function paso(base, proyecto, etiqueta, orden, nombre, opciones = {}) {
  const inicio = Date.now();
  const r = ejecutar(orden, { cwd: proyecto, timeoutMs: PRESETS_M['java-gradle'].timeoutSeconds * 1000, ...opciones });
  registrar(base, nombre, r);
  const s = Math.round((Date.now() - inicio) / 1000);
  const tareas = r.salida.match(/^\d+ actionable tasks?: .*$/m)?.[0] ?? '';
  r.codigo === 0 ? anotar('OK', etiqueta, `${s} s. ${tareas}`) : anotar('FALLO', etiqueta, `salida ${r.codigo}\n${cola(r.salida)}`);
  return r;
}

/** El destino mínimo de la tienda, leído de su única fuente: la fila [P-PUB-6] de los hechos de plataforma. */
export function destinoMinimoDeLaTienda(hechos = readFileSync(join(AQUI, '..', 'PLATAFORMA-ANDROID.md'), 'utf8')) {
  const n = Number(hechos.match(/^- \*\*\[P-PUB-6\]\*\*.*?\(API (\d+)\)/m)?.[1]);
  if (!n) throw new Error('no se puede leer el destino mínimo de la fila [P-PUB-6]');
  return n;
}

function revisarPaquete(proyecto, sdk, buildTools) {
  const apk = join(proyecto, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  const pruebas = join(proyecto, 'app', 'build', 'outputs', 'apk', 'androidTest', 'debug', 'app-debug-androidTest.apk');
  existsSync(apk) ? anotar('OK', 'paquete de depuración generado', `${(statSync(apk).size / 1048576).toFixed(1)} MB`) : anotar('FALLO', 'no se generó el paquete de depuración');
  existsSync(pruebas) ? anotar('OK', 'paquete de pruebas instrumentadas compilado (NO ejecutado: exige equipo o emulador)') : anotar('FALLO', 'no se compiló el paquete de pruebas instrumentadas');
  if (!existsSync(apk)) return;
  const bt = join(sdk, 'build-tools', buildTools);
  const aapt = ejecutar(`${entre(join(bt, ES_WIN ? 'aapt2.exe' : 'aapt2'))} dump badging ${entre(apk)}`, { cwd: proyecto, timeoutMs: 120000 });
  if (aapt.codigo === 0) {
    const dato = (re) => aapt.salida.match(re)?.[1] ?? '?';
    anotar('DATO', 'paquete', `minSdk ${dato(/^(?:minSdkVersion|sdkVersion):'(\d+)'/m)}, targetSdk ${dato(/^targetSdkVersion:'(\d+)'/m)}, compileSdk ${dato(/compileSdkVersion='(\d+)'/)}`);
    const destino = Number(dato(/^targetSdkVersion:'(\d+)'/m));
    const minimo = destinoMinimoDeLaTienda();
    destino >= minimo ? anotar('OK', 'el destino del paquete cumple el mínimo de la tienda [P-PUB-6]', `${destino} (mínimo ${minimo})`) : anotar('FALLO', 'destino del paquete por debajo del mínimo de la tienda [P-PUB-6]', `${destino || '?'} (mínimo ${minimo})`);
    const permisos = [...aapt.salida.matchAll(/^uses-permission: name='([^']+)'/gm)].map((m) => m[1]);
    anotar('DATO', 'permisos del paquete compilado', permisos.join(', ') || 'ninguno');
  } else anotar('FALLO', 'aapt2 dump badging', cola(aapt.salida, 5));
  const zipalign = ejecutar(`${entre(join(bt, ES_WIN ? 'zipalign.exe' : 'zipalign'))} -c -P 16 -v 4 ${entre(apk)}`, { cwd: proyecto, timeoutMs: 120000 });
  zipalign.codigo === 0 && /Verification succes/i.test(zipalign.salida) ? anotar('OK', '16 KB: zipalign -c -P 16 sobre el paquete', 'Verification successful') : anotar('FALLO', '16 KB: zipalign -c -P 16', cola(zipalign.salida, 8));
  const nativas = [...leerZip(readFileSync(apk))].filter(([n]) => /^lib\/(arm64-v8a|x86_64)\/.+\.so$/.test(n));
  if (!nativas.length) return anotar('DATO', '16 KB: bibliotecas nativas de 64 bits', 'el paquete no lleva ninguna');
  const malas = nativas.map(([n, leer]) => [n, alineacionElf(leer())]).filter(([, r]) => !r.valido);
  malas.length ? anotar('FALLO', '16 KB: alineación ELF', malas.map(([n, r]) => `${n}: ${r.motivo}`).join(' | '))
    : anotar('OK', '16 KB: alineación ELF (LOAD y GNU_RELRO) de las bibliotecas de 64 bits', `${nativas.length}: ${[...new Set(nativas.map(([n]) => n.split('/').at(-1)))].join(', ')}`);
}

function sello(base, proyecto, ficha) {
  const git = (a) => ejecutar(`git ${a}`, { cwd: proyecto, timeoutMs: 120000 });
  /* Lo que el README pide antes de versionar el envoltorio. */
  const attrs = join(proyecto, '.gitattributes');
  writeFileSync(attrs, `${readFileSync(attrs, 'utf8')}*.bat text eol=crlf\n*.jar binary\n`);
  for (const a of ['init -q -b main', 'config user.name Verificacion', 'config user.email verificacion@users.noreply.example', 'config commit.gpgsign false', 'add -A', 'update-index --chmod=+x gradlew', 'commit -q -m "chore: esqueleto con envoltorio"']) {
    const r = git(a);
    if (r.codigo !== 0) return anotar('FALLO', `git ${a.split(' ')[0]}`, cola(r.salida, 5));
  }
  const versionados = git('ls-files').salida;
  /^gradle\/wrapper\/gradle-wrapper\.jar$/m.test(versionados) && !/^(\.gradle\/|\.kotlin\/|build\/|app\/build\/|local\.properties$)/m.test(versionados)
    ? anotar('OK', 'git: el envoltorio se versiona y la compilación se ignora') : anotar('FALLO', 'git: archivos versionados', cola(versionados, 40));
  const modo = git('ls-files -s gradlew').salida;
  /^100755 /.test(modo) ? anotar('OK', 'git: gradlew queda versionado como ejecutable (100755)') : anotar('FALLO', 'git: gradlew no queda ejecutable', modo.trim());
  const correr = (checks) => {
    const f = structuredClone(ficha); f.kit.checks = checks ? [{ commands: [checks], timeoutSeconds: PRESETS_M['java-gradle'].timeoutSeconds }] : [];
    writeFileSync(join(proyecto, '.claude', 'kit.json'), `${JSON.stringify(generarKitConfig(f), null, 2)}\n`);
    borrarCompilacion(proyecto);
    return ejecutar(`${entre(process.execPath)} ${entre(join('.claude', 'hooks', 'premerge-check.mjs'))}`, { cwd: proyecto, timeoutMs: PRESETS_M['java-gradle'].timeoutSeconds * 1000 });
  };
  const variantes = ES_WIN ? [null, 'gradlew.bat --no-daemon check', '.\\gradlew.bat --no-daemon check'] : [null];
  const obtenidos = {};
  for (const [i, v] of variantes.entries()) {
    const r = correr(v);
    registrar(base, `sello-${i}`, r);
    const ok = r.codigo === 0 && /Sello de pre-merge listo/.test(r.salida);
    obtenidos[v ?? 'preset'] = ok;
    anotar('DATO', `sello con «${v ?? `${PRESETS_M['java-gradle'].comandos[0]} (comando del preset sin cambios)`}»`, ok ? r.salida.match(/Sello de pre-merge listo.*$/m)[0] : `sin sello: ${cola(r.salida, 3).replace(/\r?\n/g, ' / ')}`);
  }
  const bueno = ES_WIN ? obtenidos['.\\gradlew.bat --no-daemon check'] : obtenidos.preset;
  bueno ? anotar('OK', `el sello del kit se obtiene en ${ES_WIN ? 'Windows con «.\\gradlew.bat --no-daemon check» en kit.checks' : 'este sistema con el comando del preset'}`) : anotar('FALLO', 'no se obtuvo el sello del kit');
}

export async function main(args) {
  const valor = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const nombre = args[0];
  const dirs = readdirSync(AQUI, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(AQUI, d.name, 'esqueleto.json'))).map((d) => d.name);
  if (!nombre || !dirs.includes(nombre)) { console.error(`Uso: node types/M/esqueletos/verificar.mjs <${dirs.join('|')}> [--gradle <ruta>] [--cache-antes <foto.json>] [--permitir-descargas] [--conservar]`); return 2; }
  const esq = JSON.parse(readFileSync(join(AQUI, nombre, 'esqueleto.json'), 'utf8'));
  const v = esq.verificacion;
  const preset = PRESETS_M[esq.preset];
  const gradleHome = process.env.GRADLE_USER_HOME || join(homedir(), '.gradle');
  console.log(`Esqueleto ${nombre} (preset ${esq.preset}) — ${new Date().toISOString()} — ${versionDelSistema()} ${release()} ${process.arch}, Node ${process.versions.node}`);

  /* 1. Lo previo: si falta, se para y se dice qué instalar. */
  const javaHome = process.env.JAVA_HOME;
  const java = javaHome ? join(javaHome, 'bin', ES_WIN ? 'java.exe' : 'java') : 'java';
  const jv = ejecutar(`${entre(java)} -version`, { cwd: tmpdir(), timeoutMs: 60000 });
  const sdk = process.env.ANDROID_HOME;
  const faltan = [];
  const mayor = Number(jv.salida.match(/version "(\d+)/)?.[1] ?? 0);
  if (jv.codigo !== 0 || mayor < 17) faltan.push(QUE_INSTALAR[0]);
  if (!sdk || !existsSync(sdk) || !existsSync(join(sdk, 'build-tools', v.buildTools))) faltan.push(QUE_INSTALAR[1]);
  else if (!existsSync(join(sdk, 'platforms', v.plataformaAndroid)) && !args.includes('--permitir-descargas')) faltan.push(`la plataforma ${v.plataformaAndroid} (unos 65 MB), o repite con --permitir-descargas para que el complemento de Android la descargue si la licencia está aceptada`);
  const gradle = faltan.length ? null : buscarGradle(valor('--gradle'), v.gradle.version, gradleHome);
  if (!faltan.length && !gradle) faltan.push(QUE_INSTALAR[2]);
  if (faltan.length) { for (const f of faltan) anotar('FALLO', 'falta', f); console.log('\nNo se instala nada solo. Instala lo anterior y repite.'); return 2; }
  anotar('OK', 'JDK', cola(jv.salida, 9).split(/\r?\n/).slice(0, 2).join(' / '));
  anotar('OK', 'Gradle para generar el envoltorio', `${gradle.version} (${gradle.ruta})`);
  gradle.version === v.gradle.version || anotar('FALLO', 'versión de Gradle', `se esperaba ${v.gradle.version}`);
  anotar('DATO', 'SDK de Android antes', `${sdk}; plataformas ${readdirSync(join(sdk, 'platforms')).join(', ')}; build-tools ${readdirSync(join(sdk, 'build-tools')).join(', ')}`);

  const base = mkdtempSync(join(tmpdir(), 'kit-esqueleto-m-'));
  console.log(`Carpeta temporal: ${base}`);
  try {
    const antes = valor('--cache-antes') ? JSON.parse(readFileSync(valor('--cache-antes'), 'utf8')) : foto(gradleHome, sdk);
    anotar('DATO', 'caché de Gradle antes', `${antes.artefactos.length} artefactos (${mb(antes.artefactos)}) en ${gradleHome}; distribuciones: ${antes.distribuciones.join(', ') || 'ninguna'}${valor('--cache-antes') ? ' (foto anterior indicada)' : ''}`);
    const red = prepararRed(base, java);
    if (red.omitido) { anotar('FALLO', 'red', red.omitido); return 1; }
    anotar('OK', 'red y certificados', red.nota);
    if (red.opts) ENTORNO = { ...process.env, GRADLE_OPTS: `${process.env.GRADLE_OPTS ?? ''} ${red.opts}`.trim() };

    /* 2. Instalación en un proyecto limpio. */
    const proyecto = join(base, 'proyecto');
    mkdirSync(proyecto);
    const ficha = JSON.parse(readFileSync(join(RAIZ, 'types', 'M', 'ficha-infra.json'), 'utf8'));
    ficha.proyecto = 'verificacion'; ficha.kit.preset = esq.preset;
    const fichaRuta = join(base, 'ficha.json');
    writeFileSync(fichaRuta, JSON.stringify(ficha));
    aplicar(planificar({ destino: proyecto, tipo: 'M', proyecto: 'verificacion', fichaRuta, respaldo: join(base, 'respaldo') }));
    const sobran = recorrer(proyecto).map(([r]) => r).filter((r) => /(^|\/)(gradlew(\.bat)?|local\.properties)$|gradle\/wrapper\/|\.(jar|apk|aab)$|(^|\/)(build|\.gradle|\.kotlin)\//.test(r));
    sobran.length ? anotar('FALLO', 'el proyecto instalado no está limpio', sobran.join(', ')) : anotar('OK', 'el instalador copia el esqueleto: sin envoltorio, sin binarios, sin build ni .gradle');

    /* 3. Envoltorio como dice el README y comprobación contra las sumas. */
    const g = paso(base, proyecto, 'generar el envoltorio con la tarea wrapper', `${entre(gradle.ruta)} --no-daemon --console=plain wrapper --gradle-version ${v.gradle.version} --distribution-type bin --gradle-distribution-sha256-sum ${v.gradle.distribucionSha256}`, 'wrapper');
    if (g.codigo !== 0) return 1;
    const jar = join(proyecto, 'gradle', 'wrapper', 'gradle-wrapper.jar');
    const suma = sha256(jar);
    suma === v.gradle.envoltorioSha256 ? anotar('OK', 'gradle-wrapper.jar coincide con la suma fijada en esqueleto.json', suma) : anotar('FALLO', 'gradle-wrapper.jar no coincide', `${suma} frente a ${v.gradle.envoltorioSha256}`);
    try {
      for (const [archivo, fijada] of [['wrapper.jar', v.gradle.envoltorioSha256], ['bin.zip', v.gradle.distribucionSha256]]) {
        const r = await fetch(`https://services.gradle.org/distributions/gradle-${v.gradle.version}-${archivo}.sha256`, { signal: AbortSignal.timeout(40000) });
        const publicada = (await r.text()).trim();
        r.ok && publicada === fijada ? anotar('OK', `la suma publicada de ${archivo} es la fijada`) : anotar('FALLO', `suma publicada de ${archivo}`, `${r.status} ${publicada.slice(0, 80)}`);
      }
    } catch (e) { anotar('OMITIDO', 'sumas publicadas en línea', e.cause?.code ?? e.message); }
    const props = readFileSync(join(proyecto, 'gradle', 'wrapper', 'gradle-wrapper.properties'), 'utf8');
    props.includes(`distributionSha256Sum=${v.gradle.distribucionSha256}`) && props.includes(`services.gradle.org/distributions/gradle-${v.gradle.version}-bin.zip`)
      ? anotar('OK', 'gradle-wrapper.properties apunta a services.gradle.org y fija la suma de la distribución') : anotar('FALLO', 'gradle-wrapper.properties', props);

    /* 4. Estricto: proyecto limpio, sin demonio, sin caché de compilación y revalidando dependencias. */
    borrarCompilacion(proyecto);
    restos(proyecto).length ? anotar('FALLO', 'quedan restos de compilación', restos(proyecto).join(', ')) : anotar('OK', 'proyecto limpio antes de la ejecución estricta (sin .gradle, .kotlin ni build)');
    const estricto = paso(base, proyecto, `estricto: ${WRAPPER} --no-daemon --no-build-cache --refresh-dependencies check`, `${WRAPPER} --no-daemon --no-build-cache --refresh-dependencies --console=plain --info check`, 'estricto');
    if (estricto.codigo !== 0) return 1;
    const deCache = (estricto.salida.match(/ FROM-CACHE$/gm) ?? []).length;
    deCache ? anotar('FALLO', 'hubo tareas tomadas de la caché de compilación', String(deCache)) : anotar('OK', 'ninguna tarea salió de la caché de compilación');
    const o = origenDeRecursos(estricto.salida, antes.artefactos);
    anotar('DATO', 'estricto: recursos revalidados desde la caché de Gradle', `${o.revalidadosPrevios} ya estaban en la foto previa; ${o.revalidadosPosteriores} se bajaron después de esa foto`);
    anotar('DATO', 'estricto: recursos descargados', `${o.descargados} (de ellos, ${o.descargadosQueYaEstaban} que ya estaban en la caché)`);
    anotar('DATO', 'estricto: recursos copiados de un almacén local tras comprobar la suma', `${o.copiadosDeMaven} del repositorio Maven del usuario (~/.m2), ${o.copiadosDeOtroSitio} de otro sitio; consultas sin resultado: ${o.noEncontrados}`);

    /* 5. Pruebas locales y análisis estático. */
    const resultadosDir = join(proyecto, 'app', 'build', 'test-results');
    const xmls = recorrer(resultadosDir).filter(([r]) => r.endsWith('.xml')).map(([r]) => readFileSync(join(resultadosDir, r), 'utf8'));
    const t = resumenDePruebas(xmls);
    t.pruebas > 0 && t.fallos === 0 && t.errores === 0 ? anotar('OK', 'pruebas locales ejecutadas por check', `${t.pruebas} pruebas, ${t.fallos} fallos, ${t.errores} errores, ${t.omitidas} omitidas (${recorrer(resultadosDir).filter(([r]) => r.endsWith('.xml')).map(([r]) => r.split('/')[0]).join(', ')})`) : anotar('FALLO', 'pruebas locales', JSON.stringify(t));
    const informes = recorrer(join(proyecto, 'app', 'build', 'reports')).filter(([r]) => /lint-results.*\.(txt|xml|html)$/.test(r));
    const texto = informes.find(([r]) => r.endsWith('.txt'));
    if (texto) {
      const t2 = readFileSync(join(proyecto, 'app', 'build', 'reports', texto[0]), 'utf8');
      anotar('DATO', 'análisis estático (lint)', t2.trim().split(/\r?\n/).at(-1));
      for (const l of t2.split(/\r?\n/).filter((x) => /: (Error|Warning|Information): /.test(x))) console.log(`           ${l.replace(proyecto, '.').slice(0, 220)}`);
    } else anotar('DATO', 'análisis estático (lint)', informes.map(([r]) => r).join(', ') || 'sin informe localizado');

    /* El comando del preset, tal cual, desde limpio. */
    borrarCompilacion(proyecto);
    if (ES_WIN) {
      paso(base, proyecto, 'preset en cmd: .\\gradlew.bat --no-daemon check', '.\\gradlew.bat --no-daemon check', 'preset-cmd');
      const sh = join(ejecutar('git --exec-path', { cwd: proyecto, timeoutMs: 30000 }).salida.trim(), '..', '..', '..', 'usr', 'bin', 'sh.exe');
      if (existsSync(sh)) { borrarCompilacion(proyecto); paso(base, proyecto, `preset en la consola POSIX de git: ${preset.comandos[0]}`, `${entre(sh)} -c "${preset.comandos[0]}"`, 'preset-sh'); }
      else anotar('OMITIDO', `preset en consola POSIX: ${preset.comandos[0]}`, 'no se encontró sh');
    } else paso(base, proyecto, `preset: ${preset.comandos[0]}`, preset.comandos[0], 'preset');

    /* 6 y 7. Paquetes. */
    const m = paso(base, proyecto, 'compilar la app y las pruebas instrumentadas', `${WRAPPER} --no-daemon --console=plain assembleDebug assembleDebugAndroidTest`, 'ensamblar');
    if (m.codigo === 0) revisarPaquete(proyecto, sdk, v.buildTools);

    /* Versiones realmente resueltas. */
    const plug = ejecutar(`${WRAPPER} --no-daemon --console=plain -q buildEnvironment`, { cwd: proyecto, timeoutMs: 600000 });
    const dep = ejecutar(`${WRAPPER} --no-daemon --console=plain -q :app:dependencies --configuration debugRuntimeClasspath`, { cwd: proyecto, timeoutMs: 600000 });
    registrar(base, 'entorno', plug); registrar(base, 'dependencias', dep);
    const resuelta = (salida, artefacto) => [...new Set([...salida.matchAll(new RegExp(`${artefacto.replace(/\./g, '\\.')}:(?:\\{[^}]*\\}|[\\w.-]+)(?: -> ([\\w.-]+))?`, 'g'))].map((x) => x[1] ?? x[0].split(':').at(-1)))].join(', ') || '?';
    anotar('DATO', 'resuelto', `complemento de Android ${resuelta(plug.salida, 'com.android.tools.build:gradle')}; complemento de Kotlin ${resuelta(plug.salida, 'org.jetbrains.kotlin:kotlin-gradle-plugin')}; compose ui ${resuelta(dep.salida, 'androidx.compose.ui:ui')}; material3 ${resuelta(dep.salida, 'androidx.compose.material3:material3')}; activity-compose ${resuelta(dep.salida, 'androidx.activity:activity-compose')}`);

    /* 9 (antes del sello, que no resuelve nada nuevo). Reutilizado frente a descargado. La foto se toma antes de listar,
       para no contar como descarga de la compilación lo que pida el propio listado. */
    const compilado = foto(gradleHome, sdk);
    const meta = paso(base, proyecto, 'listar lo que Gradle resuelve (verification-metadata, solo para este informe)', `${WRAPPER} --no-daemon --console=plain --write-verification-metadata sha256 check assembleDebug assembleDebugAndroidTest`, 'metadatos');
    const xmlMeta = join(proyecto, 'gradle', 'verification-metadata.xml');
    const despues = foto(gradleHome, sdk);
    const previos = new Set(antes.artefactos.map(([r]) => r));
    const nuevos = compilado.artefactos.filter(([r]) => !previos.has(r));
    const extraDelListado = despues.artefactos.length - compilado.artefactos.length;
    anotar('DATO', 'caché de Gradle después de compilar', `${compilado.artefactos.length} artefactos; ${nuevos.length} nuevos frente a la foto previa (${mb(nuevos)}); el listado añadió ${extraDelListado} más; distribuciones nuevas: ${despues.distribuciones.filter((d) => !antes.distribuciones.includes(d)).join(', ') || 'ninguna'}`);
    anotar('DATO', 'SDK de Android después', `plataformas nuevas: ${despues.sdk.platforms.filter((d) => !antes.sdk.platforms.includes(d)).join(', ') || 'ninguna'}; build-tools nuevas: ${despues.sdk['build-tools'].filter((d) => !antes.sdk['build-tools'].includes(d)).join(', ') || 'ninguna'}`);
    if (meta.codigo === 0 && existsSync(xmlMeta)) {
      const c = clasificarArtefactos(readFileSync(xmlMeta, 'utf8'), antes.artefactos, despues.artefactos);
      anotar('DATO', 'de lo que resuelve el proyecto: ya estaba en la caché de la foto previa', `${c.reutilizados.length} artefactos (${mb(c.reutilizados)})`);
      anotar('DATO', 'de lo que resuelve el proyecto: no estaba en la foto previa (descargado o copiado)', `${c.descargados.length} artefactos (${mb(c.descargados)})`);
      if (c.sinLocalizar.length) anotar('DATO', 'artefactos listados que no se localizan en la caché', `${c.sinLocalizar.length}: ${c.sinLocalizar.slice(0, 5).map(([k]) => k).join(', ')}`);
      writeFileSync(join(base, 'artefactos.json'), JSON.stringify({ ...c, nuevos }, null, 1));
    }
    rmSync(xmlMeta, { force: true });

    /* 8. Sello. */
    anotar('DATO', 'variable NoDefaultCurrentDirectoryInExePath', process.env.NoDefaultCurrentDirectoryInExePath !== undefined ? 'definida (cmd no busca programas en la carpeta actual)' : 'no definida');
    sello(base, proyecto, ficha);
  } finally {
    if (args.includes('--conservar')) console.log(`\nSe conserva ${base}`);
    else { try { rmSync(base, { recursive: true, force: true, maxRetries: 20, retryDelay: 1000 }); } catch (e) { console.log(`\nNo se pudo borrar ${base} (${e.code}): bórrala a mano.`); } }
  }
  const fallos = resultados.filter((r) => r.estado === 'FALLO').length;
  console.log(fallos ? `\n${fallos} paso(s) con FALLO.` : '\nTodos los pasos ejecutados pasaron (los OMITIDO no se verificaron).');
  return fallos ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = await main(process.argv.slice(2));
