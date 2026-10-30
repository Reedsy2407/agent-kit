# Ejecutar código de terceros con confinamiento y límites de recursos

## Problema
Algunas herramientas ejecutan código que no escribieron: complementos, órdenes configuradas por el usuario, tareas descargadas, lógica de un proyecto analizado. Ese código puede fallar, colgarse, consumir sin freno o hacer más de lo que debe con los permisos de la herramienta. Confinar es limitar de antemano qué puede ver y tocar, y cuántos recursos puede gastar, para que un fallo o un abuso quede contenido. No es una garantía absoluta, sino reducir el daño probable y hacer visibles los límites.

## Señales de que aplica
- La herramienta lanza ejecutables o scripts cuyo contenido no controla.
- Corre con más permisos que el código que ejecuta, o en un equipo con datos que no deben quedar al alcance.
- Un trabajo ajeno colgado o descontrolado afectaría a otros usuarios o al propio equipo.

## Señales de que sobra
- Solo se ejecuta código del propio autor, versionado y revisado con la herramienta.
- La herramienta ya corre en un entorno aislado y desechable donde un fallo no sale de él.
- El código ajeno es una orden fija y conocida del sistema (no una elección de un tercero).

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: ejecutar con los permisos de la herramienta | Ninguno; el código ajeno hereda todo | Solo código de plena confianza |
| Proceso aparte con lista de argumentos, entorno mínimo y directorio propio | Bajo | Mínimo razonable para cualquier código ajeno |
| Lo anterior más plazo total y límites de memoria, tiempo de procesador y archivos abiertos | Medio: depende del sistema operativo | Código que puede descontrolarse |
| Lo anterior más un usuario sin privilegios dedicado y archivos accesibles acotados | Medio-alto | Herramienta con más permisos que el código ajeno |
| Aislamiento fuerte (contenedor, máquina virtual, servicio externo de ejecución) | Alto | Código de poca confianza en un entorno compartido |

## Cómo se comprueba
- Una prueba de plazo: un proceso hijo que no termina se detiene al vencer, y sus procesos descendientes también.
- Una prueba de límites: un hijo que reserva memoria sin freno o abre archivos sin cerrar es detenido por el límite sin afectar a la herramienta.
- Una prueba de entorno: el hijo no recibe variables que contengan secretos de la herramienta.
- Una prueba de lo que puede alcanzar: sus archivos accesibles se reducen a los declarados.
- Una prueba de salida: su salida está acotada en tamaño y no llena un búfer que bloquee a la herramienta.
- Una prueba de que un error del hijo se informa con claridad y no se confunde con un error propio.
- Una prueba, en cada sistema operativo que se declare, de que los límites que se prometen se aplican de verdad; los que no se pueden aplicar allí se declaran.

## Cómo suele resolverse
Se lanza el código ajeno como proceso aparte, con una lista de argumentos y sin intérprete de órdenes, un entorno construido desde cero con solo lo necesario y un directorio de trabajo propio. Se le impone un plazo total y, donde el sistema lo permite, límites de memoria, de procesador y de descriptores, aplicados al hijo y no a la herramienta. Si la herramienta tiene más permisos, el hijo se ejecuta con un usuario sin privilegios. Su salida se lee con un tope y cada resultado se trata como entrada no confiable. Cuando el riesgo lo justifica, se pasa a un aislamiento más fuerte en lugar de endurecer a mano lo anterior. Los límites que el sistema no ofrece se documentan en vez de simularse.

## Anti-patrones frecuentes
- Heredar el entorno completo, con credenciales, hacia el hijo.
- Construir una orden de texto con datos externos y pasarla a un intérprete de órdenes.
- Poner un plazo solo a la lectura de la salida y no a la vida del proceso.
- Detener al hijo directo y dejar vivos sus descendientes.
- Llamar «aislamiento» a lo que solo cambia el directorio de trabajo.
- Aplicar los límites a la herramienta entera en lugar de al hijo.
- Suponer que un límite existe en todos los sistemas operativos.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** `os/exec`. Verificado el 2026-10-30 ([os/exec](https://pkg.go.dev/os/exec)): `Command` no invoca un intérprete de órdenes ni expande comodines; si `Env` es nulo el hijo usa el entorno del proceso actual, y si hay claves repetidas vale la última; `Dir` fija el directorio de trabajo; `CommandContext` interrumpe el proceso cuando el contexto termina (por defecto lo mata) y `WaitDelay` acota la espera a un hijo que no sale; desde Go 1.19 la búsqueda de un programa no se resuelve a través del directorio actual. No verificado: los campos de credenciales y de grupo de procesos del atributo de proceso del sistema, los límites de recursos y su disponibilidad por sistema operativo.
- **Python:** `subprocess` y `resource`. Verificado el 2026-10-30 ([subprocess](https://docs.python.org/3/library/subprocess.html), [resource](https://docs.python.org/3/library/resource.html)): `user`, `group`, `extra_groups` y `umask` de `Popen` son solo para POSIX, y fijar `user` no descarta los grupos suplementarios, por lo que hay que pasar también `extra_groups=()`; `close_fds` vale por defecto y cierra todos los descriptores salvo los estándar; el módulo `resource` figura como disponible en Unix (no en WASI) y su `setrlimit` fija límites blando y duro, entre ellos espacio de direcciones, tiempo de procesador y descriptores abiertos; la fuente no dice si los hijos heredan los límites. No verificado: los equivalentes en Windows.
- **Rust:** `std::process::Command` y su extensión de Unix. Verificado el 2026-10-30 ([Command](https://doc.rust-lang.org/std/process/struct.Command.html)): los argumentos se pasan sin intérprete de órdenes; `env_clear` y `env_remove` controlan lo que hereda el hijo; `current_dir` fija el directorio de trabajo; en Unix `uid` y `gid` fijan el usuario y el grupo del hijo y, si fallan, la creación falla; `pre_exec` es Unix y `unsafe`. No verificado: límites de recursos y objetos de trabajo de Windows, que la biblioteca estándar no cubre.

## ADR de ejemplo
- Ninguno todavía.
