# Accesibilidad y uso en marcha

## Problema
La app se usa con letra grande, con lector de pantalla, a pleno sol, con una mano o con el equipo montado mientras alguien conduce. Una pantalla pensada para una mesa deja fuera a unas personas y distrae a otras. Aparece en toda interfaz; la parte de la marcha, en cuanto una pantalla se usa sobre un vehículo.

## Señales de que aplica
- Hay interfaz propia: la accesibilidad aplica siempre.
- Alguna pantalla se mira o se toca en marcha, aunque la app sea de teléfono.
- Los usuarios trabajan al aire libre, con guantes, con prisa o con poca vista.

## Señales de que sobra
- La parte de la marcha sobra si ninguna pantalla se usa sobre un vehículo, y se anota.
- La de accesibilidad no sobra mientras haya interfaz.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: usar los componentes del sistema sin revisar | Ninguno; fallos de contraste, tamaño o lectura sin ver | Un prototipo que nadie más usará |
| Lista de revisión móvil en cada pantalla, a mano | Bajo | Desde la primera pantalla |
| Además, comprobaciones automáticas en las pruebas de interfaz | Medio: pruebas que escribir y mantener | Las pantallas cambian a menudo |
| Modo de marcha propio, según la regla del kit | Medio-alto: detectar el estado y sus errores | Una pantalla se usa conduciendo |
| No ofrecer la función en marcha | Bajo: se explica y se espera | La acción exige leer o escribir |

## Cómo se comprueba
- La lista de revisión visual móvil pasada en cada pantalla, con equipo y versión anotados.
- Contraste calculado en claro y en oscuro, letra del sistema al máximo y recorrido con lector de pantalla.
- Una prueba de interfaz que mide tamaño y separación de los objetivos y longitud de los textos de las pantallas en marcha.
- En un equipo montado como en el vehículo, de día y de noche, con el vehículo detenido.
- Comprobación de qué pasa si la app cree que se está en marcha y no, o al revés.

## Cómo suele resolverse
La accesibilidad se diseña desde los tokens: contraste, escalones de letra que siguen al sistema, descripciones y más de una señal además del color. Las pantallas en marcha aplican entera la regla de conducción del kit [P-CON-5], leída donde está escrita: aquí no se repite. Es una decisión de diseño del kit, no una obligación comprobada, y no sustituye consultar la norma de tránsito del país.

## Anti-patrones frecuentes
- Revisar el contraste a ojo y en una pantalla de escritorio.
- Fijar tamaños que impiden agrandar la letra.
- Usar solo el color para un estado.
- Una ventana emergente con texto largo mientras se conduce.
- Dar por cumplida la regla porque las pruebas automáticas pasan.
- Presentar las medidas pensadas para pantallas de coche como obligatorias en un teléfono.

## Hechos en que se apoya
- [P-ACC-1], [P-ACC-2], [P-ACC-3], [P-ACC-4]: objetivos, contraste, letra y descripciones.
- [P-ACC-5], [P-ACC-6], [P-ACC-7]: modo oscuro, pantallas grandes y borde a borde.
- [P-ACC-8]: pruebas a mano y automáticas.
- [P-CON-1], [P-CON-2], [P-CON-3], [P-CON-4], [P-CON-7]: guía de pantallas de coche.
- [P-CON-5]: la regla del kit para el teléfono.
- No verificado [P-CON-6]: normas de tránsito de cada país.
- No verificado [P-CON-8]: si esas medidas obligan, bastan o sobran en un teléfono montado.

## Requisitos de referencia
R7 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
Sin ejemplo: usa `kit/plantillas/ADR.md` y anota qué pantallas se usan en marcha.
