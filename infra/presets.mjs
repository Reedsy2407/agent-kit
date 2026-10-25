// Presets de comprobaciones del sello por stack (`kit.preset` en la ficha). Una sola fuente: el generador los expande a
// `kit.checks` (con su tiempo máximo) y autoriza esos comandos y solo esos, y solo si la ficha declara el preset (ADR 0014).
// `verificado: true` solo si el comando real se ejecutó con éxito sobre el esqueleto del stack (`esqueleto`, fecha en `verificadoEl`;
// registro en types/B/esqueletos/VERIFICACION.md). `verificado: false` significa que no se ha podido ejecutar: el sello lo dice.
// Los comandos se escriben tal cual se lanzan en una terminal; el tiempo máximo lo impone el sello (`timeoutSeconds`) y, si el
// constructor los lanza a mano, `guard-shell` exige `timeout` (core/hooks/lib/common.mjs, timeoutRequired).

export const PRESETS = Object.freeze({
  'java-maven': {
    nombre: 'Java con Maven', verificado: true, verificadoEl: '2026-10-23', esqueleto: 'java-spring', timeoutSeconds: 1800,
    comandos: ['mvn -B verify'],
    nota: 'Ejecutado con éxito sobre el esqueleto java-spring (Java 21, Maven 3.9). Con el wrapper del proyecto, cambia el comando por ./mvnw -B verify en la ficha (kit.checks).',
  },
  'java-gradle': {
    nombre: 'Java con Gradle', verificado: false, timeoutSeconds: 1800,
    comandos: ['./gradlew --no-daemon check'],
    nota: 'En Windows sin shell POSIX el sello usa cmd: ahí el comando es gradlew.bat --no-daemon check (kit.checks).',
  },
  dotnet: {
    nombre: '.NET', verificado: true, verificadoEl: '2026-10-23', esqueleto: 'dotnet', timeoutSeconds: 1800,
    comandos: ['dotnet test --nologo'],
    nota: 'Ejecutado con éxito sobre el esqueleto dotnet con el SDK 10 de la imagen de contenedor (el SDK local era el 9). dotnet test restaura y compila; si la solución tiene varias, indica la ruta en kit.checks.',
  },
  node: {
    nombre: 'Node', verificado: true, verificadoEl: '2026-10-23', esqueleto: 'node', timeoutSeconds: 900,
    comandos: ['npm test'],
    nota: 'Ejecutado con éxito sobre el esqueleto node; además es el comando que ya usa el tipo A en uso real.',
  },
  python: {
    nombre: 'Python', verificado: true, verificadoEl: '2026-10-23', esqueleto: 'python', timeoutSeconds: 900,
    comandos: ['python -m pytest -q'],
    nota: 'Ejecutado con éxito sobre el esqueleto python en contenedor (Python 3.13 y 3.14). Si el proyecto usa un entorno virtual, activa o antepone su intérprete en kit.checks.',
  },
});

export const IDS_PRESETS = Object.freeze(Object.keys(PRESETS));

/** Comprobaciones del sello que aporta el preset, con su tiempo máximo. */
export function checksDePreset(id) {
  const p = PRESETS[id];
  return p ? [{ commands: [...p.comandos], timeoutSeconds: p.timeoutSeconds }] : [];
}

/** Autorizaciones que aporta el preset: el comando exacto, con y sin `timeout` delante. Nada más. */
export function permisosDePreset(id) {
  const p = PRESETS[id];
  if (!p) return [];
  return p.comandos.flatMap((c) => [`Bash(${c})`, `Bash(timeout * ${c})`]);
}

/** Lo que el sello debe avisar: null si el preset está verificado (o no hay preset). */
export function avisoDePreset(id) {
  const p = PRESETS[id];
  if (!p || p.verificado) return null;
  return `el preset «${id}» (${p.nombre}) NO está verificado: el kit no pudo ejecutar ese stack. Comprueba el comando en tu entorno antes de fiarte del sello.`;
}
