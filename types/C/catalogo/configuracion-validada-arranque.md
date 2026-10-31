# Configuración validada al arrancar y protección de su archivo

## Problema
Una herramienta que se configura con un archivo falla de formas costosas si acepta configuración inválida: se comporta distinto de lo que se pretendía, falla horas después o se queda a medias. Además, el propio archivo es un recurso sensible: si otro usuario puede modificarlo, puede cambiar lo que hace la herramienta, y si guarda un secreto, quien pueda leerlo lo obtiene.

## Señales de que aplica
- La herramienta se configura con un archivo (o variables) que escribe una persona u otra herramienta.
- Corre con más privilegios que quien edita la configuración, o en un equipo compartido.
- Guarda secretos o rutas que gobiernan qué ejecuta o a qué se conecta.

## Señales de que sobra
- Toda la configuración llega como argumentos de una ejecución corta y se valida en el analizador de argumentos.
- Solo hay valores sin consecuencias y un valor por defecto sensato para cada uno.
- El archivo es del propio usuario y nada privilegiado lo lee (aun así, validar al arrancar sigue siendo barato).

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: leer lo que haya y usar valores por defecto | Ninguno; fallos tardíos y silenciosos | Prototipo desechable |
| Validar todo al arrancar y fallar pronto con un mensaje claro | Bajo | Casi siempre, desde la primera versión |
| Lo anterior más rechazo de claves desconocidas o repetidas y límite de tamaño del archivo | Bajo | Archivos editados a mano |
| Lo anterior más comprobación de permisos del archivo | Bajo-medio: depende del sistema operativo | Archivos con secretos o gobernados por un usuario distinto |
| Secretos fuera del archivo (variable de entorno o almacén del sistema) | Medio | Cuando el archivo se versiona o se comparte |

## Cómo se comprueba
- Una prueba por cada regla de validación: rango, formato, obligatoriedad, clave desconocida, clave repetida, línea mal formada; el mensaje dice dónde y qué, sin repetir valores secretos.
- Una prueba del tamaño máximo: un archivo enorme se rechaza sin leerlo entero.
- Una prueba de que el fallo ocurre antes de cualquier efecto: nada se abre, nada se escribe.
- Una prueba de permisos donde el sistema los expone: un archivo escribible por otros se rechaza, y uno con secreto legible por otros también; donde no se pueden comprobar, la limitación está declarada y probada como tal.
- Una prueba de que el valor de un secreto no aparece ni en el mensaje de error ni en el registro ni en la salida de comprobación.
- Una prueba de que una comprobación de configuración sin ejecutar la herramienta existe y devuelve el mismo veredicto que el arranque.

## Cómo suele resolverse
Se define un formato pequeño y estricto (o se usa uno estándar con un esquema), se carga a una estructura tipada y se valida entera antes de que arranque nada. Cada error nombra la línea y la regla incumplida sin eco de valores sensibles. El archivo se abre una sola vez, se comprueba sobre el descriptor ya abierto que es un archivo regular, que no supera el tamaño máximo y que sus permisos son los esperados, y solo entonces se lee. Un subcomando de comprobación ejecuta la misma validación sin arrancar el trabajo, y muestra los secretos como «definido» o «ausente».

## Anti-patrones frecuentes
- Ignorar en silencio claves desconocidas: un error tipográfico se convierte en un valor por defecto.
- Aceptar claves repetidas y quedarse con la última.
- Comprobar los permisos por ruta y luego abrir el archivo: entre ambos pasos puede cambiar. Corrección: comprobar sobre el archivo ya abierto.
- Mostrar la configuración completa en el registro o en la ayuda de depuración.
- Valores por defecto para secretos: la herramienta arranca «funcionando» sin protección. Corrección: falta el secreto, no arranca.
- Suponer que los bits de permisos significan lo mismo en todos los sistemas operativos.
- Leer el archivo sin límite de tamaño.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** el paquete `os`. Verificado el 2026-10-30 ([os](https://pkg.go.dev/os)): en Windows `Chmod` solo usa el bit de escritura del propietario, que controla el atributo de solo lectura, y el resto no se usa; `OpenFile` con `O_EXCL` junto a `O_CREATE` exige que el archivo no exista, y el modo de permisos solo se aplica al crear el archivo, antes de aplicar la máscara de creación. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el esqueleto Go valida al arrancar y comprueba permisos donde el sistema los expone; las pruebas de permisos se omiten en Windows; las pruebas del esqueleto pasaron en Ubuntu y macOS en la integración continua del 2026-10-30.
- **Python:** el módulo `os`. Verificado el 2026-10-30 ([os](https://docs.python.org/3/library/os.html)): en Windows `chmod` solo puede cambiar el indicador de solo lectura y el resto de los bits se ignora; `os.open` aplica la máscara de creación al modo. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el esqueleto Python valida al arrancar y sus pruebas de permisos se omiten en Windows; las pruebas del esqueleto pasaron en Ubuntu y macOS en la integración continua del 2026-10-30.
- **Rust:** `std::os::unix::fs::PermissionsExt`. Verificado el 2026-10-30 ([PermissionsExt](https://doc.rust-lang.org/std/os/unix/fs/trait.PermissionsExt.html)): el rasgo existe solo en Unix y da acceso a los bits de permisos con `mode`, `set_mode` y `from_mode`. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el esqueleto Rust valida al arrancar; el código de permisos para POSIX no se compiló en la máquina de verificación, pero compiló y pasó sus pruebas en Ubuntu y macOS en la integración continua del 2026-10-30.

## ADR de ejemplo
- Ninguno todavía.
