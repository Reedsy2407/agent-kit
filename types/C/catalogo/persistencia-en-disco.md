# Persistencia en disco: formatos versionados, integridad y recuperación ante cortes

## Problema
Una herramienta que guarda estado en disco (índices, colas, cachés, historiales) se encontrará con cortes de corriente, procesos terminados a mitad de una escritura, discos llenos, archivos editados a mano y versiones nuevas leyendo datos de versiones viejas. Si el formato no se versiona, la escritura no es segura ante cortes o la lectura confía en lo que lee, un fallo se convierte en datos perdidos o en un arranque imposible.

## Señales de que aplica
- El estado sobrevive entre ejecuciones y su pérdida o corrupción cuesta.
- El proceso puede terminar en cualquier momento (señal, corte, error de otro componente).
- El formato evolucionará y habrá versiones distintas leyendo los mismos archivos.
- El archivo puede ser modificado o sustituido por otros procesos o usuarios.

## Señales de que sobra
- El estado se puede reconstruir entero a partir de otra fuente en poco tiempo: una caché desechable no necesita recuperación.
- Hay una base de datos embebida o un servicio que ya ofrece transacciones y versionado: usarla es mejor que reimplementar sus garantías.
- Es un archivo de configuración que solo lee la herramienta (ver la ficha de configuración).

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: escribir directamente sobre el archivo final | Ninguno; un corte deja un archivo a medias | Estado desechable |
| Escribir en un archivo temporal de la misma carpeta, forzar a disco y renombrar sobre el final | Bajo-medio: cuidar la plataforma | Archivos pequeños que se reescriben enteros |
| Registro de solo añadir con sumas de verificación por entrada y compactación | Medio-alto | Estado que crece o se actualiza con frecuencia |
| Lo anterior más cabecera con versión del formato y migraciones | Medio | Formato que evolucionará |
| Base de datos embebida con transacciones | Medio: dependencia | Cuando hay consultas o actualizaciones parciales |

## Cómo se comprueba
- Una prueba de corte simulado: se interrumpe la escritura en cada punto y el siguiente arranque encuentra el estado anterior completo o el nuevo completo, nunca uno intermedio.
- Una prueba de archivo corrupto, truncado o vacío: se detecta por la suma de verificación o la cabecera, se informa y se recupera de la última copia buena o se parte de cero con aviso, sin colgarse ni borrar en silencio.
- Una prueba de versión desconocida (más nueva): se rechaza con un mensaje claro y sin modificar el archivo.
- Una prueba de migración desde cada versión anterior soportada.
- Una prueba de disco lleno o de permisos denegados: el error se informa y el archivo bueno anterior sigue intacto.
- Una prueba de que un archivo con tamaño o campos absurdos se rechaza antes de reservar memoria (es entrada no confiable).

## Cómo suele resolverse
El archivo empieza por una cabecera con un identificador y la versión del formato. Las actualizaciones se escriben en un archivo temporal en la misma carpeta, se vacían los búferes y se fuerzan a disco, y se renombra sobre el archivo final de una sola operación; en POSIX, la durabilidad tras un corte puede exigir forzar también la carpeta que contiene el archivo (su equivalente en Windows no está verificado). Cada registro o el archivo entero lleva una suma de verificación. Al leer se valida todo antes de usarlo, con límites de tamaño. Se conserva la copia anterior hasta confirmar la nueva y existe un camino explícito para recuperarse o empezar de cero. Las migraciones son funciones puras de una versión a la siguiente.

## Anti-patrones frecuentes
- Truncar el archivo final y escribir encima: un corte deja la nada.
- Renombrar sin forzar antes la escritura a disco, o desde otra unidad de almacenamiento donde el renombrado no es atómico.
- Confiar en que el sistema operativo ya ordenó las escrituras.
- Un formato sin versión: cada cambio exige adivinar qué versión es.
- Cargar el archivo entero en memoria porque «el tamaño siempre es pequeño».
- Borrar el archivo malo antes de tener uno bueno.
- Registrar el contenido del estado, secretos incluidos, al informar un error de lectura.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** el paquete `os`. Verificado el 2026-10-30 ([os](https://pkg.go.dev/os)): `Rename` reemplaza el destino si existe y no es una carpeta, y fuera de Unix no es una operación atómica; `File.Sync` confirma el contenido actual en almacenamiento estable; `CreateTemp` crea el archivo con permisos restrictivos antes de aplicar la máscara de creación y quien lo crea debe borrarlo. No verificado: el forzado a disco de la carpeta que contiene el archivo.
- **Python:** el módulo `os`. Verificado el 2026-10-30 ([os](https://docs.python.org/3/library/os.html)): `os.replace` es atómico si tiene éxito (lo exige POSIX), reemplaza el destino si es un archivo y puede fallar entre sistemas de archivos distintos; `os.rename` en Windows lanza un error si el destino existe; `os.fsync` fuerza el descriptor a disco, usa `fsync()` en Unix y `_commit()` en Windows, y la documentación recomienda vaciar antes el objeto de archivo con `flush`. No verificado: el comportamiento exacto de `os.replace` en Windows cuando el destino existe.
- **Rust:** `std::fs`. Verificado el 2026-10-30 ([rename](https://doc.rust-lang.org/std/fs/fn.rename.html), [File](https://doc.rust-lang.org/std/fs/struct.File.html)): `rename` reemplaza el destino si existe, usa `MoveFileExW` en Windows, no funciona entre puntos de montaje distintos y su comportamiento puede cambiar en el futuro; `sync_all` sincroniza contenido y metadatos a disco, `sync_data` puede no sincronizar los metadatos, y soltar un `File` ignora los errores de cierre; `File` no usa búfer y `flush` no hace nada en Unix ni en Windows. No verificado: el forzado a disco de la carpeta que contiene el archivo.

## ADR de ejemplo
- [Estado guardado por archivo temporal y renombrado](../ejemplos-adr-c/estado-por-archivo-temporal-y-renombrado.md)
