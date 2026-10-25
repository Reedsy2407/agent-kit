# Integraciones salientes y webhooks

## Problema
Lo que ocurre en el sistema se comunica a terceros (sistemas internos, proveedores, suscriptores de webhooks). Cada destino tiene su propia disponibilidad y sus rechazos, y su modo de reconocer duplicados. Un fallo no debe perder el aviso ni repetir un efecto ya producido.

## Señales de que aplica
- Hay que avisar o enviar datos a sistemas que no controlas.
- Un efecto repetido tiene costo (un cobro, un envío, un documento).
- Terceros se suscriben a tus eventos con su propio destino.

## Señales de que sobra
- Un solo tercero, con un efecto idempotente y una llamada que puede hacerse en el mismo flujo: reintento simple.
- No hay terceros suscriptores todavía.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: llamar una vez y registrar el fallo | Ninguno; notificaciones perdidas | Avisos que se pueden perder |
| Reintentos inmediatos con espera creciente, solo ante errores transitorios | Bajo | Terceros fiables |
| **Registrar el evento una vez (clave única) y crear una fila por destino con su propio ciclo de vida** | Medio | Varios destinos |
| Reintento programado en dos niveles, con tope por flujo y estado «descartado» | Medio | Terceros poco fiables |
| Clasificación de rechazos: definitivo (se descarta) frente a transitorio (se reintenta) | Bajo | Siempre que haya reintento |
| Estado «desconocido» para efectos no idempotentes: nunca se reintenta solo y pasa a revisión manual | Bajo | Dinero, envíos |
| Firma del cuerpo, clave de idempotencia y secuencia de eventos en los webhooks | Bajo-medio | Suscriptores externos |

## Cómo se comprueba
- Pruebas de la política de reintentos: intentos agotados, éxito en un reintento y espera creciente con tope.
- Pruebas de clasificación: un rechazo definitivo no se reintenta; uno transitorio sí.
- Una prueba de que el reclamo es una actualización condicional: dos procesos, uno solo ejecuta.
- Pruebas del receptor simulado a nivel HTTP (un servidor falso), no solo con dobles: respuesta lenta, rechazo, éxito.
- Una prueba de firma: verificar con comparación en tiempo constante, y rechazar firma inválida.

## Cómo suele resolverse
Al recibir un evento se registra una sola vez y se abre una fila por cada flujo que le aplica. Cada fila recorre sus estados (pendiente, procesando, éxito, omitido, fallido, descartado) y las ejecuciones quedan en un historial que solo crece. La fila se reclama con una actualización condicional (si está pendiente, o fallido con la espera cumplida). Hay unos pocos intentos inmediatos y después ciclos programados con un tope por flujo; al agotarlo, la fila se descarta. Un rechazo definitivo de negocio se descarta sin reintentar y otro grupo de rechazos se trata como transitorio. Solo se recuperan solos los flujos marcados como idempotentes; para el resto existe el estado «desconocido» y una cola de errores que reprocesa una persona. Cuando el destino responde que ya existe, la fila queda como omitida y deja un aviso para conciliar.

## Anti-patrones frecuentes
- Webhooks sin firma, sin clave de idempotencia y sin orden garantizado. Corrección: firmar el cuerpo, incluir identificador estable entre reintentos y secuencia.
- Reintentar cualquier error, incluidos los rechazos definitivos.
- Reintento programado sin tope ni espera, o con un contador de intentos que se sobrescribe.
- Credenciales de suscriptores guardadas sin cifrar.
- Comparar firmas con una comparación que no es de tiempo constante.
- Confirmar el mensaje de entrada aunque falle su registro (se puede perder).
- Reintentar automáticamente un efecto de dinero.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** `RestClient` con tiempos y el reintento del núcleo de Spring Framework 7 (`@Retryable`) u otra biblioteca de resiliencia; el despachador puede ser una tarea programada. `MessageDigest.isEqual` para comparar firmas (su tiempo depende solo de la longitud del primer argumento). Verificado el 2026-10-23 ([Java SE 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/security/MessageDigest.html), [Spring Framework](https://docs.spring.io/spring-framework/reference/core/resilience.html)): `MessageDigest.isEqual` y `@Retryable` en el núcleo. No verificado: la biblioteca Spring Retry independiente y otras de resiliencia.
- **.NET:** `HttpClient` con el manejador de resiliencia estándar (reintentos; desactívalos para métodos no seguros con `DisableForUnsafeHttpMethods`) y `CryptographicOperations.FixedTimeEquals` para firmas. Verificado el 2026-10-23 ([.NET](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)): el manejador de reintentos y la opción para métodos no seguros. No verificado: `FixedTimeEquals`.
- **Node:** `crypto.timingSafeEqual` para firmas (comprueba antes la longitud: con longitudes distintas lanza error) y un bucle de despacho con reclamo por actualización condicional. Verificado el 2026-10-23 ([Node.js](https://nodejs.org/docs/latest-v24.x/api/crypto.html)): que `crypto.timingSafeEqual` existe (el detalle de la longitud no se leyó en la página). No verificado: bibliotecas de colas concretas.
- **Python:** `hmac.compare_digest` (comparación pensada contra ataques de tiempo; mismos tipos en ambos argumentos; usa `CRYPTO_memcmp` de OpenSSL desde 3.10) y `httpx` con sus cuatro tiempos; los trabajos en segundo plano con el sistema de tareas elegido. Verificado el 2026-10-23 ([Python](https://docs.python.org/3/library/hmac.html), [httpx](https://www.python-httpx.org/advanced/timeouts/)): `hmac.compare_digest` y los tiempos de httpx. No verificado: el sistema de tareas.

## ADR de ejemplo
- [Alta marcada como no verificada cuando el tercero no responde](../ejemplos-adr/respaldo-no-verificado.md)
