# ADR de ejemplo. Un servicio sin base de datos responde «no disponible» con un código estable

Ejemplo breve y abstracto, tomado del caso público esg-trazabilidad. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Cuando la base de datos no respondía (caída, sin conexiones o tiempo agotado) el servicio contestaba un error interno crudo, sin código que un cliente pudiera usar, y la interfaz mostraba códigos técnicos. En alojamientos gratuitos el servicio tarda en despertar y mientras tanto el intermediario responde errores de puerta de enlace. Ficha: `kit/catalogo/errores-respuestas.md` y `kit/catalogo/dependencias-externas.md`.

## Decisión
- Un fallo de acceso a datos responde **servicio no disponible** con un código estable, un mensaje fijo y una indicación de reintento, sin servidor, SQL ni texto del controlador. El registro lleva solo la clase de la excepción.
- El estado agregado de salud pasa a no disponible; la sonda de vida sigue viva.
- La interfaz usa **un solo texto** para «servicio caído o despertando», sin códigos técnicos y con el siguiente paso.
- Una **escritura** sin respuesta nunca dice que falló: dice que no se sabe el resultado y cómo comprobarlo.
- No se reintenta solo.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Dejar el error interno (la más simple) | No dice si repetir sirve y filtra detalle interno | Clientes que no saben reaccionar |
| Reintentar solo, en el servidor o en la interfaz | Una escritura repetida podría duplicarse | Efectos duplicados |
| Mostrar el código técnico a la persona | No le ayuda a decidir | Confusión y soporte |

## Consecuencias
Un cliente distingue «puedo repetir más tarde» de «error de programa». Solo cubre fallos de acceso a datos. La indicación de reintento es una estimación, no una promesa. Se comprueba con una prueba que apaga la base y verifica estado, código, indicación y ausencia de detalle interno.

## Señal para revisar
Que haga falta reintentar solo (operaciones idempotentes, con medición de beneficio).
