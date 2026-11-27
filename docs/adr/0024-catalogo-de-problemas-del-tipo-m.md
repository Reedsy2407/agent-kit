# 0024. Catálogo de problemas del tipo M

Estado: aceptada (2026-11-26). Complementa los ADR 0013 (tipo B como guía de decisión), 0020 (catálogo del tipo C), 0021 (tipo M como guía), 0022 (diseño móvil) y 0023 (esqueleto Android).

## Contexto
El tipo M tenía guía, hechos de plataforma, diseño y un esqueleto, pero ningún sitio donde consultar un problema concreto al decidir o construir. Los tipos B y C lo resuelven con un catálogo de problemas. En el tipo M hay una diferencia: casi todo lo que condiciona una decisión son reglas de la plataforma y de la tienda, que cambian y que el kit ya reúne en un solo documento con fuente y fecha.

## Decisión
- **Dieciséis fichas en cinco grupos.** Sistema y segundo plano (trabajo en segundo plano y sus interrupciones, permisos, batería y rendimiento); datos, privacidad y confianza (ubicación, almacenamiento y secretos, cuenta e integridad, observabilidad); red y servidor (tiempo real y avisos, sin red, versiones y compatibilidad, acceso y solo consumo); personas y tienda (contenido de usuarios, accesibilidad y uso en marcha, publicación); construcción (arquitectura, pruebas y equipo real). Cada requisito de referencia, R1 a R7, tiene al menos una ficha; la de arquitectura no toca ninguno.
- **El formato de los tipos B y C, con dos cambios.** Se conservan problema, señales de que aplica y de que sobra, opciones con «no hacer nada» y su costo, cómo se comprueba, cómo suele resolverse, anti-patrones y ADR de ejemplo. Las «Notas por stack» se sustituyen por **«Hechos en que se apoya»** y se añade **«Requisitos de referencia»**.
- **Sin notas por stack.** El tipo M no impone stack y compara cuatro alternativas; notas por cada una repetirían hechos fuera de su documento o quedarían casi todas sin verificar. Lo propio de una alternativa se cita cuando hay un hecho.
- **Una sola fuente.** Las fichas no llevan cifras, fechas, direcciones ni versiones: citan identificadores de `types/M/PLATAFORMA-ANDROID.md`. Una cita de una fila sin verificar se escribe como «No verificado» y una prueba exige que coincida con el estado real de la fila; fuera de esa sección solo se citan filas verificadas.
- **Hechos nuevos, verificados en su fuente.** Se añadieron los grupos de trabajo en segundo plano y suspensión, cuentas e integridad, almacenamiento y secretos, reloj y actualizaciones, pruebas en equipos, rendimiento y registros, y filas sueltas de permisos, arquitectura, publicación y accesibilidad. Las páginas oficiales se leyeron el 2026-11-26 descargándolas y extrayendo su texto. Cinco filas nuevas quedan «No verificado» a propósito.
- **Fuentes:** documentación oficial de Android y de Google, la ayuda de la tienda y un proyecto público conocido, Now in Android, cuyo documento de arquitectura se leyó el 2026-11-26 en <https://github.com/android/nowinandroid/blob/main/docs/ArchitectureLearningJourney.md>. Se cita como referencia; no se copia código ni texto (ADR 0004).
- **Instalación como el catálogo del tipo C.** `--tipo M` copia las fichas a `kit/catalogo-m/`, los ejemplos a `kit/ejemplos-adr-m/` y la skill `consultar-catalogo`, que gana una rama del tipo M. Las rutas relativas de las fichas valen en el kit y en el proyecto. Los catálogos de B y C no cambian ni se instalan en el M.
- **Ocho ADR de ejemplo**, abstractos y sin datos de negocio. No todas las fichas tienen uno; las que no, lo dicen.

## Alternativas descartadas
| Alternativa | Por qué se descarta |
|---|---|
| Notas por stack como en B y C | Cuatro alternativas por dieciséis fichas, casi todas sin verificar, y hechos de plataforma repetidos fuera de su documento |
| Escribir las cifras y plazos en cada ficha | Las políticas cambian; con varias copias, algunas quedan mentidas |
| Una ficha por requisito y nada más | Dejaría fuera problemas que no son de ningún requisito (arquitectura, versiones, almacenamiento) |
| Separar accesibilidad y uso en marcha en dos fichas | Comparten comprobación y lista de revisión; la ficha dice cuándo sobra la parte de la marcha |
| Una skill de catálogo propia del tipo M | Duplicaría el método de consulta, que es el mismo |
| Un ADR de ejemplo por ficha | Relleno; los ejemplos sirven donde hay una decisión con alternativas claras |
| Copiar la estructura o textos de una app de referencia | El catálogo es de problemas; se toma el criterio |
| Escribir hechos de memoria y marcarlos como verificados | Es justo lo que el kit evita; lo no contrastado dice «No verificado» |

## Consecuencias
- Un proyecto del tipo M tiene una consulta por problema que apunta a los hechos que la condicionan y a lo que no se sabe.
- Dieciséis fichas y ocho ejemplos que mantener. Los hechos envejecen y varios tienen cambios anunciados; antes de apoyarse en uno se relee la fuente.
- Las fichas son reglas de juicio: ningún hook comprueba que un proyecto las siga ni que cumpla un requisito. Las pruebas del kit comprueban formato, citas, estados, enlaces, genericidad e instalación, no que un consejo sea bueno.
- El catálogo no se ha usado todavía en una app real.
- Un proyecto M ya instalado recibe las fichas al reinstalar, pero su guía, sus hechos y la skill de stack anteriores no se sobrescriben solos.

## Sin hacer
Probar las fichas en una app real; notas, esqueletos o presets de React Native, Flutter y el envoltorio web; cualquier comprobación automática de interfaz o de segundo plano en equipos; iOS y pantallas de coche. Siguen «No verificado», entre otras, las filas sobre veredictos de integridad en equipos sin los servicios de Google, costo de verificar un teléfono, claves de terceros dentro de la app, actualizaciones fuera de la tienda y gasto de batería en uso real.
