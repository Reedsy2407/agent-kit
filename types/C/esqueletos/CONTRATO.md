# Contrato común de los esqueletos del tipo C

Go, Python y Rust implementan **el mismo comportamiento** con el idioma de cada uno (ADR 0019). Esta página es la única fuente de verdad: los README de cada esqueleto la citan y no la repiten. Solo biblioteca estándar en tiempo de ejecución (cero dependencias de producción). El nombre `herramienta` y el prefijo `ejemplo.invalid` son marcadores: cámbialos al adoptar el esqueleto.

## Línea de órdenes
```
herramienta version [--json]
herramienta check-config --config RUTA [--json]
herramienta run --config RUTA [--once] [--json]
herramienta --help | -h
```
- Solo la forma `--config RUTA` (valor separado) es parte del contrato: el analizador de cada lenguaje puede aceptar además otras (por ejemplo `--config=RUTA` en Go), que no conviene usar. El orden de las claves del JSON y el escapado opcional de `<`, `>` y `&` tampoco son parte del contrato.
- Los resultados van a **stdout**; los diagnósticos y el registro, a **stderr**. `--json` cambia stdout a un objeto JSON en una línea; stderr no cambia.
- `run` es el modo daemon: repite el trabajo cada `intervalo_ms` hasta recibir SIGINT o SIGTERM (en Windows, Ctrl+C o Ctrl+Break). Con `--once` hace una sola vuelta y termina.
- Al terminar `run` imprime un resumen: texto `ticks=N errores=E bytes=B lineas=L`, o JSON `{"ticks":N,"errores":E,"bytes":B,"lineas":L}`.
- `version`: texto `herramienta 0.1.0`; JSON `{"nombre":"herramienta","version":"0.1.0"}`.
- `check-config`: texto `configuracion valida` y una línea `clave=valor` por clave (el token se muestra como `token=<definido>`); JSON `{"valida":true,"config":{...}}` con `"token":"definido"` o `"token":"ausente"` (en texto la línea `token=` solo aparece si está definido). Si es inválida no imprime nada en stdout y el motivo va a stderr.

## Códigos de salida
| Código | Significado |
|---|---|
| 0 | Éxito (incluye el apagado ordenado por señal) |
| 1 | Error inesperado de ejecución (incluye una entrada que no se puede abrir) |
| 2 | Uso incorrecto: subcomando u opción desconocidos, falta `--config` |
| 3 | Configuración inválida (sintaxis, valores, permisos del archivo) |
| 4 | Entrada rechazada en `run --once`: solo «demasiado grande» o «sin respuesta a tiempo» |

En modo daemon un error de trabajo (por ejemplo, de entrada) no mata el proceso: se registra una sola vez como `trabajo_fallido` (`warn`) y se cuenta en `errores`.

## Configuración
Archivo de texto `clave=valor` (una por línea; líneas en blanco y `#` ignoradas; sin comillas). Se lee con un máximo de 64 KiB y debe ser UTF-8 válido (si no, error de configuración). Claves desconocidas, repetidas o líneas sin `=` son error. Falla pronto, con el número de línea.

| Clave | Obligatoria | Valores | Por defecto |
|---|---|---|---|
| `nombre` | sí | `[a-z0-9][a-z0-9_-]{0,63}` | — |
| `intervalo_ms` | no | entero de 10 a 3600000 | 1000 |
| `max_entrada_bytes` | no | entero de 1 a 1048576 | 65536 |
| `timeout_entrada_ms` | no | entero de 10 a 60000 | 2000 |
| `entrada` | no | ruta de un archivo | ninguna |
| `nivel_log` | no | `debug`, `info`, `warn`, `error` | `info` |
| `token` | no | cadena no vacía (**secreto**) | ninguno |

**Permisos** (donde el sistema operativo los expone; en Windows no se comprueban y se declara): si el archivo es escribible por grupo u otros (`modo & 0o022`) es error; si define `token` y es legible por grupo u otros (`modo & 0o044`) es error. Se recomienda `chmod 600`.

## Entrada no confiable
Si hay `entrada`, cada vuelta abre ese archivo y lee **como máximo** `max_entrada_bytes` (+1 para detectar el exceso) en otro hilo, con plazo `timeout_entrada_ms`. Más grande: «entrada demasiado grande». Sin terminar a tiempo: «entrada sin respuesta». El resultado es `bytes` y `lineas` (saltos de línea, más una si el final no termina en salto).

## Registro
Una línea JSON por evento en stderr: `{"ts":"<RFC 3339 UTC con milisegundos>","nivel":"info","msg":"...", ...campos}`. Eventos: `inicio` (nombre, intervalo_ms, token_definido), `tick` (nivel debug; n), `trabajo_fallido` (warn; n y error), `apagado` (señal recibida), `fin` (ticks, errores). **Nunca** se registra el valor del token ni la configuración completa.

## Apagado ordenado
Al recibir la señal: no se inicia otro trabajo, **se termina el que está en curso** (drenar), se registra `apagado` y `fin`, se imprime el resumen y se sale con 0. La espera entre vueltas se interrumpe de inmediato.

## Pruebas que debe tener cada esqueleto
1. Unitarias: configuración (válida, cada error, permisos donde aplica), entrada (límite, plazo) y registro (formato, sin secretos).
2. Una tabla de casos para el contrato del CLI (argumentos → código de salida, stdout y stderr).
3. Una prueba de apagado ordenado: se pide parar mientras el trabajo está en curso y se comprueba que termina, que no empieza otro y que el resumen es coherente.
