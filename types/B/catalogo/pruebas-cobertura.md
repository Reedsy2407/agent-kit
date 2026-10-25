# Estilos de prueba y cobertura

## Problema
Hay un dominio con reglas, adaptadores hacia muchas dependencias y despliegues frecuentes. Conviene decidir cuál nivel de prueba cubre cada riesgo sin que la suite sea lenta o frágil, y qué medida de cobertura protege sin paralizar al equipo.

## Señales de que aplica
- La suite tarda tanto que se evita correrla, o es tan frágil que se ignora su rojo.
- Se prueba mucha configuración y poca regla de negocio.
- La cobertura global es media y un umbral alto bloquearía todo.

## Señales de que sobra
- Un prototipo desechable. Aun así: las reglas de negocio y la concurrencia se prueban.
- Pedir cobertura sobre configuración, mapeadores o código generado.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: probar a mano | Ninguno; regresiones constantes | Nunca para reglas de negocio |
| Dominio con pruebas unitarias puras, sin framework | Bajo | Siempre; es el nivel más rentable |
| Casos de uso con dobles de los puertos salientes | Bajo-medio | Siempre |
| Pruebas de integración de persistencia contra el motor real en contenedor efímero | Medio | Bloqueos, restricciones, migraciones |
| Pruebas de la API completa como caja negra, con dependencias simuladas a nivel HTTP | Medio-alto | Contratos y cadena de seguridad |
| Escenarios legibles para el negocio (BDD) | Medio | Solo donde el negocio los lee |
| Pruebas de contrato entre servicios | Medio | Servicios que cambian por separado |
| Cobertura exigida a las líneas tocadas, más un trinquete que impide que la global baje | Bajo | Código heredado con poca cobertura |

## Cómo se comprueba
- La separación unitarias frente a integración la hace el build (fases o carpetas distintas), no solo una convención de nombres.
- La compuerta mide el diff (líneas nuevas o modificadas) y la cobertura global no puede quedar por debajo de la de la última construcción verde de la rama principal.
- Las pruebas rojas siempre bloquean; la excepción para urgencias es explícita.
- Las esperas son por condición, nunca por tiempo; un test intermitente es un defecto hasta demostrar lo contrario.
- Una prueba que solo confirma que «no lanza excepción» no prueba corrección: leer sus aserciones.

## Cómo suele resolverse
Dominio con pruebas unitarias puras; casos de uso con dobles de los puertos; escenarios de comportamiento a nivel de servicio con los puertos salientes sustituidos; y una capa de caja negra contra la aplicación y la base reales levantadas en contenedor, con las dependencias simuladas por un servidor falso. Los controladores se prueban con una configuración aislada y el caso de uso doblado. El informe de cobertura excluye configuración, objetos de transferencia, mapeadores y utilidades. La compuerta real exige un porcentaje mínimo sobre las líneas nuevas o modificadas y que la cobertura global no baje del último build verde, con una pequeña tolerancia.

## Anti-patrones frecuentes
- Probar bloqueos, índices y migraciones solo con una base de reemplazo en memoria.
- No probar nunca el intermediario real (ni siquiera un procedimiento manual documentado).
- Sin pruebas de contrato ni de reglas de arquitectura donde varios servicios dependen unos de otros.
- Pruebas de la ruta feliz solamente: dos llamadas seguidas no prueban concurrencia.
- Un umbral global único que castiga la deuda heredada en lugar de exigir calidad a lo nuevo.
- Cambios que solo modifican migraciones o configuración y por eso eluden la compuerta del diff.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** JUnit, Mockito y Testcontainers (con `@ServiceConnection` en Spring Boot); Surefire (fase `test`) para unitarias y Failsafe (`integration-test` y `verify`, se ejecuta con `mvn verify`) para integración; JaCoCo (`prepare-agent` y `report`) para cobertura. Verificado el 2026-10-23 ([Maven Failsafe](https://maven.apache.org/surefire/maven-failsafe-plugin/), [JaCoCo](https://www.jacoco.org/jacoco/trunk/doc/maven.html), [Testcontainers](https://java.testcontainers.org/), [Spring Boot](https://docs.spring.io/spring-boot/reference/testing/testcontainers.html)): Failsafe, JaCoCo y Testcontainers. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): JUnit Jupiter y MockMvc corren con `mvn -B verify` en el esqueleto. No verificado: configuración de versiones de JaCoCo y Failsafe.
- **.NET:** xUnit, Testcontainers para .NET y `WebApplicationFactory` para la API completa; Coverlet para cobertura. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): xUnit 2.9.3 y `Microsoft.AspNetCore.Mvc.Testing` 10.0.13 prueban la API con `dotnet test` (.NET 10, en contenedor). No verificado: Testcontainers y Coverlet.
- **Node:** El ejecutor integrado (`node --test`, estable desde Node 20; admite patrones glob) o Vitest, y Testcontainers; la cobertura del ejecutor sigue siendo experimental en Node 24 (`--experimental-test-coverage`). Verificado el 2026-10-23 ([Node.js](https://nodejs.org/docs/latest-v24.x/api/test.html)): la estabilidad del ejecutor, los patrones y el estado de la cobertura. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): el esqueleto node pasa sus pruebas con `node --test` sin dependencias. No verificado: Vitest y su cobertura, Testcontainers para Node.
- **Python:** pytest con fixtures (`@pytest.fixture`) y Testcontainers; `coverage.py` (cobertura de líneas y de ramas). Verificado el 2026-10-23 ([pytest](https://docs.pytest.org/en/stable/how-to/fixtures.html), [coverage.py](https://coverage.readthedocs.io/en/latest/)): las fixtures de pytest y la cobertura de ramas. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): pytest 9.1.1 y `TestClient` de FastAPI prueban el esqueleto python. No verificado: Testcontainers para Python y el umbral mínimo (`fail-under`).

## ADR de ejemplo
- Ninguno todavía.
