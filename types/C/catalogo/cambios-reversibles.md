# Cambios reversibles: instantáneas y deshacer o rehacer en herramientas automáticas

## Problema
Una herramienta que modifica archivos, nombres, configuraciones o datos de forma automática (organizar, renombrar, migrar, limpiar, sincronizar) se equivoca a veces, o cumple lo que se le pidió pero no lo que se quería. Si no hay manera de volver atrás, el error es del usuario y es definitivo. La reversibilidad no es un lujo de interfaz: es lo que permite que alguien confíe lo bastante en la herramienta para ejecutarla sobre datos reales.

## Señales de que aplica
- La herramienta cambia o borra datos que su usuario no puede reconstruir fácilmente.
- Actúa sobre muchos elementos de una vez, de modo que revisar uno a uno no es realista.
- Se ejecuta de forma automática o programada, sin nadie mirando.
- El usuario tiene que confiar en ella antes de haberla visto equivocarse.

## Señales de que sobra
- La herramienta solo lee o solo genera archivos nuevos en un lugar propio, sin tocar los existentes.
- Los datos que modifica ya se versionan o se respaldan por otro medio y restaurarlos es sencillo.
- Cada operación es trivial de invertir y la inversa se puede calcular sin guardar nada.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: aplicar y confiar en copias de seguridad externas | Ninguno; la herramienta no ayuda a volver | Herramienta de lectura o de generación |
| Modo de simulación que muestra lo que haría sin hacerlo | Bajo | Siempre que haya cambios en bloque |
| Copia previa de lo que se va a modificar en un lugar conocido | Medio: espacio y limpieza | Cambios de pocos archivos o pequeños |
| Registro de operaciones con su inversa, para deshacer y rehacer | Medio-alto: orden, fallos a medias, conflictos | Herramientas con muchas operaciones pequeñas |
| Instantáneas del sistema de archivos o de la base de datos antes de cambiar | Alto o dependiente de la plataforma | Cambios grandes y estructurales |

## Cómo se comprueba
- Una prueba de simulación: no cambia nada y muestra el mismo plan que luego se ejecuta.
- Una prueba de ida y vuelta: aplicar y deshacer deja los datos idénticos (contenido y, donde se promete, permisos y fechas).
- Una prueba de deshacer parcial: tras un fallo a mitad de la operación, el registro permite volver al estado anterior.
- Una prueba de cambios posteriores: si el usuario modificó algo después de la operación, deshacer lo detecta y avisa en lugar de pisarlo.
- Una prueba de rehacer tras deshacer, y de que una operación nueva descarta lo que ya no se puede rehacer.
- Una prueba de límites: el espacio usado por copias e historial está acotado y la limpieza no borra lo que aún permite deshacer.
- Una prueba de que lo que no se puede revertir (envíos, borrados definitivos) está identificado y pide confirmación.

## Cómo suele resolverse
Se separa planificar de aplicar: primero se calcula la lista de cambios, se muestra y solo entonces se ejecuta. Antes de modificar, se guarda lo necesario para invertir cada operación (la copia del contenido anterior o el nombre previo) y se registra cada paso en un diario que sobrevive a un corte. Deshacer recorre el diario en orden inverso y comprueba, antes de cada paso, que el estado actual es el que la operación dejó; si no lo es, se detiene y lo dice. Las copias tienen un límite de espacio y de antigüedad. Lo irreversible por naturaleza se marca y se separa del resto.

## Anti-patrones frecuentes
- Prometer «deshacer» y que solo funcione para algunos tipos de cambio sin decirlo.
- Guardar la copia en el mismo lugar que el original y borrarla con la limpieza normal.
- Un diario que no sobrevive a un corte, de modo que justo la operación interrumpida no se puede revertir.
- Deshacer sin comprobar el estado actual y pisar el trabajo del usuario.
- Copias sin límite de espacio.
- Perder metadatos (permisos, fechas, propietario) al copiar y devolver un archivo que no es el original.
- Aplicar en bloque sin simulación.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** `io/fs`. Verificado el 2026-10-30 ([io/fs](https://pkg.go.dev/io/fs)): `WalkDir` recorre un árbol en orden léxico, no sigue los enlaces simbólicos que encuentra dentro de los directorios (si la raíz misma es un enlace, recorre su destino) y lee un directorio entero en memoria antes de recorrerlo; `fs.FileMode` lleva los bits de permisos. La fuente no trata la copia de archivos. No verificado: una utilidad de copia de árboles con metadatos en la biblioteca estándar.
- **Python:** `shutil`. Verificado el 2026-10-30 ([shutil](https://docs.python.org/3/library/shutil.html)): `copy` copia datos y modo de permisos; `copy2` intenta conservar además los metadatos; `copytree` copia un árbol entero y falla por defecto si el destino ya existe; ni `copy` ni `copy2` conservan todos los metadatos: en POSIX se pierden el propietario, el grupo y las ACL, y en Windows los propietarios, las ACL y los flujos de datos alternativos.
- **Rust:** `std::fs::copy`. Verificado el 2026-10-30 ([fs::copy](https://doc.rust-lang.org/std/fs/fn.copy.html)): copia el contenido y los bits de permisos, sobrescribe el destino, falla si el origen no es un archivo regular o si falta la carpeta del destino, y en Windows copia también los flujos alternativos de NTFS. No verificado: una copia recursiva de árboles en la biblioteca estándar.

## ADR de ejemplo
- Ninguno todavía.
