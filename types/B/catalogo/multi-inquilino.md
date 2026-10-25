# Multi-inquilino (y por qué no en un MVP)

## Problema
Un mismo sistema atiende a varios clientes cuyos datos no deben mezclarse. El aislamiento (por columna, por esquema o por base) condiciona las consultas, las migraciones, las copias de seguridad y los costos desde el primer día.

## Señales de que aplica
- Hay, o hay un compromiso firme de tener, más de un cliente real cuyos datos deben ser invisibles entre sí.
- Los clientes exigen aislamiento contractual, ajustes propios o ventanas de migración distintas.
- Un cliente nuevo debe poder darse de alta sin desplegar.

## Señales de que sobra
- **Un solo cliente o una demostración:** casi siempre sobra. Se diseña sabiendo que existe, y se construye cuando aparece el segundo cliente real.
- Una herramienta interna de una sola organización.
- Un producto en validación: el costo de operar varios esquemas frena aprender.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: un solo inquilino implícito | Ninguno; migrar después cuesta | MVP, demostración, un cliente |
| Columna de inquilino en cada tabla, filtrada siempre | Bajo-medio: riesgo de olvidar el filtro | Muchos inquilinos pequeños |
| Esquema por inquilino en la misma base | Medio: migraciones y grupos de conexiones por esquema | Aislamiento medio y pocos o decenas de inquilinos |
| Base por inquilino | Alto | Aislamiento fuerte, regulaciones o cargas muy distintas |
| Inquilino desconocido = error explícito (modo estricto) | Bajo | Siempre que haya inquilinos |

## Cómo se comprueba
- Una prueba de aislamiento: los datos de un inquilino no aparecen en las consultas de otro (para cada ruta de lectura).
- Una prueba de que un inquilino desconocido o ausente produce un error, no un esquema por defecto.
- Una prueba de que el contexto de inquilino se limpia entre peticiones y se propaga a tareas y eventos.
- Una prueba de la migración sobre varios inquilinos, con uno roto: los demás no quedan bloqueados.
- Validación al arrancar de la configuración de inquilinos.

## Cómo suele resolverse
Una variante habitual toma el inquilino de la petición, lo guarda en el contexto y elige el origen de datos según él (un esquema por inquilino en la misma base). Las migraciones corren una vez por inquilino. Un caso público (esg-trazabilidad) decidió no implementarlo en su primera versión, dejando el diseño preparado para cuando existiera una segunda organización usuaria.

## Anti-patrones frecuentes
- Construirlo antes de tener un segundo cliente real.
- Un inquilino desconocido que acaba, sin avisar, en el esquema por defecto.
- Leer la cabecera de inquilino sin comprobar que existe.
- El inquilino de referencia de las migraciones escrito como texto en el código.
- Tareas periódicas e hilos de refresco sin el contexto de inquilino, que leen el esquema equivocado.
- Un inquilino roto que bloquea el despliegue de todos.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** `AbstractRoutingDataSource` (elige el `DataSource` por clave con `determineCurrentLookupKey()`) más un contexto por hilo, o multiinquilino de Hibernate (`CurrentTenantIdentifierResolver`, `MultiTenantConnectionProvider`, `@TenantId`; estrategias de base, esquema o columna discriminadora). Verificado el 2026-10-23 ([Spring Framework](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jdbc/datasource/lookup/AbstractRoutingDataSource.html), [Hibernate ORM](https://docs.hibernate.org/orm/current/userguide/html_single/Hibernate_User_Guide.html)): ambas piezas. No verificado: cómo se combina con la versión de Hibernate que trae Spring Boot.
- **.NET:** filtros globales de consulta en Entity Framework Core para columna de inquilino, o cadena de conexión por inquilino. No verificado.
- **Node:** Un pool de conexiones por inquilino o `SET search_path` por petición; el contexto en `AsyncLocalStorage` (estable; usa `run`, no `enterWith`). Verificado el 2026-10-23 ([Node.js](https://nodejs.org/docs/latest-v24.x/api/async_context.html)): `AsyncLocalStorage`. No verificado: pool por inquilino y `search_path`.
- **Python:** Enrutadores de base de datos de Django (`DATABASE_ROUTERS` con `db_for_read`, `db_for_write`, `allow_relation`, `allow_migrate`) o sesiones de SQLAlchemy por inquilino; el contexto en `contextvars` (compatible de forma nativa con asyncio). Verificado el 2026-10-23 ([Django](https://docs.djangoproject.com/en/stable/topics/db/multi-db/), [Python](https://docs.python.org/3/library/contextvars.html)): los enrutadores de Django y `contextvars`. No verificado: sesiones de SQLAlchemy por inquilino.

## ADR de ejemplo
- [Sin multi-inquilino en la primera versión](../ejemplos-adr/sin-multi-inquilino-al-inicio.md)
