# Dependencias externas caídas o lentas

## Problema
Una operación depende de otros servicios o de terceros. Si uno se ralentiza, se agotan los hilos o las conexiones de quien llama y el retraso se propaga en cascada. Si uno cae, debe estar decidido de antemano qué se degrada y qué se detiene.

## Señales de que aplica
- El sistema llama por red a algo que no controla (otro servicio, un proveedor, un correo, un pago).
- La latencia de cola es mayor que la media y el análisis apunta a esperar por una conexión libre, no a la red.
- Una caída ajena deja sin servicio una pantalla que no dependía de ella.

## Señales de que sobra
- Todo ocurre en un solo proceso, o la dependencia es de arranque (se necesita sí o sí y no hay degradación posible): basta fallar rápido y claro.
- La dependencia es interna, está en la misma máquina y su caída es la del propio sistema.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: valores por defecto de la biblioteca | Ninguno; la lectura puede no tener límite | Nunca en un ambiente real |
| **Tres tiempos en toda llamada saliente:** conexión, lectura y espera por una conexión del grupo | Bajo | Siempre |
| Compartimentos: un tope de concurrencia por dependencia para que una lenta no consuma todo | Medio | Varias dependencias en la misma operación |
| Cortacircuitos y reintentos con espera creciente | Medio | Dependencias idempotentes que fallan de forma transitoria |
| Caché de la respuesta, con interruptor propio | Medio | Datos que cambian poco y una medición que lo justifica |
| **Política escrita de degradación:** cuáles dependencias son críticas, cuáles opcionales y qué hacer sin cada una | Bajo (es un documento) | Siempre que haya más de una dependencia |
| Último dato bueno guardado | Medio | Datos de un tercero que importan aunque estén atrasados |

## Cómo se comprueba
- Una prueba por dependencia con el tiempo de espera agotado: el comportamiento coincide con la política escrita.
- Una prueba de grupo de conexiones agotado: falla rápido, no encola sin límite.
- Una prueba de que no se cachean fallos ni resultados vacíos por una espera agotada.
- Una prueba de que las respuestas del tercero son grabadas; la integración continua nunca llama al servicio real.
- Si hay caché: prueba del cortacircuito (tras varios fallos seguidos deja de usarla y prueba de nuevo con una sola sonda).

## Cómo suele resolverse
Cada cliente tiene su grupo de conexiones acotado (topes totales y por destino, espera limitada y comprobación de conexiones inactivas). Quien coordina varias llamadas a la vez las reparte en compartimentos con tope por petición y por dependencia, y el exceso espera en una cola. Los reintentos de pasos remotos no ocurren en la ruta síncrona sino desde una tabla. La caché se apaga sola tras fallos repetidos y no entra en el chequeo de salud. Cada dependencia tiene su degradación: conservar el último valor, devolver vacío o pedir de nuevo al usuario. En las llamadas de dinero se anota el estado «en curso» antes de llamar y una tarea periódica concilia lo pendiente.

## Anti-patrones frecuentes
- Tiempos configurados con propiedades que ningún código lee. Corrección: una prueba que confirme que el valor llega al cliente.
- Configurar los tiempos de cada cliente de un modo distinto. Corrección: exigir los tres tiempos en todos los clientes.
- Cachear la ausencia de respuesta como si fuera una regla («sin restricción»).
- Refrescar la caché en un hilo sin el contexto del inquilino.
- Degradar caso a caso sin política escrita.
- Reintentar a ciegas una operación de dinero que no es idempotente. Corrección: estado desconocido y resolución manual (ver la ficha de integraciones salientes).
- Llamar a un tercero dentro de una transacción de base de datos.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** `RestClient` con tiempos de conexión y de lectura (`spring.http.clients.connect-timeout` y `read-timeout`, o `HttpClientSettings` por cliente); desde Spring Framework 7 el núcleo trae `@Retryable` y `@ConcurrencyLimit` (compartimento por concurrencia). Verificado el 2026-10-23 ([Spring Boot](https://docs.spring.io/spring-boot/reference/io/rest-client.html), [Spring Framework](https://docs.spring.io/spring-framework/reference/core/resilience.html)): los dos tiempos globales y por grupo de servicio; la página no documenta un tiempo de espera de grupo de conexiones; `@Retryable` y `@ConcurrencyLimit` están en el núcleo desde la 7.0. No verificado: espera de grupo, cortacircuito y la biblioteca de resiliencia del ecosistema.
- **.NET:** `IHttpClientFactory` con el manejador de resiliencia estándar (`AddStandardResilienceHandler`, paquete `Microsoft.Extensions.Http.Resilience`, basado en Polly): limitador, tiempo total (30 s), reintentos (3, exponencial con jitter), cortacircuito y tiempo por intento (10 s) por defecto; `DisableForUnsafeHttpMethods` evita reintentar POST y similares. Verificado el 2026-10-23 ([.NET](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)): el manejador estándar, sus valores por defecto y los métodos no seguros. No verificado: `HttpClient.Timeout` por sí solo.
- **Node:** `AbortSignal.timeout(ms)` (desde Node 17.3 y 16.14) y las opciones del cliente undici: `connectTimeout` (10 s por defecto), `headersTimeout` y `bodyTimeout` (300 s por defecto); límite de concurrencia con una cola pequeña. Verificado el 2026-10-23 ([Node.js](https://nodejs.org/docs/latest-v24.x/api/globals.html), [undici](https://github.com/nodejs/undici/blob/main/docs/docs/api/Client.md)): `AbortSignal.timeout` y las opciones de undici con sus valores por defecto. No verificado: cómo pasar esas opciones al `fetch` global y la cola de concurrencia.
- **Python:** `httpx.Timeout` con cuatro tiempos (connect, read, write y pool; 5 s de inactividad por defecto) y `tenacity` para reintentos; semáforos de `asyncio` como compartimento. Verificado el 2026-10-23 ([httpx](https://www.python-httpx.org/advanced/timeouts/)): los cuatro tiempos de httpx y su valor por defecto. No verificado: `tenacity` y los semáforos de `asyncio`.

## ADR de ejemplo
- [Último dato bueno de un servicio externo](../ejemplos-adr/ultimo-dato-bueno.md)
- [Alta marcada como no verificada cuando el tercero no responde](../ejemplos-adr/respaldo-no-verificado.md)
