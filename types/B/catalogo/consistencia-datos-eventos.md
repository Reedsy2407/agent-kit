# Consistencia entre un cambio de datos y la publicación de eventos

## Problema
Persistir un cambio y notificarlo a otro proceso (mensajería, cola o llamada) son dos operaciones que no comparten transacción. Notificar antes de confirmar anuncia algo que quizá no ocurra; notificar después deja el aviso perdido si el proceso se detiene entre ambos pasos.

## Señales de que aplica
- Otro proceso (no la misma transacción) debe enterarse de cada cambio y perder o duplicar el aviso tiene costo de negocio.
- Hay dinero, inventario, cumplimiento o un estado que otro servicio refleja.
- Ya se observan avisos perdidos, repetidos o fuera de orden, o datos que no cuadran entre dos servicios.

## Señales de que sobra
- Todo vive en un solo proceso y una sola base: lo que reacciona al cambio cabe en la misma transacción o en el mismo flujo.
- El aviso es informativo y su pérdida ocasional no hace daño (se puede recalcular o consultar).
- No existe aún un segundo consumidor real.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: llamar o publicar tras confirmar y aceptar la pérdida rara | Ninguno de construcción; riesgo de datos que no cuadran | Avisos informativos, un solo consumidor tolerante |
| Todo en una transacción y un proceso (sin intermediario) | Bajo; acopla las partes | Monolito o módulos en el mismo proceso |
| Bandeja de salida transaccional: el evento se guarda en la misma transacción que el cambio y otro proceso lo publica | Una tabla, un publicador con reintentos y consumidores idempotentes | Eventos hacia otros procesos con costo real si se pierden |
| Captura de cambios del registro de la base | Infraestructura adicional y más piezas que operar | Volumen alto o latencia de publicación medida como problema |
| Orquestador de flujos o sagas | Alto: un motor más que operar | Procesos largos con compensaciones que una máquina de estados no cubre |

## Cómo se comprueba
- Prueba de que evento y cambio existen juntos o ninguno: provocar el fallo entre los dos pasos y comprobar que no queda uno huérfano.
- Prueba del publicador: reintento con tope, filas «tomadas» que se recuperan si el proceso muere, y exclusión de lo ya procesado.
- Prueba del consumidor ante duplicados: procesar dos veces el mismo evento deja el mismo estado.
- Verificación manual documentada contra un intermediario real al menos una vez (los dobles no prueban el transporte).

## Cómo suele resolverse
Una solución habitual guarda cada evento en una tabla propia, en la misma transacción que el cambio. Un proceso periódico (con un candado para que dos réplicas no lo ejecuten a la vez) lee los pendientes por orden, los reclama, los envía y anota el resultado. El mensaje usa un formato estándar de eventos. Quien consume suele lograr la idempotencia con guardas sobre el estado de la entidad, de modo que repetir un cambio ya aplicado no hace nada; para comandos entre servicios se añade una tabla con estado y contador de intentos. Un error de negocio conocido se da por atendido y cualquier otro se devuelve para que se reentregue.

## Anti-patrones frecuentes
- Publicar dentro de la transacción antes de confirmarla (se anuncia lo que luego se deshace). Corrección: guardar el evento en la transacción y publicar después.
- Un evento fallido que queda en ese estado para siempre porque el tope de reintentos se declara pero no se lee. Corrección: tope leído de verdad y estado final visible.
- Filas reclamadas que nunca se liberan si el proceso muere a medias. Corrección: la reclamación caduca y el trabajo se reintenta.
- Reentrega sin fin de mensajes que nunca podrán procesarse. Corrección: cola de mensajes muertos con su consumidor y alerta.
- Recorrer los pendientes por páginas con desplazamiento mientras el propio proceso cambia el filtro (se omiten filas). Corrección: reclamar por estado con una actualización condicional, no por posición.
- Suponer orden global. Corrección: versión o instante en el evento y descartar lo más viejo que lo ya aplicado.
- Consumidores que no toleran duplicados.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** la transacción de Spring (`@Transactional`) cubre cambio y fila de evento; el publicador puede ser una tarea programada con candado de base (ShedLock u otro) o un hilo propio. No verificado: configuración exacta de las versiones vigentes.
- **.NET:** Entity Framework Core permite guardar entidad y evento en una sola `SaveChanges`: todos los cambios de una llamada se aplican en una transacción, y si uno falla no se aplica ninguno. Verificado el 2026-10-23 ([EF Core](https://learn.microsoft.com/en-us/ef/core/saving/transactions)): el comportamiento transaccional por defecto de `SaveChanges`. Existen bibliotecas de mensajería con bandeja de salida integrada, pero su uso solo se justifica si la necesidad ya es real. No verificado: opciones de cada biblioteca.
- **Node:** Una transacción de la biblioteca de base (`BEGIN`/`COMMIT` con un único cliente) con una tabla de eventos y un bucle de publicación con `SELECT … FOR UPDATE SKIP LOCKED` para repartir trabajo entre procesos. Verificado el 2026-10-23 ([node-postgres](https://node-postgres.com/features/transactions)): la transacción manual con un único cliente. No verificado: `SKIP LOCKED` y el comportamiento en cada controlador.
- **Python:** igual que Node con SQLAlchemy o el controlador directo; las tareas periódicas pueden ser un proceso aparte. No verificado: patrón con el framework de tareas elegido.

## ADR de ejemplo
- [Sin intermediario de mensajes al inicio](../ejemplos-adr/sin-broker-al-inicio.md)
