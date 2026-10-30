# Apagado ordenado: drenar antes de salir

## Problema
Un proceso que recibe la orden de terminar (del usuario, del sistema o de un supervisor) puede estar a mitad de un trabajo: una escritura a medias, una respuesta sin enviar, un hijo sin recoger. Salir de golpe deja datos a medias; esperar sin límite deja un proceso que no hay manera de parar. El apagado ordenado es el contrato intermedio: dejar de aceptar trabajo nuevo, terminar el que está en curso dentro de un plazo y salir con un código que lo cuente.

## Señales de que aplica
- El proceso escribe en disco, en red o en un hijo, y una interrupción deja el resultado en un estado inconsistente.
- Corre como servicio o bajo un supervisor que envía una petición de terminar antes de forzar.
- Hay trabajo en curso que tarda más que un parpadeo.

## Señales de que sobra
- La herramienta es de ejecución corta y no deja estado a medias: la interrupción por defecto es aceptable.
- Todo el trabajo es idempotente y se puede repetir entero sin daño.
- Nadie envía nunca una señal de terminar: solo se mata el proceso (en ese caso el problema real es otro, ver la ficha de persistencia en disco).

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: dejar el comportamiento por defecto del sistema | Ninguno; estados a medias posibles | Herramienta efímera y sin estado |
| Marcar «parando» al recibir la señal, no empezar trabajo y salir al terminar el actual | Bajo | Casi siempre, desde la primera versión del daemon |
| Lo anterior más un plazo máximo tras el cual se fuerza | Medio: plazo, registro de lo que quedó sin terminar | Trabajo que puede colgarse |
| Cola persistente de trabajo para reanudar tras una salida forzada | Alto | Cuando perder el trabajo en curso es inaceptable |

## Cómo se comprueba
- Una prueba que pide parar con un trabajo a medias: el trabajo termina, no empieza otro y el resumen es coherente.
- Una prueba de que la espera entre vueltas se interrumpe de inmediato y no hay que esperar el intervalo entero.
- Una prueba del plazo: un trabajo que no acaba se fuerza pasado el plazo y la salida lo dice.
- Una prueba de la segunda señal: quien insiste obtiene una salida inmediata, o al menos no queda bloqueado.
- Una prueba de salida: código de éxito tras un apagado pedido, registro de que se pidió y de que se terminó, y ningún recurso (archivo, hijo, conexión) sin cerrar.
- Una prueba de punta a punta con la señal real en cada sistema operativo que se declare; la parte de la lógica se prueba aparte, sin señales.

## Cómo suele resolverse
La señal solo activa una bandera o cancela un contexto; no hace trabajo. El bucle principal la consulta entre unidades de trabajo y en las esperas, de modo que la espera larga se corta al instante. El trabajo en curso no recibe la cancelación: se le deja acabar, con un plazo propio si puede colgarse; el plazo se hace cumplir abandonando ese trabajo (o forzando la salida del proceso) y registrando qué quedó sin terminar, no cancelándolo a mitad de una escritura. Después se cierran en orden inverso al de apertura los recursos, se registra el apagado, se imprime el resumen y se sale con éxito. Una segunda petición se interpreta como «ahora mismo».

## Anti-patrones frecuentes
- Hacer el trabajo de limpieza dentro del manejador de la señal. Corrección: el manejador solo marca; limpia el bucle principal.
- Cancelar también el trabajo en curso con la misma señal y dejar escrituras a medias.
- Esperar la llegada del siguiente intervalo antes de comprobar la bandera.
- No tener plazo: un trabajo colgado impide parar para siempre.
- Salir con código de error después de un apagado pedido y correcto, y que el supervisor lo trate como fallo.
- Probar solo la lógica y no la señal real, o al revés.
- Suponer que todas las señales existen en todos los sistemas operativos.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** `signal.NotifyContext` devuelve un contexto que se cierra al llegar la señal. Verificado el 2026-10-30 ([os/signal](https://pkg.go.dev/os/signal)): hay que llamar a la función `stop` para liberar recursos, y esa llamada restaura el comportamiento por defecto de las señales; en Windows, Ctrl-C y Ctrl-Break se entregan como `os.Interrupt` y, ante un cierre, un cierre de sesión o un apagado del sistema, se entrega `syscall.SIGTERM`. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el esqueleto Go pasa a su bucle un contexto que sí se cancela y a cada trabajo uno que no (`context.WithoutCancel`), y su prueba de apagado ordenado lo comprueba; la señal real de punta a punta no se ejecutó en Windows.
- **Python:** un `threading.Event` activado por el manejador. Verificado el 2026-10-30 ([signal](https://docs.python.org/3/library/signal.html)): los manejadores corren siempre en el hilo principal y solo este puede registrarlos; en Windows `signal.signal` acepta solo un conjunto reducido de señales, entre ellas SIGINT, SIGTERM y SIGBREAK. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): la prueba de apagado ordenado del esqueleto Python pasa y su bucle espera en tramos cortos; la señal real de punta a punta no se ejecutó en Windows. Según el comentario del código del esqueleto, la causa de esperar en tramos es que en Windows un manejador de señal no interrumpe una espera larga: No verificado en la documentación oficial.
- **Rust:** la biblioteca estándar no trae manejo de señales. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el esqueleto Rust declara a mano dos funciones del sistema y su manejador solo escribe una bandera atómica; la prueba de apagado ordenado pasa y la prueba con la señal real solo existe para POSIX y no se compiló ni ejecutó aquí. La alternativa es una biblioteca de señales de terceros: No verificado.

## ADR de ejemplo
- [El apagado deja terminar el trabajo en curso dentro de un plazo](../ejemplos-adr-c/apagado-con-plazo.md)
