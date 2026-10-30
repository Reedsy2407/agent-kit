# Registro estructurado con rotación y sin datos sensibles

## Problema
El registro es la única ventana a una herramienta que corre sin nadie mirándola. Si está en texto libre, no se puede filtrar ni analizar por máquina; si no rota, llena el disco; si no controla lo que escribe, filtra secretos y datos personales a un archivo que mucha gente puede leer; si es demasiado ruidoso, esconde lo importante. Un buen registro dice qué pasó, cuándo y con qué contexto, y deja fuera lo que nunca debe salir.

## Señales de que aplica
- La herramienta corre de forma desatendida (daemon, tarea programada, servicio).
- Quien diagnostica no es quien la escribió y no puede reproducir el problema.
- Maneja secretos, datos personales o rutas del usuario que no deben quedar escritos.
- Los registros los recogen otras herramientas.

## Señales de que sobra
- Es una herramienta interactiva de ejecución corta: los mensajes a la salida de error ya son el registro.
- Un supervisor del sistema ya recoge, rota y conserva la salida estándar: la herramienta solo debe escribir líneas bien formadas.
- Es un prototipo cuyo único lector es quien lo escribe.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: mensajes de texto a la salida de error | Ninguno; difícil de filtrar, sin niveles | Herramienta interactiva |
| Una línea estructurada por evento (hora, nivel, mensaje y campos) a la salida de error | Bajo | Casi siempre |
| Lo anterior más niveles configurables y una lista de campos que nunca se escriben | Bajo-medio | Herramientas que manejan secretos |
| Lo anterior más archivo propio con rotación por tamaño o por tiempo y conservación acotada | Medio: plataformas, cierre y reapertura | Cuando no hay supervisor que recoja la salida |
| Envío a un recolector externo | Medio-alto | Muchos equipos o muchas herramientas |

## Cómo se comprueba
- Una prueba de formato: cada línea es un único objeto válido con los campos obligatorios, incluso con mensajes que contienen saltos de línea o comillas.
- Una prueba de niveles: lo que está por debajo del nivel configurado no se escribe.
- Una prueba de datos sensibles: ningún secreto, token ni dato personal declarado aparece en el registro, tampoco dentro de errores envueltos o de estructuras volcadas.
- Una prueba de rotación: al superar el límite se crea un archivo nuevo, se conservan solo los últimos y no se pierde ningún evento en el cambio.
- Una prueba de disco lleno o de archivo no escribible: la herramienta lo informa y sigue funcionando.
- Una prueba de concurrencia: eventos simultáneos no se mezclan dentro de una misma línea.
- Una prueba de que el registro de depuración no se activa sin pedirlo.

## Cómo suele resolverse
Se registra un evento por línea en un formato estructurado, con hora en una zona única, nivel, mensaje corto y campos con nombre estable. Los eventos tienen nombres estables que otras herramientas pueden buscar. Los valores sensibles se declaran una vez y se omiten o enmascaran en un único punto del registro, no en cada llamada. Si hay archivo, se escribe en una carpeta con permisos restringidos y se rota por tamaño o tiempo con un número acotado de copias; si hay supervisor, se escribe a la salida estándar y se deja la rotación a quien la recoge. Los errores se registran con su causa encadenada y sin volcar estructuras enteras.

## Anti-patrones frecuentes
- Volcar objetos completos (configuración, peticiones) al registro.
- Texto libre con datos incrustados que obliga a analizarlo con expresiones frágiles.
- Un registro sin rotación en una máquina de otra persona.
- Cada módulo con su propio formato.
- Registrar a nivel de depuración por defecto.
- Rotar el archivo sin avisar a quien lo tiene abierto.
- Poner secretos en los mensajes de error de las bibliotecas y registrarlos tal cual.
- Hora local sin zona.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** `log/slog`. Verificado el 2026-10-30 ([log/slog](https://pkg.go.dev/log/slog)): `NewJSONHandler` escribe JSON delimitado por líneas en un `io.Writer`; `Level` fija el nivel mínimo (por defecto, información) y puede cambiar en ejecución con `LevelVar`; `ReplaceAttr` se ejecuta sobre cada atributo antes de registrarlo y puede renombrar claves, convertir valores, sanear datos personales o eliminar atributos; un `LogValuer` puede ocultar secretos. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el esqueleto Go escribe una línea JSON por evento con hora, nivel y mensaje, y sus pruebas comprueban que el token no sale en el registro. No verificado: la rotación de archivos, que la biblioteca estándar no trae.
- **Python:** `logging` y `logging.handlers`. Verificado el 2026-10-30 ([logging.handlers](https://docs.python.org/3/library/logging.handlers.html)): `RotatingFileHandler` rota por tamaño con `maxBytes` y `backupCount` y no rota si alguno es cero; `TimedRotatingFileHandler` rota por tiempo; `WatchedFileHandler` reabre el archivo si otro programa lo movió, está pensado para Unix y no es apropiado en Windows, donde un archivo abierto no se puede mover. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el esqueleto Python escribe una línea JSON por evento con un formateador propio y sus pruebas comprueban que el token no sale en el registro. No verificado: la seguridad entre hilos y entre procesos de los manejadores (la fuente consultada no la trata).
- **Rust:** la biblioteca estándar no trae registro. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el esqueleto Rust escribe a mano una línea JSON por evento con la hora calculada sin dependencias, y sus pruebas comprueban el formato y que el token no sale en el registro. No verificado: bibliotecas de terceros para registro y para rotación.

Aclaración sobre los esqueletos: ninguno implementa un punto único de enmascarado; evitan el secreto porque nunca lo pasan al registro (solo registran que el token está definido). Un proyecto con más campos sensibles necesita ese punto único.

## ADR de ejemplo
- Ninguno todavía.
