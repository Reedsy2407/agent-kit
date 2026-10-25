# Errores y su traducción a respuestas

## Problema
Cada servicio genera errores de negocio y recibe los de sus dependencias. Todos deben llegar a quien consume con un estado y un cuerpo coherentes, sin revelar detalles internos y sin disfrazar un rechazo de negocio de fallo del servidor.

## Señales de que aplica
- Más de un cliente (pantalla, otro servicio) consume la API y decide por el texto del error.
- Un conflicto de versión, un recurso inexistente o una regla de negocio se ven como error interno.
- Hay dependencias cuyos errores deben traducirse a la semántica propia.

## Señales de que sobra
- Un solo cliente propio, sin API pública, y un puñado de errores: un manejador central sencillo basta; el catálogo completo de códigos puede esperar.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: dejar el manejo por defecto del framework | Ninguno; fuga de detalles y errores poco útiles | Prototipo desechable |
| Un manejador global que traduce excepciones conocidas a estados | Bajo | Casi siempre, desde la primera rebanada |
| Catálogo de errores tipado, con código estable y estado por entrada | Medio: disciplina para mantenerlo | Varios clientes o varios servicios |
| Catálogo, formato estándar de problema y mensajes por idioma | Medio-alto | API usada por terceros o con textos en varios idiomas |

## Cómo se comprueba
- Una prueba por tipo de error: estado, código y cuerpo esperados, y que el cuerpo no contiene rastros de pila, SQL ni nombres de host.
- Una prueba de la excepción no prevista: la respuesta es un error genérico con código estable, no la página por defecto.
- Una prueba por cada estado que devuelve una dependencia (no encontrado, conflicto, rechazo, caída) y su traducción.
- Una prueba de que a un código sin mensaje localizado el manejador responde igual (recurre a un mensaje base).

## Cómo suele resolverse
Una solución habitual declara los errores de negocio en un catálogo con código estable y estado, los transporta en una única excepción y los convierte en respuestas en un solo manejador global, con el cuerpo en el formato estándar de problema y el texto tomado de un catálogo de mensajes por código. Quien coordina varias dependencias traduce en su borde saliente cada error ajeno a su propio idioma, sin aplanarlos todos a un mismo estado, y trata como éxito un conflicto al crear algo con identificador determinista.

## Anti-patrones frecuentes
- Señalar una transición inválida de maneras distintas según el módulo. Corrección: una sola convención.
- Aplanar todo error de una dependencia a «puerta de enlace incorrecta». Corrección: traducir por tipo.
- Perder la causa al envolver un error. Corrección: encadenar siempre la causa.
- Sin manejador de último recurso. Corrección: uno que registre y responda con código genérico.
- Un mensaje localizado ausente que rompe el propio manejador. Corrección: mensaje base de la enumeración.
- Perder la indicación de reintento de una dependencia en la ruta síncrona.
- El dominio depende de tipos del framework web solo para llevar el estado. Aceptable si se decide con conciencia; mejor mapear en el borde.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** `@RestControllerAdvice` que extiende `ResponseEntityExceptionHandler` y devuelve `ProblemDetail` (RFC 9457, `application/problem+json`). Verificado el 2026-10-23 ([Spring Framework](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html)): `ProblemDetail`, `ResponseEntityExceptionHandler` y `@ControllerAdvice`. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): 404, 405 y el 400 propio salen con el mismo formato en Spring Boot 4.1.2. No verificado: desde qué versión exacta existe (la documentación no lo dice).
- **.NET:** `AddProblemDetails` junto con `UseExceptionHandler` y `UseStatusCodePages`, y un `IExceptionHandler` registrado con `AddExceptionHandler` para el manejo global (hay que llamar también a `UseExceptionHandler`). Verificado el 2026-10-23 ([ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling)): `AddProblemDetails`, `IExceptionHandler` y `UseExceptionHandler`. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): 400, 404 y 405 con el mismo formato en .NET 10 usando `CustomizeProblemDetails`. No verificado: desde qué versión existe `IExceptionHandler`.
- **Node:** Un middleware de errores final de cuatro argumentos (Express, definido después de las rutas) o `setErrorHandler` (Fastify; su respuesta por defecto trae `statusCode`, `error` y `message`, y reenvía el mensaje tal cual, que puede filtrar detalles internos); formato de problema a mano o con una biblioteca pequeña. Verificado el 2026-10-23 ([Express](https://expressjs.com/en/guide/error-handling.html), [Fastify](https://fastify.dev/docs/latest/Reference/Errors/)): el middleware final de Express y el manejador y formato por defecto de Fastify. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): el esqueleto node responde siempre con `application/problem+json` sin detalles internos.
- **Python:** Manejadores de excepción registrados en FastAPI (`@app.exception_handler`, incluida la sustitución del manejador de `RequestValidationError`) que devuelvan el formato de problema; no devuelvas el texto crudo de la validación (puede filtrar detalles). Verificado el 2026-10-23 ([FastAPI](https://fastapi.tiangolo.com/tutorial/handling-errors/)): los manejadores de FastAPI y la advertencia de filtrado. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): el esqueleto python devuelve el mismo formato en 400, 404, 405 y 500. No verificado: Django.

## ADR de ejemplo
- [Servicio caído responde no disponible con código estable](../ejemplos-adr/servicio-caido-no-disponible.md)
