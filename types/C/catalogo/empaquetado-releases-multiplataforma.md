# Empaquetado y releases multiplataforma: sumas de verificación y versionado

## Problema
Una herramienta que se instala en máquinas ajenas tiene que llegar íntegra y reconocible: el usuario debe poder saber qué versión tiene, que lo que descargó es lo que se publicó y cómo actualizarla o retirarla. Cada plataforma añade su forma de empaquetar, su arquitectura y sus costumbres. Sin un proceso repetible, cada publicación depende de la memoria de quien la hace y de la máquina en la que la hace.

## Señales de que aplica
- La herramienta se distribuye a personas o equipos que no la construyen.
- Hay más de una plataforma o arquitectura objetivo.
- Quien instala necesita confiar en lo descargado y saber cómo actualizar.
- Hay versiones distintas en uso y compatibilidad que mantener.

## Señales de que sobra
- Se usa solo en la máquina de su autor o dentro de un equipo que la construye desde el código fuente.
- Se distribuye únicamente por un gestor de paquetes que ya firma, verifica y versiona.
- Es una demostración sin plan de mantenimiento.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: compilar a mano y copiar el binario | Ninguno de proceso; nada se puede verificar ni repetir | Uso personal |
| Un proceso repetible que compila por plataforma, empaqueta y genera sumas de verificación | Medio | Cualquier distribución a terceros |
| Lo anterior más sumas publicadas por un canal distinto al de los artefactos | Medio | Cuando la integridad importa |
| Lo anterior más firma de los artefactos | Medio-alto: gestión de claves | Distribución amplia o sensible |
| Instaladores nativos o presencia en gestores de paquetes | Alto | Usuarios que esperan esa forma de instalar |

## Cómo se comprueba
- Una prueba de que el proceso de publicación es repetible: dos ejecuciones sobre la misma etiqueta producen artefactos equivalentes o, si no, la diferencia está explicada.
- Una prueba de las sumas: cada artefacto coincide con su suma publicada y la suma de cada archivo nuevo se genera siempre.
- Una prueba en cada plataforma declarada de que el artefacto instalado arranca y responde a los comandos básicos de versión y comprobación de configuración.
- Una prueba de versión: el binario informa la versión de la etiqueta y no una por defecto.
- Una prueba de actualización y de retirada: se explican y funcionan.
- Una prueba de que el paquete no incluye secretos, rutas de la máquina de construcción ni archivos de desarrollo.
- Una prueba de que lo que no se puede verificar en una plataforma está declarado como tal.

## Cómo suele resolverse
Se versiona con una convención conocida: los cambios incompatibles suben la versión mayor, los compatibles la menor y las correcciones la de arreglos. Un flujo repetible, disparado por una etiqueta, ejecuta primero las pruebas, compila para cada plataforma declarada con opciones reproducibles (sin dependencias del sistema cuando es posible, sin rutas de la máquina), empaqueta y genera una suma de verificación por artefacto en un archivo de sumas. Las sumas se publican por un canal distinto al de los binarios, de modo que quien comprometa un canal no controle el otro. La firma, si se usa, se gestiona aparte, con claves que no están en el flujo. Lo que queda manual (subir, anunciar, firmar, probar en cada plataforma) está escrito y quien lo hace lo registra.

## Anti-patrones frecuentes
- Publicar un binario construido en la máquina personal de alguien.
- Publicar las sumas junto a los binarios y presentarlas como protección contra un canal comprometido.
- Prometer firmas que no existen o claves dentro del flujo de publicación.
- Un binario que no sabe qué versión es.
- Dar por probada una plataforma solo porque compila para ella.
- Un instalador que descarga y ejecuta un guion sin verificarlo.
- Cambios incompatibles en una versión de arreglos.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** compilación cruzada con variables de entorno. Verificado el 2026-10-30 ([instalar desde las fuentes](https://go.dev/doc/install/source)): `GOOS` y `GOARCH` identifican el entorno de destino y no el de ejecución (en la práctica siempre se compila para otro destino); para construir sin soporte de cgo se pone `CGO_ENABLED=0`, y con cgo hace falta un compilador de C. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): `go build` del esqueleto Go pasa en Windows; el flujo de publicación de ejemplo no se ha ejecutado nunca. No verificado: la lista de combinaciones válidas y las opciones para compilaciones reproducibles.
- **Python:** paquetes de distribución. Verificado el 2026-10-30 ([formatos de paquete](https://packaging.python.org/en/latest/discussions/package-formats/)): un paquete fuente es un archivo comprimido con el código y los metadatos, y una rueda (`wheel`) es un archivo comprimido con lo que se copia al instalar; una rueda de Python puro vale en cualquier plataforma y las que llevan código compilado se publican por plataforma; la guía recomienda subir el paquete fuente y una o más ruedas, incluso en proyectos de Python puro. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): `pip install .` en un entorno virtual temporal y el comando instalado `herramienta version` pasan; el flujo de publicación de ejemplo no se ha ejecutado nunca.
- **Rust:** perfiles de Cargo. Verificado el 2026-10-30 ([perfiles](https://doc.rust-lang.org/cargo/reference/profiles.html), [SemVer](https://doc.rust-lang.org/cargo/reference/semver.html)): `cargo build --release` usa el perfil `release`, cuyos valores por defecto son `lto` en falso (que hace una optimización local ligera), `strip` en ninguno, sin información de depuración y dieciséis unidades de generación de código; `strip`, `lto` y `codegen-units` se pueden fijar; la guía de compatibilidad define qué cambios se consideran compatibles o incompatibles, y para versiones cero los cambios del segundo número se tratan como mayores. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): `cargo build --locked` del esqueleto Rust pasa en Windows; el modo `release` y el flujo de publicación de ejemplo no se han ejecutado. No verificado: las plataformas de destino disponibles para cada versión del compilador.

## ADR de ejemplo
- [Sumas de verificación publicadas por un canal distinto al de los artefactos](../ejemplos-adr-c/sumas-por-canal-aparte.md)
