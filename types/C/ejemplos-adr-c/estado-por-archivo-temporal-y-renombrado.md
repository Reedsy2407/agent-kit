# ADR de ejemplo. Estado guardado por archivo temporal y renombrado

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Una herramienta guarda un índice pequeño que reescribe entero cada vez que cambia. Debe sobrevivir a cortes y a que el proceso termine en cualquier punto, y las versiones nuevas leerán el archivo de las viejas. Ficha: `kit/catalogo-c/persistencia-en-disco.md`.

## Decisión
El archivo lleva una cabecera con un identificador y la versión del formato, y una suma de verificación del contenido. Cada actualización se escribe en un archivo temporal de la misma carpeta, se fuerza a disco y se renombra sobre el final de una sola operación. Antes de reemplazar, se conserva la copia anterior como una copia de su contenido en otro archivo (no con un segundo renombrado, que dejaría una ventana sin archivo final). Al arrancar se valida la cabecera, la versión y la suma; si el archivo falla, se usa la copia anterior y se avisa. Una versión más nueva que la conocida se rechaza sin tocar el archivo.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Escribir directamente sobre el archivo final | Un corte deja un archivo a medias | Estado perdido o ilegible |
| Registro de solo añadir con compactación | Resuelve estados grandes, que no es el caso | Formato y compactación que mantener |
| Base de datos embebida | Una dependencia para un archivo pequeño | Dependencia y su ciclo de vida |
| Sin versión de formato | Cada cambio exigiría adivinar qué versión es | Migraciones frágiles |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Registro de solo añadir | El estado crece o cambia con tanta frecuencia que reescribirlo entero cuesta |
| Forzado a disco de la carpeta contenedora | La plataforma objetivo lo exige para durabilidad tras un corte |
| Migraciones automáticas entre varias versiones | Más de una versión anterior en uso |

## Consecuencias
Un corte deja el estado anterior o el nuevo, nunca uno intermedio. Se comprueba con una prueba que interrumpe la escritura en cada punto y con pruebas de archivo truncado, corrupto y de versión desconocida.

## Señal para revisar
El tamaño del estado hace costosa la reescritura completa, o aparece un segundo proceso que escribe el mismo archivo.
