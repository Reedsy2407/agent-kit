# Contrato de un CLI: comandos, códigos de salida y salida para máquinas

## Problema
Una herramienta de línea de órdenes se usa a mano y, tarde o temprano, desde scripts, integración continua y otras herramientas. Lo que esos usos necesitan no es lo que se ve en pantalla, sino un contrato estable: qué subcomandos hay, qué significa cada código de salida, qué va a la salida normal y qué a la de diagnóstico, y cómo obtener un resultado que una máquina pueda leer sin adivinar.

## Señales de que aplica
- La herramienta tiene más de un subcomando o más de un modo de uso.
- Otros programas la invocan y deciden por su código de salida o por lo que imprime.
- Hay versiones distintas en uso y cambiar la salida rompería a alguien.

## Señales de que sobra
- Es un guion personal de una sola acción que nadie más invoca: un código de salida de éxito o fallo y un mensaje claro bastan.
- Se va a reescribir antes de que nadie dependa de ella.
- La interfaz real es una librería y la línea de órdenes es solo una demostración.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: éxito o fallo y texto libre | Ninguno; cualquier cambio de texto rompe a quien lo analiza | Guion personal |
| Códigos de salida documentados y diagnósticos separados de los resultados | Bajo | Cualquier herramienta que se invoque desde otras |
| Lo anterior más una opción de salida legible por máquinas | Bajo-medio: dos formatos que mantener | Cuando se consume el resultado |
| Lo anterior más versionado del formato y política de compatibilidad | Medio | Herramienta con usuarios que no controlas |

## Cómo se comprueba
- Una tabla de casos: argumentos, código de salida esperado, qué sale por la salida normal y qué por la de diagnóstico, incluidos los usos incorrectos.
- Una prueba de que un uso incorrecto no imprime resultados y termina con el código de uso.
- Una prueba de que la salida para máquinas es siempre un solo formato válido, incluso con errores parciales, y que no cambia de campos sin aviso.
- Una prueba de que ningún secreto aparece en ninguna de las dos salidas.
- Una prueba de que una opción desconocida o repetida se rechaza y no se ignora en silencio.
- Una prueba de ayuda y versión: existen, son estables y salen con éxito.

## Cómo suele resolverse
Se fija, antes de escribir código, una tabla corta de códigos (éxito, error inesperado, uso incorrecto, configuración inválida, entrada rechazada) y se documenta junto a los subcomandos. Los resultados van a la salida normal y todo diagnóstico, registro o aviso a la de error, para que una tubería no mezcle ambos. La opción para máquinas cambia solo el formato de la salida normal. El analizador de argumentos rechaza lo desconocido con el código de uso. La tabla de casos del contrato se ejecuta contra el binario real y es la única fuente de verdad del comportamiento, también si hay varias implementaciones.

## Anti-patrones frecuentes
- Mezclar mensajes de progreso con resultados en la misma salida.
- Salir con éxito tras un error «para no romper el script».
- Códigos de salida distintos para cada error posible: nadie puede mantener la tabla. Corrección: pocas clases con significado estable.
- Cambiar el texto de la salida legible y descubrir que alguien lo analizaba. Corrección: la salida para máquinas es el contrato; la legible puede cambiar.
- Aceptar opciones desconocidas o abreviaturas ambiguas.
- Pedir secretos como argumentos de la línea de órdenes, visibles para otros procesos.
- Depender del terminal (colores, ancho) sin detectar que la salida no es interactiva.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** el paquete `flag`. Verificado el 2026-10-30 ([flag](https://pkg.go.dev/flag)): acepta `-flag`, `--flag`, `-flag=x` y `-flag x` (esta última no para las booleanas), con uno o dos guiones equivalentes; con `ExitOnError` un error de análisis sale con el código dos y la salida de uso y errores va por defecto a la salida de error. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el verificador ejecuta contra el binario del esqueleto Go trece casos del contrato con su código de salida, y el esqueleto devuelve los códigos documentados; el contrato de los esqueletos solo fija la forma `--config RUTA` y declara el resto fuera del contrato.
- **Python:** el módulo `argparse`. Verificado el 2026-10-30 ([argparse](https://docs.python.org/3/library/argparse.html)): ante una lista de argumentos inválida imprime el mensaje en la salida de error y sale con el código dos; `exit_on_error=False` permite capturar el error; `add_subparsers` crea subcomandos y `required=True` los hace obligatorios. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el esqueleto Python usa un analizador mínimo propio y los trece casos del contrato pasan.
- **Rust:** `std::process::ExitCode`. Verificado el 2026-10-30 ([ExitCode](https://doc.rust-lang.org/std/process/struct.ExitCode.html)): `ExitCode::from` construye un código desde un entero pequeño, y los valores numéricos no tienen un significado portable entre plataformas. No verificado: la biblioteca estándar no trae un analizador de argumentos con subcomandos, así que se escribe a mano o se añade una biblioteca de terceros. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el esqueleto Rust usa un analizador mínimo propio y los trece casos del contrato pasan.

## ADR de ejemplo
- [Pocos códigos de salida documentados y salida opcional para máquinas](../ejemplos-adr-c/codigos-de-salida-y-salida-json.md)
