# 0020. Catálogo de problemas del tipo C

Estado: aceptada (2026-10-30). Complementa los ADR 0013 (catálogo del tipo B), 0016 (notas por stack verificadas), 0018 (tipo C como guía de decisión) y 0019 (esqueletos y activación del tipo C).

## Contexto
El tipo C ya tenía guía de decisión y tres esqueletos, pero no el equivalente del catálogo del tipo B: un lugar donde mirar, cuando aparece un problema concreto, cuándo aplica, cuándo sobra, qué opciones hay y cómo se comprueba. Los problemas de una herramienta instalada en máquinas ajenas no son los de un servicio: ciclo de vida del proceso, canal de control, contrato del CLI, entrada no confiable, privilegios, secretos en el equipo del usuario, empaquetado e integridad. El material de partida fue un inventario privado de problemas observados en repositorios pequeños de un solo autor; sirvió para saber qué problemas aparecen, no como solución, y nada de él se versiona ni se cita.

## Decisión
- **Dieciocho fichas** en `types/C/catalogo/`, en seis grupos de tres, con el formato del tipo B (problema, señales de que aplica, señales de que sobra, opciones con «no hacer nada», cómo se comprueba, cómo suele resolverse, anti-patrones, notas por stack, ADR de ejemplo):
  1. Ciclo de vida: recarga de configuración en caliente; supervisión de procesos hijos con política de reinicio; apagado ordenado.
  2. Control y contrato: control local de un daemon; contrato de un CLI; configuración validada al arrancar y protección de su archivo.
  3. Datos y entrada/salida: concurrencia y contrapresión; persistencia en disco; entrada no confiable en protocolos.
  4. Pruebas y extensión: propiedades y fuzzing para analizadores; extensibilidad; código de terceros con confinamiento y límites.
  5. Seguridad por defecto: secretos en la máquina del usuario; privilegios mínimos; autenticación de APIs de control.
  6. Operación: registro estructurado con rotación y sin datos sensibles; empaquetado y releases multiplataforma; cambios reversibles.
  Cada ficha debe poder aplicarse a una herramienta real del tipo C; no se inventaron problemas para llegar al número.
- **Abstractas y defensivas.** Sin código, cifras ni anécdotas fuera de las notas por stack; sin nombres de proyectos, autores ni organizaciones. Las fichas de seguridad (entrada no confiable, confinamiento, secretos, privilegios, autenticación) describen límites, plazos y privilegios mínimos; ninguna describe técnicas de ataque ni cargas útiles, y ninguna sustituye la puerta de uso responsable del ADR 0018. Una prueba comprueba el vocabulario, la ausencia de cifras fuera de las notas y de código, y que las frases no se copien del material privado local (secuencias de siete palabras).
- **Notas por stack de Go, Python y Rust con tres estados**, como en el ADR 0016: «Verificado el AAAA-MM-DD» con enlace https a la fuente oficial y solo lo que la fuente dice; «Comprobado ejecutando el esqueleto» con la fecha y el registro `types/C/esqueletos/VERIFICACION.md`, y solo lo que ese registro recoge (lo que no se ejecutó en la máquina de verificación se dice: permisos POSIX, código POSIX de Rust, señal de punta a punta en Windows, flujos de publicación); y «No verificado» para todo lo demás (bibliotecas de terceros, equivalentes de Windows, detalles que la fuente consultada no trata). Las fuentes se consultaron en línea el 2026-10-30 y se leyeron solo; una prueba exige que cada nota tenga uno de los tres estados y que haya al menos treinta y cinco notas verificadas con fuente.
- **Siete ADR de ejemplo** breves y abstractos en `types/C/ejemplos-adr-c/` (uno ya existía, de C1) y cada uno enlazado desde la ficha que ilustra. La carpeta se renombró de `ejemplos-adr` a `ejemplos-adr-c` para que los enlaces relativos de las fichas valgan igual en el kit y en el proyecto instalado. Las fichas sin ADR de ejemplo lo dicen («Ninguno todavía»), como en el tipo B.
- **Instalación y skill.** El manifiesto del tipo C copia el catálogo a `kit/catalogo-c/` y la skill `consultar-catalogo`; el tipo B conserva `kit/catalogo/` y no recibe el del C. La skill gana una rama del tipo C (ruta, estados de las notas, carácter defensivo, la puerta de uso responsable manda, no hay casos privados en el tipo C); no se crean skills nuevas, y el empaquetado queda cubierto por su ficha y no por una skill de publicación.
- **El tipo C deja de llamarse «en construcción».** Con guía, tres esqueletos y catálogo, ya no falta nada que construir; lo que falta es comprobar (SIGTERM de punta a punta en Windows, `go test -race`, el código POSIX de Rust, Python 3.14 y Linux o macOS, los flujos de integración continua y `cargo audit`), y eso está registrado como pendiente conocido en el HANDOFF y en `VERIFICACION.md`, no como obra pendiente.

## Alternativas descartadas
| Alternativa | Por qué se descarta |
|---|---|
| Reutilizar el catálogo del tipo B | Sus problemas son los de un servicio (consistencia, eventos, multi-inquilino); los de una herramienta instalada no aparecen |
| Fichas por lenguaje (una para Go, otra para Python, otra para Rust) | Los problemas son los mismos; lo propio de cada lenguaje cabe en las notas por stack |
| Un catálogo de técnicas ofensivas para «entender al atacante» | Fuera del kit por decisión del ADR 0018; la defensa se describe por límites y privilegios, no por técnicas |
| Instalar un único catálogo con los dos tipos | Un proyecto vería problemas que no son suyos y las rutas de la skill serían ambiguas |
| Una skill de publicación aparte | El empaquetado y las sumas ya tienen su ficha; otra skill duplicaría la regla |
| Verificar todas las notas | Muchas dependen de bibliotecas de terceros o de plataformas que no se pueden probar aquí; se marcan «No verificado» y se contrastan al adoptarlas |

## Consecuencias
- Quien decide cómo resolver un problema de una herramienta tiene un punto de partida con costos y comprobaciones, y sabe qué parte de cada nota está contrastada.
- Las fuentes envejecen: cada nota lleva su fecha para que se vea cuánto pesa, y las versiones cambian.
- La revisión de las fichas tuvo límites: los revisores internos no pudieron consultar la red; las fuentes las contrastó quien escribió las notas, en línea y en solo lectura.
- Los siete ADR de ejemplo se mantienen a mano; si el catálogo crece, conviene decidir cuáles merecen uno.

## Sin hacer
Notas por stack para más lenguajes, verificación de las notas «No verificado», ADR de ejemplo para las fichas que no lo tienen y las comprobaciones de plataforma pendientes del HANDOFF.
