# Recarga de configuración en caliente

## Problema
Un proceso de larga vida lee su configuración al arrancar. Cambiarla exige reiniciarlo, y reiniciar interrumpe lo que está haciendo. Recargarla mientras corre evita la interrupción, pero introduce un riesgo nuevo: aplicar una configuración a medias, inválida o distinta según la parte del programa que la lea.

## Señales de que aplica
- El proceso mantiene conexiones, sesiones o trabajo en curso que un reinicio cortaría.
- La configuración cambia con frecuencia o la cambia otra herramienta (un orquestador, un instalador, una persona sin acceso al proceso).
- Reiniciar tiene un costo medible: calentamiento, reconexiones, estado en memoria.

## Señales de que sobra
- La configuración cambia pocas veces y reiniciar es barato y sin consecuencias: reiniciar es la recarga más simple y más fácil de razonar.
- Es una herramienta de ejecución corta (una orden que se lanza y termina): cada ejecución ya lee la configuración vigente.
- Nadie puede distinguir hoy una configuración recargada de una reiniciada.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: reiniciar para aplicar cambios | Ninguno de código; una interrupción por cambio | Daemon con arranque rápido y sin estado que perder |
| Recargar al recibir una señal de recarga | Bajo: un manejador y una función de carga | Sistemas de tipo POSIX; no existe en todos los sistemas |
| Vigilar el archivo y recargar al detectar el cambio | Medio: eventos duplicados, escrituras a medias, rutas sustituidas | Cuando la señal no es viable o quien edita no puede enviarla |
| Subcomando o canal de control que ordena recargar | Medio: exige un canal de control con sus permisos (ver la ficha de control local) | Cuando hay que saber si la recarga tuvo éxito |

## Cómo se comprueba
- Una prueba de configuración inválida: se rechaza entera, el proceso conserva la configuración anterior y lo registra.
- Una prueba de atomicidad: quien lee durante la recarga ve la configuración vieja completa o la nueva completa, nunca una mezcla.
- Una prueba de qué se aplica y qué no: lo que no se puede cambiar en caliente (un puerto ya abierto, por ejemplo) se avisa, no se ignora en silencio.
- Una prueba de recargas repetidas y seguidas: no se acumulan recursos ni se pierde ninguna.
- Una prueba de que el valor de un secreto no aparece en el registro de la recarga.

## Cómo suele resolverse
Se carga y valida la configuración nueva en una estructura aparte, completa, antes de tocar nada. Solo si es válida se sustituye de una vez la referencia compartida que leen los demás componentes, de modo que cada lectura ve un estado consistente. El resultado de cada recarga (aplicada o rechazada y por qué) se registra y, si hay canal de control, se devuelve a quien la pidió. Lo que no admite cambio en caliente se declara en la documentación y se detecta al comparar la configuración nueva con la vigente.

## Anti-patrones frecuentes
- Modificar la configuración vigente campo a campo mientras otros la leen. Corrección: construir la nueva y sustituirla entera.
- Recargar sin validar y dejar el proceso con una configuración rota. Corrección: validar antes de aplicar y conservar la anterior ante cualquier error.
- Vigilar un archivo y reaccionar a cada evento: un editor que guarda genera varios. Corrección: agrupar los eventos con una pequeña espera.
- Una recarga que cierra y reabre lo que está en uso sin avisar a quien lo usa.
- Registrar la configuración completa al recargar, secretos incluidos.
- Dar por hecho que la señal de recarga existe en todos los sistemas operativos.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** `os/signal` permite recibir la señal de recarga por un canal. Verificado el 2026-10-30 ([os/signal](https://pkg.go.dev/os/signal)): por defecto un programa de Go termina al recibir SIGHUP, SIGINT o SIGTERM, así que hay que pedir esa señal con `Notify` para que no lo mate. En Windows, la fuente dice que Ctrl-C y Ctrl-Break se entregan como `os.Interrupt` y que los cierres de consola, de sesión o del sistema se entregan como `syscall.SIGTERM`. No verificado: que Windows no tenga un equivalente de SIGHUP; si no lo tiene, allí la recarga necesita otro mecanismo. La sustitución atómica de la configuración se puede hacer con `sync/atomic` (`atomic.Pointer`): No verificado en la fuente oficial en esta fecha.
- **Python:** `signal.signal` registra el manejador. Verificado el 2026-10-30 ([signal](https://docs.python.org/3/library/signal.html)): los manejadores se ejecutan siempre en el hilo principal y solo el hilo principal puede registrarlos; SIGHUP figura como disponible solo en Unix. Conviene que el manejador solo marque un evento y que la recarga ocurra en el bucle principal. No verificado: bibliotecas de vigilancia de archivos (son de terceros).
- **Rust:** la biblioteca estándar no trae manejo de señales. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el esqueleto Rust instala su manejador de apagado con dos funciones del sistema declaradas a mano; la recarga con SIGHUP seguiría el mismo camino en POSIX y no se ha probado. La sustitución atómica de la configuración se puede hacer con `Arc` y un candado de lectura y escritura de la biblioteca estándar: No verificado en la fuente oficial en esta fecha.

## ADR de ejemplo
- Ninguno todavía.
