# Modelo de concurrencia y contrapresión

## Problema
Una herramienta que atiende varias cosas a la vez (conexiones, archivos, hijos, temporizadores) debe elegir cómo se reparte el trabajo y qué pasa cuando llega más del que puede procesar. Sin una elección explícita, la cola crece sin límite hasta agotar la memoria, un consumidor lento arrastra a los demás o un hilo bloqueado deja la herramienta sin responder. La contrapresión es la respuesta a «llega más de lo que cabe»: frenar al productor, descartar con criterio o rechazar.

## Señales de que aplica
- Hay productores y consumidores con ritmos distintos (red, disco, trabajadores).
- La herramienta debe seguir respondiendo (a una orden de parar, a una consulta de estado) mientras trabaja.
- Una entrada puede llegar en ráfagas o de un cliente más rápido que el procesamiento.
- El uso de memoria depende de cuánto trabajo hay pendiente.

## Señales de que sobra
- El proceso hace una tarea tras otra y termina: un bucle secuencial es más fácil de razonar y de probar.
- El volumen es pequeño y acotado por naturaleza (una lista corta leída al arrancar).
- La concurrencia que aporta el sistema operativo (una orden por proceso, una tubería) ya es la que hace falta.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: secuencial, un trabajo a la vez | Ninguno; sin paralelismo | Herramientas de ejecución corta |
| Un trabajador por unidad de trabajo, sin límite | Bajo de escribir; agota recursos bajo carga | Casi nunca como única política |
| Un grupo de trabajadores de tamaño fijo con una cola acotada | Medio: tamaños, política de cola llena | Cargas que llegan en ráfagas |
| Lo anterior más límites por cliente o por origen | Medio-alto | Entrada de varios orígenes con distinto peso |
| Descartar con criterio (lo más antiguo, lo menos importante) y contarlo | Medio | Cuando perder algo es aceptable y frenar no lo es |

## Cómo se comprueba
- Una prueba de carga con un consumidor lento: la memoria y la cola se mantienen dentro del límite y el productor se frena, descarta o recibe un rechazo explícito.
- Una prueba de cola llena: el comportamiento elegido (bloquear, descartar, rechazar) es el documentado y queda contado.
- Una prueba de parada con trabajo en cola: se drena o se descarta según lo decidido y nada queda colgado (ver la ficha de apagado ordenado).
- Una prueba de un trabajo que falla o se cuelga: no detiene a los demás ni agota el grupo de trabajadores.
- Una prueba de equidad entre orígenes: uno muy activo no deja sin servicio a los demás.
- Pruebas con el detector de carreras o equivalente del lenguaje cuando exista, y sobre estado compartido, una prueba con varios actores simultáneos.

## Cómo suele resolverse
Se elige un único modelo y se aplica con coherencia: o un bucle de eventos con operaciones que no bloquean, o un grupo fijo de trabajadores que consumen de una cola acotada. El tamaño de la cola es una decisión explícita, no un valor por defecto, y la política cuando se llena (frenar al productor, rechazar con un error claro, descartar y contar) se documenta. El estado compartido se reduce al mínimo y se protege con un solo dueño por dato o con comunicación entre trabajadores en lugar de memoria compartida. Cada tarea tiene un plazo y un modo de cancelarse, y la parada pasa por el mismo camino que el trabajo normal.

## Anti-patrones frecuentes
- Colas sin límite «porque nunca se llenan».
- Un hilo o tarea por petición sin tope.
- Bloquear el bucle de eventos con una operación lenta.
- Compartir estado mutable entre trabajadores sin dueño claro.
- Ignorar la cancelación: tareas que no se detienen al parar.
- Reintentar de inmediato al fallar, amplificando la carga.
- Mezclar dos modelos (hilos con bucles de eventos) sin una frontera definida.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** canales y gorrutinas. Verificado el 2026-10-30 ([especificación del lenguaje](https://go.dev/ref/spec)): la capacidad de un canal es el tamaño de su búfer; en uno sin búfer la comunicación solo se completa cuando emisor y receptor están listos, y en uno con búfer se completa sin bloquear si el búfer no está lleno (al enviar) o no está vacío (al recibir). No verificado en esta consulta: el detalle del envío a un canal lleno o cerrado, el detector de carreras y los patrones de cancelación con `context`.
- **Python:** `asyncio.Queue` para tareas y el módulo `queue` para hilos. Verificado el 2026-10-30 ([asyncio-queue](https://docs.python.org/3/library/asyncio-queue.html)): con `maxsize` mayor que cero, `put` espera cuando la cola está llena hasta que un `get` libera sitio, y con cero la cola es infinita; `put_nowait` lanza `QueueFull` si no hay sitio inmediato; la clase no es segura entre hilos y el módulo `queue` es la alternativa sincronizada. No verificado: el método `shutdown` de la cola (la fuente consultada lo describe, pero no dice desde qué versión existe y el mínimo que declara el esqueleto Python puede ser anterior, así que no se puede dar por disponible); el impacto del bloqueo global del intérprete en cargas de cómputo.
- **Rust:** `std::sync::mpsc::sync_channel`. Verificado el 2026-10-30 ([sync_channel](https://doc.rust-lang.org/std/sync/mpsc/fn.sync_channel.html)): el límite es el tamaño del búfer; cuando está lleno, `send` bloquea hasta que haya sitio; con límite cero cada envío espera a su recepción; si el receptor se ha soltado, `send` devuelve `SendError`. No verificado: la elección de un entorno asíncrono, que no viene en la biblioteca estándar.

## ADR de ejemplo
- Ninguno todavía.
