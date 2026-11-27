# Contrato del esqueleto Android del tipo M

Qué cumple el esqueleto `android-compose`, cómo se comprueba y qué **no** comprueba. Esta página es la única fuente de verdad de eso: el README del esqueleto la cita y no la repite. El esqueleto es **una de las salidas** de la guía (`kit/GUIA-DECISION.md`, «Stack proporcional»), no la obligatoria: el tipo M no impone stack. Es un punto de partida que compila y tiene pruebas, **no una app**: sin lógica de negocio.

Los hechos de Android y de sus herramientas se citan por identificador (`kit/PLATAFORMA-ANDROID.md`).

## Qué debe cumplir y cómo se comprueba
| Id | Debe cumplir | Cómo se comprueba |
|---|---|---|
| E1 | Tras instalarlo y generar el envoltorio de Gradle, el comando del preset `java-gradle` (`check`) termina bien y ejecuta al menos una prueba local [P-HER-1] | Verificador del kit (falla si no se ejecuta ninguna prueba) y la integración continua de ejemplo (ejecuta `check`, pero no cuenta las pruebas) |
| E2 | Llega **sin** el envoltorio de Gradle, sin binarios y sin claves; quien lo adopta lo genera, lo comprueba contra las sumas publicadas y lo versiona [P-HER-3] [P-HER-9] | Pruebas del kit (instalación) y verificador del kit (sumas) |
| E3 | Un módulo `app` con una sola pantalla vacía en Compose, dibujada de borde a borde dejando libres las barras del sistema [P-ACC-7] y siguiendo el modo oscuro del sistema [P-ACC-5] | La compilación; verlo exige un equipo (prueba instrumentada y revisión visual) |
| E4 | Los tokens del tema viven en un solo archivo, se declaran como ideas y ceden ante `design/DESIGN-BRIEF.md` si existe; una prueba local falla si las parejas de color o los escalones de letra **que enumera** bajan del mínimo [P-ACC-2] [P-ACC-3]. Al añadir un token se añade a la prueba | Prueba local dentro de `check` |
| E5 | No declara permisos de la plataforma, no usa la red, no trae claves ni configuración de firma, y excluye sus datos de la copia en la nube y de la transferencia entre equipos [P-PRI-6]; sus nombres son marcadores (`invalid.ejemplo.app`) | Pruebas del kit; el verificador lista los permisos del paquete compilado, donde puede aparecer el permiso propio que añade una biblioteca |
| E6 | Solo las dependencias que la pantalla y las dos pruebas necesitan, con las versiones fijadas en `gradle/libs.versions.toml` y la fila que las respalda | Pruebas del kit |
| E7 | El destino cumple el mínimo de la tienda [P-PUB-6] y las bibliotecas nativas que arrastre el paquete admiten el tamaño de página de memoria que exige la tienda [P-PUB-7] [P-HER-10] | Verificador del kit sobre el paquete de depuración |
| E8 | Una prueba de interfaz de ejemplo, marcada como instrumentada, que se compila | Verificador del kit y la integración continua de ejemplo (la compilan, no la ejecutan) |
| E9 | Se instala solo si la ficha declara `kit.preset`, no pisa lo que ya existe y no crea el envoltorio | Pruebas del kit |

## Qué NO comprueba
- **Nada en un equipo real.** No demuestra R1 (servicio de ubicación que sobreviva a los cierres), R2 (tiempo real sin conocer la posición) ni R7 (uso al volante): el esqueleto no los implementa y ni el emulador ni la máquina local bastan.
- **Las pruebas instrumentadas no se ejecutan**, ni en `check` ni en la integración continua de ejemplo.
- **Pantallas de coche** (Android Auto y Android Automotive OS), relojes, televisores e iOS.
- R3 a R6 (contenido de usuarios, acceso, publicación y privacidad): no hay cuentas, servidor, datos ni publicación.
- Publicación: no se firma, no se genera el paquete de la tienda ni se prueba una variante de publicación, ofuscación o reducción de código.
- El contraste y la letra de lo que la prueba no enumera: un token nuevo sin añadir, los estilos y colores que pone la biblioteca, el reparto de papeles en el tema y el uso que cada pantalla haga de ellos.
- Accesibilidad más allá de los tokens (tamaños táctiles, lector de pantalla, letra ampliada) y rendimiento.
- Que la app arranque en un equipo que use ese tamaño de página: solo se mira la alineación en el paquete.
- Que la exclusión de copia y transferencia se cumpla en un equipo: solo están escritas las reglas.

## Comandos
- Sello (preset `java-gradle`): `./gradlew --no-daemon check`; en Windows sin shell POSIX, `.\gradlew.bat --no-daemon check`.
- Compilar la app y las pruebas instrumentadas: `./gradlew --no-daemon assembleDebug assembleDebugAndroidTest`.
- Ejecutar las instrumentadas (con un equipo o un emulador): `./gradlew --no-daemon connectedAndroidTest`. Su resultado se registra aparte.
