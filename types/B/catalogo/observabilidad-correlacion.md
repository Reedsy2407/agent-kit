# Observabilidad: registros, métricas y correlación

## Problema
Una operación recorre varios servicios, eventos y tareas periódicas. Diagnosticar un fallo exige seguir toda esa cadena y saber si «sin errores» quiere decir «todo bien» o «sin tráfico».

## Señales de que aplica
- Más de un servicio o proceso participa en una operación.
- Los diagnósticos se retrasan porque el registro ya rotó o el nivel oculta lo necesario.
- Nadie sabe sin abrir el código si un proceso periódico está corriendo.

## Señales de que sobra
- Un solo proceso, un solo equipo y pocos usuarios: registros claros, un chequeo de salud y alertas básicas del proveedor de alojamiento bastan.
- Instrumentar todo antes de tener una pregunta concreta que responder.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: texto plano por defecto | Ninguno; diagnóstico lento | Prototipo |
| Registros estructurados (JSON) con nivel configurable por entorno | Bajo | Siempre |
| **Identificador de correlación** creado en el borde, enviado por HTTP, copiado a los eventos y presente en cada línea | Bajo-medio | Más de un componente |
| Chequeo de salud que distingue «vive» de «puede servir» y no cuenta dependencias opcionales | Bajo | Siempre |
| Métricas exportadas de negocio y de dependencias | Medio | Preguntas de operación que se repiten |
| Trazas distribuidas | Medio-alto | Muchos servicios y latencia difícil de ubicar |
| Registro de llamadas salientes fallidas con secretos enmascarados y cuerpos truncados | Bajo | Terceros inestables |

## Cómo se comprueba
- Una prueba de que cada línea de registro de una petición lleva el identificador de correlación, y de que se propaga a la llamada saliente y al evento.
- Una prueba del enmascarado y el truncado: ningún secreto ni cuerpo grande llega al registro.
- Una prueba del chequeo de salud con una dependencia caída: la caída de una dependencia opcional no saca a la réplica del balanceador.
- Una métrica o un registro de «latido» de cada proceso periódico, y una alerta si falta.
- Verificar el nivel de registro del entorno real: los volcados en nivel informativo pueden no verse.

## Cómo suele resolverse
Una solución habitual registra con un nivel ajustable por entorno, anota las llamadas externas fallidas con secretos tapados y cuerpos recortados, delega las trazas en la plataforma y mantiene un chequeo de salud que deja fuera las dependencias opcionales. La tabla de eventos pendientes sirve también de rastro histórico: permite averiguar quién escribió un dato aunque el registro ya haya rotado.

## Anti-patrones frecuentes
- **Sin identificador de correlación**, o un campo para él que se publica vacío.
- Casi sin métricas, o con una métrica propia que nunca se exporta.
- Un chequeo de salud que no cubre el grupo de conexiones de cada inquilino.
- Registrar en un nivel que producción oculta.
- Volcar cuerpos completos o secretos sin enmascarar.
- Alertas sobre «cero errores» sin distinguir «cero tráfico».

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** Actuator para salud y métricas, Micrometer para exportarlas, y el contexto de registro (MDC) para el identificador de correlación: el MDC no se escribe por defecto (se añade con `logging.pattern.level` y `%X{clave}`); los formatos estructurados `ecs`, `gelf` y `logstash` (`logging.structured.format.console`) incluyen las claves del MDC. Verificado el 2026-10-23 ([Spring Boot](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html), [Spring Boot](https://docs.spring.io/spring-boot/reference/actuator/metrics.html), [Spring Boot](https://docs.spring.io/spring-boot/reference/features/logging.html)): Actuator, Micrometer, el MDC y el registro estructurado. No verificado: propagación del MDC en tareas asíncronas.
- **.NET:** `ILogger` con ámbitos y `Activity` para la correlación; OpenTelemetry. No verificado: versión vigente del SDK.
- **Node:** Un registrador JSON (pino) con `AsyncLocalStorage` para el contexto. Verificado el 2026-10-23 ([pino](https://getpino.io/), [Node.js](https://nodejs.org/docs/latest-v24.x/api/async_context.html)): pino como registrador JSON y `AsyncLocalStorage`. No verificado: registradores hijos de pino y comparación con otros.
- **Python:** `logging` con filtros (`logging.Filter`), `LoggerAdapter` o `extra`, y `contextvars` para el contexto, o structlog; OpenTelemetry. Verificado el 2026-10-23 ([Python](https://docs.python.org/3/library/logging.html), [Python](https://docs.python.org/3/library/contextvars.html)): filtros, adaptadores y extras de `logging`, y `contextvars`. No verificado: structlog y OpenTelemetry.

## ADR de ejemplo
- Ninguno todavía.
