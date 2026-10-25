# Migraciones de base de datos sin parar el servicio

## Problema
El esquema cambia con cada historia, y durante un despliegue progresivo conviven réplicas viejas y nuevas contra la misma base. Un cambio incompatible, un bloqueo largo o una migración fallida detiene el servicio para todos.

## Señales de que aplica
- Más de una réplica, o un despliegue sin ventana de parada.
- Tablas calientes (escrituras constantes) o grandes.
- Varios esquemas (por inquilino) que migrar.
- Un dato sucio ha impedido crear un índice único.

## Señales de que sobra
- Una sola instancia, datos pequeños y una parada breve aceptada por el negocio: migrar al arrancar con una herramienta estándar basta.
- Base solo de lectura o que se recrea desde cero.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: scripts manuales | Ninguno; deriva entre entornos | Nunca más allá de un experimento |
| Migraciones versionadas aplicadas al arrancar con una herramienta estándar | Bajo | Casi siempre, desde la primera rebanada |
| **Expandir, migrar, contraer:** añadir nulo, rellenar, verificar, imponer restricción después, en entregas separadas | Medio | Tablas con datos y despliegue progresivo |
| Crear los índices de forma concurrente y fuera de transacción | Bajo | Tablas calientes |
| Precondiciones auto-reparables: si el dato aún no permite el cambio, se omite sin registrar y se reintenta luego | Medio | Datos sucios heredados |
| Aplicar las migraciones en un paso previo al despliegue, separado del arranque del servicio | Medio | Varias réplicas arrancando a la vez |
| Fallo aislado por inquilino | Medio | Muchos esquemas |

## Cómo se comprueba
- Las migraciones corren en cada prueba de integración, sobre el **mismo motor** que se usa de verdad (un contenedor efímero), no solo sobre uno de sustitución.
- Una prueba de compatibilidad: el código de la versión anterior sigue funcionando contra el esquema nuevo (el despliegue progresivo lo exige).
- Un control en el pipeline del orden de los nombres: prefijo ordenable sin ambigüedad (relleno de ceros o fecha) y sin versiones duplicadas.
- Un control de que los cambios que eliminan columnas no arrastran índices o restricciones sin quererlo.
- Una prueba de que la migración falla con un mensaje claro si queda un nulo antes de imponer «no nulo».

## Cómo suele resolverse
Una solución habitual versiona migraciones declarativas aplicadas antes de aceptar tráfico, expande y contrae en los cambios delicados con una comprobación explícita antes de imponer restricciones, y crea los índices de forma concurrente y fuera de transacción. Las precondiciones que dependen de datos sucios se difieren al siguiente despliegue en lugar de bloquearlo.

## Anti-patrones frecuentes
- Renombrar y cambiar el tipo de una columna a la vez: las réplicas viejas fallan durante el despliegue progresivo. Corrección: expandir, copiar, contraer.
- Quitar columnas de una vez, perdiendo sin aviso una restricción que dependía de ellas.
- Ordenar las migraciones por nombre léxico sin una convención (versiones duplicadas, estilos mezclados).
- Un inquilino roto que bloquea el despliegue de todos.
- Ampliaciones de tipo que toman un bloqueo exclusivo largo.
- Reglas de migración dispersas en comentarios, sin un reglamento escrito.
- Probar migraciones solo en un motor de reemplazo.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** Flyway o Liquibase integrados al arranque (basta tenerlos en el classpath; migraciones en `classpath:db/migration` y `db/changelog/db.changelog-master.yaml` por defecto). Verificado el 2026-10-23 ([Spring Boot](https://docs.spring.io/spring-boot/how-to/data-initialization.html)): la ejecución automática al arrancar y sus propiedades. No verificado: ajustes para varios esquemas.
- **.NET:** migraciones de Entity Framework Core aplicadas en un paso de despliegue (no al arrancar la aplicación en el ambiente real) o un paquete de migración. No verificado: guía vigente de despliegue.
- **Node:** una herramienta de migraciones (Knex, Prisma, node-pg-migrate u otra) ejecutada como paso previo. No verificado: comparación entre herramientas.
- **Python:** Alembic (SQLAlchemy: `alembic revision`, `alembic upgrade`, `alembic downgrade`) o las migraciones de Django. Verificado el 2026-10-23 ([Alembic](https://alembic.sqlalchemy.org/en/latest/tutorial.html)): Alembic y sus órdenes. No verificado: migraciones de Django.

## ADR de ejemplo
- Ninguno todavía.
