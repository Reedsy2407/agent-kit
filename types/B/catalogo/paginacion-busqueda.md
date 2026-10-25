# Paginación y búsqueda

## Problema
Los listados crecen. Sin paginación, una consulta devuelve todo y la respuesta se hace lenta o inmanejable. Sin una estrategia de búsqueda, los filtros se vuelven un método monolítico imposible de probar, o se llega a un buscador dedicado antes de necesitarlo.

## Señales de que aplica
- Una lista puede superar unas pocas decenas de elementos.
- Las pantallas filtran por varios criterios combinables.
- Se pide un resumen sobre todo el filtro, no solo la página visible.

## Señales de que sobra
- Una lista que será siempre corta (catálogos pequeños, opciones de un selector).
- Un buscador dedicado cuando la base de datos ya resuelve los filtros: sobra hasta que haga falta relevancia, sinónimos o volúmenes que la base no sostiene.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: devolver todo | Ninguno; se rompe al crecer | Listas siempre cortas |
| Paginación por desplazamiento (página y tamaño) con orden estable | Bajo | Listados con navegación por páginas |
| Paginación por cursor (a partir del último elemento) | Medio | Datos muy grandes o que cambian mientras se lee |
| Filtros compuestos: cada criterio es una pieza pequeña y combinable | Bajo-medio | Varios filtros opcionales |
| Resumen aparte sobre todo el filtro (totales, conteos) | Bajo-medio | La pantalla muestra métricas del conjunto |
| Búsqueda de texto de la propia base | Bajo | Texto sencillo |
| Buscador dedicado como réplica de lectura | Alto: otro sistema que mantener sincronizado | Relevancia, sinónimos o volumen que la base no resuelve |

## Cómo se comprueba
- Pruebas de cada filtro por separado y de combinaciones representativas.
- Una prueba de orden estable: sin un criterio de desempate, dos páginas pueden repetir o saltar elementos.
- Una prueba de borde: página vacía, tamaño máximo, página fuera de rango.
- Una prueba de que el tamaño de página tiene un máximo en el servidor.
- Una prueba de que el resumen cubre todo el filtro y no solo la página.
- Medir el plan de la consulta con volumen realista antes de pensar en un buscador.

## Cómo suele resolverse
Una solución habitual envuelve la página del framework en una respuesta propia con un bloque de resumen opcional calculado sobre todo el filtro, y compone los filtros como piezas pequeñas y combinables. Las búsquedas diarias se resuelven en la base; un buscador dedicado se reserva para lo que la base no resuelve. Un caso público (esg-trazabilidad) adoptó la misma recomendación: la base para los filtros y el buscador solo después.

## Anti-patrones frecuentes
- Devolver el tipo de página del framework directamente al cliente (acopla el contrato al framework).
- Paginar sin un orden estable.
- Tamaño de página elegido por el cliente sin tope.
- Un buscador dedicado desde el inicio, con el costo de sincronizarlo.
- Un único método con todos los filtros mezclados.
- Contar el total en cada página cuando el conjunto es enorme y el total no se usa.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** `Pageable` y `Sort` como parámetros y `Page`/`Slice` como retorno: `Page` dispara una consulta de conteo (puede ser cara según el almacén), `Slice` no; especificaciones compuestas con una respuesta propia. Verificado el 2026-10-23 ([Spring Data](https://docs.spring.io/spring-data/commons/reference/repositories/query-methods-details.html)): `Pageable`, `Page`, `Slice` y el conteo. No verificado: especificaciones compuestas y el conteo con filtros complejos.
- **.NET:** `Skip`/`Take` con orden estable y expresiones combinables en Entity Framework Core. No verificado.
- **Node:** `LIMIT`/`OFFSET` o cursor con el constructor de consultas elegido. No verificado.
- **Python:** `limit`/`offset` o paginadores del framework; cursor a mano. No verificado.

## ADR de ejemplo
- Ninguno todavía.
