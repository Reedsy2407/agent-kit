# 0023. Esqueleto Android del tipo M, envoltorio fuera del kit y preset verificado

Estado: aceptada (2026-11-26). Complementa los ADR 0004 (nada de terceros), 0016 (esqueletos por stack), 0019 (esqueletos del tipo C) y 0021 (tipo M como guía de decisión).

## Contexto
El tipo M era una guía sin punto de partida y con su único preset (`java-gradle`) sin verificar. Un esqueleto Android trae dos problemas que los otros no tenían: la forma oficial de compilar (el envoltorio de Gradle) incluye un binario y guiones, y la verificación necesita un JDK, el SDK de Android y varias descargas. Además, tener un esqueleto de una sola alternativa podría empujar la elección de stack, que el tipo M deja al humano.

## Decisión
- **Kotlin con Compose, como una de las salidas.** El primer esqueleto (`types/M/esqueletos/android-compose/`) usa la primera alternativa que la guía compara para lo que toca el sistema operativo. El manifiesto lo declara como una de varias salidas, la guía y la skill `elegir-stack-proporcional` dicen que su existencia no es una razón para elegirlo, y solo se instala si la ficha declara `kit.preset` `java-gradle` (convención del ADR 0016). React Native, Flutter y el envoltorio web siguen sin esqueleto ni preset.
- **Mínimo y sin negocio.** Un módulo, una pantalla vacía, tokens como ideas que ceden ante `design/DESIGN-BRIEF.md`, una prueba local que vigila el contraste y la letra mínima de las parejas y escalones que enumera (no de los estilos de la biblioteca), una prueba de interfaz instrumentada de ejemplo, sin permisos, sin red, sin firma y con los datos excluidos de copias y transferencias. Dependencias: Compose (interfaz y Material 3), actividad con Compose, JUnit, el ejecutor y las pruebas de Compose. El contrato (`types/M/esqueletos/CONTRATO.md`, instalado como `kit/CONTRATO-ESQUELETOS.md`) dice qué cumple, cómo se comprueba y qué no.
- **El envoltorio de Gradle queda fuera del kit.** Quien adopta lo genera con `gradle wrapper`, comprueba el binario contra la suma publicada y lo versiona en su proyecto; el README lo explica paso a paso. El instalador no copia nunca `gradlew`, `gradle/wrapper/`, binarios, claves ni restos de compilación, aunque existan en el disco del kit, y `.gitignore` impide versionarlos aquí. La versión y las sumas viven en `esqueleto.json`, el README y la fila `[P-HER-9]`, y una prueba falla si difieren.
- **Versiones: el conjunto más nuevo dentro de las tres tablas de compatibilidad**, no lo último publicado. Gradle 9.7.0, complemento de Android 9.3.1, Kotlin y compilador de Compose 2.4.21, lista de materiales de Compose 2026.11.01, `compileSdk` 37.1, destino 36 y mínimo 24, con JDK 21 en la verificación. Ese día había Gradle 9.9.2 y complemento de Android 9.5.3, fuera de la tabla de soporte de Kotlin. Las versiones viven en `gradle/libs.versions.toml` y las razones en `types/M/PLATAFORMA-ANDROID.md`.
- **Destino 36.** Cumple el mínimo de la tienda; subirlo cambia el comportamiento de la app y se decide en cada proyecto. El análisis estático lo avisa y se acepta.
- **Verificación en Windows, de verdad.** `node types/M/esqueletos/verificar.mjs android-compose` instala el esqueleto en una carpeta temporal, genera el envoltorio como dice el README, compara sumas, ejecuta `check` en estricto y el comando del preset, compila la app y las pruebas instrumentadas, revisa el paquete (destino, permisos, páginas de 16 KB) y obtiene el sello del kit. No instala nada: si falta algo lo dice; la plataforma del SDK solo se descarga con `--permitir-descargas`. Usa la caché de Gradle del usuario, por decisión del humano, e informa de qué reutilizó y qué descargó.
- **El preset `java-gradle` tiene dos estados.** En el tipo M es un preset propio, verificado solo sobre este esqueleto, con las versiones y límites registrados; en el tipo B sigue sin verificar, porque nunca se ejecutó sobre un servicio.
- **Sello en Windows: `.\gradlew.bat --no-daemon check`.** La ejecución mostró que el sello (que usa `cmd`) no entiende `./gradlew`, y que `gradlew.bat` a secas tampoco se encuentra cuando la sesión tiene `NoDefaultCurrentDirectoryInExePath`. La guía, el contrato y el README lo corrigen; el sello no cambia.
- **TLS inspeccionado sin desactivar nada.** Java no validaba los certificados en la máquina de verificación; el verificador prueba primero la configuración habitual y solo entonces usa el almacén del sistema, y solo en sus comandos.
- **Integración continua de ejemplo.** Un trabajo en Linux: comprueba el envoltorio (acción oficial de Gradle para validarlo), instala el JDK con la acción oficial, que guarda las dependencias, ejecuta el comando del preset y compila las pruebas instrumentadas. Acciones fijadas por versión mayor, solo lectura, sin secretos. No usa `setup-gradle`: según su documento de distribución, la caché que trae activada por defecto es un componente propietario, sujeto a condiciones de uso propias, y la básica es de código abierto (<https://github.com/gradle/actions/blob/v6.4.1/DISTRIBUTION.md>, leído el 2026-11-26). Versiones publicadas ese día de las acciones usadas: <https://github.com/actions/checkout/releases/tag/v7.0.1>, <https://github.com/gradle/actions/releases/tag/v6.4.1> y <https://github.com/actions/setup-java/releases/tag/v6.3.0> (consultadas el 2026-11-26). Se ejecutó en un repositorio de prueba (registro en `VERIFICACION.md`).

## Alternativas descartadas
| Alternativa | Por qué se descarta |
|---|---|
| Incluir el envoltorio en el kit | El kit no distribuye binarios ni scripts de terceros (ADR 0004); un binario copiado envejece y nadie lo comprobaría |
| Que el instalador descargue Gradle o genere el envoltorio | Instalar el kit pasaría a necesitar red y a ejecutar herramientas de terceros; hoy solo copia |
| Un preset con el Gradle del equipo (`gradle check`) | Cada máquina compilaría con una versión distinta; el sello perdería su sentido |
| Un esqueleto en React Native o Flutter primero | Traen su propia cadena de herramientas además de Android; lo central de los requisitos de referencia (R1) toca el sistema. Siguen siendo salidas válidas y sin esqueleto |
| Un esqueleto «agnóstico» o varios a la vez | No habría nada que compilar de verdad, o varias verificaciones a medias |
| Lo último publicado de cada herramienta | Queda fuera de la tabla de soporte de Kotlin |
| Una versión de Compose que compile con la plataforma ya instalada | Se fijaría un conjunto antiguo solo por no descargar una plataforma |
| No verificar y dejar el preset «no verificado» | Había JDK y SDK en la máquina y el humano autorizó las descargas que faltaban |
| Verificar solo en un contenedor o en Linux | El caso difícil del sello es Windows, y allí apareció el fallo del comando |
| Cambiar el sello para que use una consola POSIX en Windows | Cambiaría el comportamiento de todos los tipos; basta escribir el comando correcto |
| Marcar verificado también el preset del tipo B | Un esqueleto de app no demuestra nada sobre un servicio |
| Analizar `design/DESIGN-BRIEF.md` para generar los tokens | El brief son ideas en texto; convertirlas es una decisión de quien construye |
| Ejecutar las pruebas instrumentadas con un emulador | Fuera del alcance de la etapa; el contrato dice que no se ejecutan |

## Consecuencias
- Un proyecto del tipo M que elija Kotlin con Compose arranca con algo que compila, se prueba y obtiene sello, tras pasos manuales: generar el envoltorio, regenerar `.claude/` desde la ficha (reinstalar no sobrescribe `.claude/kit.json`) y, en Windows, escribir el comando en `kit.checks`. Con el preset sin cambios el sello falla en `cmd` sin decir por qué; el instalador lo avisa.
- Un proyecto M ya instalado que declare `java-gradle` y vuelva a instalar recibirá archivos nuevos del esqueleto junto a los suyos: se revisa con `--dry-run`. Nada se sobrescribe.
- Hay un conjunto de versiones más que mantener. Al subirlas se releen las tablas, se repite `verificar.mjs` y se actualiza `VERIFICACION.md`.
- La verificación descubrió dos cosas que la guía decía mal o no decía (el comando del sello en Windows y la transferencia entre equipos con la copia desactivada); ambas quedan corregidas.
- La guarda de comandos exige tiempo máximo a `./gradlew`, pero no a `.\gradlew.bat`, `gradlew.bat` ni `./gradlew.bat` (comprobado el 2026-11-26). Es anterior a esta etapa y no se cambia aquí; queda como pendiente. El sello pone su propio tiempo máximo.

## Sin hacer
Equipo real para R1, R2 y R7; ejecución de las pruebas instrumentadas; variante de publicación (firma, paquete de la tienda, reducción de código); el sello en macOS o Linux; pantallas de coche; esqueletos de las otras alternativas; catálogo del tipo M (etapa M3).
