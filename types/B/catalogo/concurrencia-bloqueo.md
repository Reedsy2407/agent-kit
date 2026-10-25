# Concurrencia y bloqueo

## Problema
Varios actores tocan a la vez la misma entidad: una persona, un proceso programado, un evento. Una escritura puede pisar a otra y deshacer un cambio de negocio visible (algo ya cerrado que vuelve a abrirse, un saldo que no cuadra, una reserva duplicada).

## Señales de que aplica
- La misma fila la modifican caminos distintos (interfaz, eventos, tareas periódicas).
- Hay recursos escasos (existencias, plazas, cupos) que se reservan.
- Se han visto duplicados, escrituras perdidas o excepciones de estado obsoleto.
- Dos réplicas pueden ejecutar la misma tarea periódica.

## Señales de que sobra
- Un solo usuario, un solo proceso y entidades que nadie más toca: la transacción de la base basta.
- Lectura casi exclusiva.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: la última escritura gana | Ninguno; pérdida silenciosa de cambios | Datos sin consecuencia |
| **Restricción única o de exclusión en la base** como red final contra duplicados | Muy bajo | Siempre que haya algo que no deba repetirse |
| Bloqueo optimista con columna de versión; el conflicto se traduce a «conflicto» y se reintenta | Bajo-medio | Contención esporádica y reintentar es barato |
| Reintento alrededor del caso de uso, siempre **fuera** de la transacción, limitado a unos pocos intentos y esperas crecientes aleatorias | Bajo | Junto con el bloqueo optimista |
| Bloqueo pesimista acotado al leer para modificar | Medio | Contención alta, o hijos cuyo borrado simultáneo rompe la sesión de persistencia |
| Candado distribuido por tarea periódica, renovable si la tarea puede tardar más que el propio candado | Medio | Varias réplicas |
| Actualización condicional («tomar solo si todavía está pendiente») para reclamar un trabajo | Bajo | Repartir trabajo sin bloquear |

## Cómo se comprueba
- Una prueba con dos hilos o dos conexiones reales compitiendo por el mismo recurso, no una llamada dos veces seguidas. Es lo que más defectos reales encuentra.
- Una prueba que incrementa la versión con una sentencia directa y comprueba que la escritura siguiente falla con conflicto.
- Una prueba de la restricción única: el segundo insert falla y se traduce a «ya existe».
- Hacerlo **contra el motor de base de datos real**: los bloqueos y «saltar los ocupados» no se ejercitan en una base de reemplazo en memoria.
- Una prueba del candado: dos réplicas, una sola ejecuta; el candado expira sin que la tarea termine y se detecta.

## Cómo suele resolverse
Las entidades más disputadas llevan columna de versión y solo se escribe lo que cambió; un choque de versiones sale como conflicto, nunca como error interno. El caso de uso se reintenta desde fuera: cada intento abre otra transacción y vuelve a leer el agregado. Donde hay hijos que se borran a la vez se prefiere un bloqueo pesimista breve, con las llamadas externas hechas antes. Las tareas periódicas se protegen con un candado en la base, renovable, y las restricciones únicas son la última barrera ante duplicados.

## Anti-patrones frecuentes
- Bloquear y a la vez hacer entrada y salida externa dentro del bloqueo. Corrección: la llamada externa va antes o después.
- Reintentar dentro de la transacción ya marcada para deshacer. Corrección: reintentar fuera, con transacción nueva.
- Eliminar una columna sin revisar qué índice o restricción arrastra (se pierde la protección y aparecen duplicados). Corrección: revisar dependencias en cada migración.
- Entidades críticas (cobros, órdenes) sin versión ni restricción: dependen solo de guardas de estado.
- Un candado que expira a mitad de la tarea y deja correr dos réplicas.
- Probar la concurrencia con dobles y no con el motor real.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** `@Version` (JPA) para el optimista, `@Lock` para el pesimista, reintento fuera de la transacción; `FOR UPDATE SKIP LOCKED` en consultas nativas. Verificado el 2026-10-23 ([Spring Data JPA](https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html), [Spring Framework](https://docs.spring.io/spring-framework/reference/core/resilience.html)): `@Lock(LockModeType...)` en métodos de repositorio (solo se muestra `READ`); desde Spring Framework 7 el núcleo trae `@Retryable` (`org.springframework.resilience.annotation`, con `@EnableResilientMethods`) y `RetryTemplate`. No verificado: `@Version`, `SKIP LOCKED`, que el reintento deba quedar fuera de la transacción, y la interacción con la configuración de transacciones.
- **.NET:** Concurrency token o `RowVersion` en Entity Framework Core (`[Timestamp]`, `IsRowVersion()`, `IsConcurrencyToken()`, `[ConcurrencyCheck]`) y captura de `DbUpdateConcurrencyException`. Verificado el 2026-10-23 ([EF Core](https://learn.microsoft.com/en-us/ef/core/saving/concurrency)): los tokens de concurrencia, `rowversion` en SQL Server y el bucle de resolución; la página cita además los niveles de aislamiento como alternativa. No verificado: opciones de bloqueo pesimista según el proveedor de base.
- **Node:** Versión con `UPDATE … WHERE version = $n` y comprobar filas afectadas; `SELECT … FOR UPDATE` en una transacción. Verificado el 2026-10-23 ([node-postgres](https://node-postgres.com/features/transactions)): la transacción manual `BEGIN`/`COMMIT`/`ROLLBACK` con un único cliente del grupo de conexiones (todas las sentencias de la transacción deben usar el mismo cliente). No verificado: ORM concreto y el comportamiento de `FOR UPDATE`.
- **Python:** `version_id_col` de SQLAlchemy (lanza `StaleDataError` cuando no coincide la versión; solo en `flush`, no en `update`/`delete` masivos), `with_for_update` y, en Django, `select_for_update(nowait, skip_locked, of, no_key)` dentro de `transaction.atomic()`. Verificado el 2026-10-23 ([SQLAlchemy](https://docs.sqlalchemy.org/en/20/orm/versioning.html), [Django](https://docs.djangoproject.com/en/stable/ref/models/querysets/)): `version_id_col` y `select_for_update` con su compatibilidad por base (MariaDB solo `nowait` y `skip_locked`; `no_key` solo PostgreSQL). No verificado: los parámetros de `with_for_update` de SQLAlchemy.

## ADR de ejemplo
- Ninguno todavía.
