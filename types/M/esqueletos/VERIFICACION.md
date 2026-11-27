# Verificación del esqueleto Android del tipo M

Registro con fecha de lo que se ejecutó de verdad. La verificación necesita un JDK, el SDK de Android, Gradle y red, y **no forma parte de `node --test`**: las pruebas del kit solo comprueban estructura, versiones coherentes, instalación y las funciones del verificador (`types/M/test/esqueleto.test.mjs`). El preset `java-gradle` del tipo M es «verificado» solo para lo que está aquí. Qué debe cumplir el esqueleto: `CONTRATO.md`.

## Cómo repetirla
```
node types/M/esqueletos/verificar.mjs android-compose [--gradle <ruta de gradle>] [--permitir-descargas] [--conservar]
```
Instala el esqueleto con el instalador en una carpeta temporal fuera del repositorio y comprueba, en orden: JDK, SDK y Gradle (si faltan, para y dice qué instalar; no instala ninguno); que el proyecto llega sin envoltorio, binarios, `build` ni `.gradle`; el envoltorio generado como dice el README y sus sumas (fijadas y publicadas); `check` en estricto (`--no-daemon --no-build-cache --refresh-dependencies`); las pruebas locales y el análisis estático; el comando del preset tal cual; la compilación de la app y de las pruebas instrumentadas; el paquete (destino, permisos, 16 KB); lo reutilizado y lo descargado; y el sello del kit. Salida: una línea `OK`, `FALLO`, `OMITIDO` o `DATO` por paso; `OMITIDO` no cuenta como verificado. Usa la caché de Gradle del usuario (`GRADLE_USER_HOME` o `~/.gradle`) y le añade archivos; la plataforma del SDK, si falta, solo se descarga con `--permitir-descargas`.

## Verificado el 2026-11-27
Fecha del script, en UTC (la noche del 26 en hora local de la máquina). Última ejecución, sobre el esqueleto definitivo y con el verificador definitivo: 2026-11-27T01:43Z, 25 pasos `OK`, ningún `FALLO` ni `OMITIDO`. Ejecutada desde la terminal del agente. La primera ejecución del día (01:13Z) marcó un `FALLO` que era un error del propio verificador al mirar los archivos versionados; se corrigió y no se ha repetido.

| Pieza | Versión o dato |
|---|---|
| Sistema | Windows 10 Pro 10.0.19045, x64; Node 22.23.4 |
| JDK | Amazon Corretto 21.0.9+10 (OpenJDK 21.0.9) |
| Gradle | 9.7.0 (generó el envoltorio y compiló con él) |
| Complemento de Android | 9.3.1 (resuelto) |
| Kotlin (complemento) | 2.4.21 (resuelto) |
| Compose | `ui` 1.13.0 y `material3` 1.5.0 (resueltos desde la lista de materiales 2026.11.01); `activity-compose` 1.13.0 |
| SDK de Android | plataforma `android-37.1`; build-tools 36.0.0 (la versión por defecto del complemento) |
| Paquete de depuración | `minSdk` 24, `targetSdk` 36, `compileSdk` 37 |

| Paso | Resultado |
|---|---|
| El instalador copia el esqueleto sin envoltorio, binarios, `build` ni `.gradle` | OK |
| `gradle wrapper` como dice el README | OK |
| `gradle-wrapper.jar` igual a la suma fijada, y las sumas publicadas de la distribución y del envoltorio iguales a las fijadas | OK |
| Estricto, desde un proyecto limpio: `.\gradlew.bat --no-daemon --no-build-cache --refresh-dependencies check` | OK: 33 tareas ejecutadas, ninguna de la caché de compilación |
| Pruebas locales dentro de `check` | OK: 3 pruebas, 0 fallos, 0 omitidas (`testDebugUnitTest`) |
| Análisis estático dentro de `check` | OK: 0 errores y 5 avisos (abajo) |
| Preset en `cmd`: `.\gradlew.bat --no-daemon check`, desde limpio | OK |
| Preset en la consola POSIX de git: `./gradlew --no-daemon check`, desde limpio | OK |
| `assembleDebug assembleDebugAndroidTest` | OK: app y pruebas instrumentadas **compiladas**, sin avisos del compilador |
| Destino del paquete frente al mínimo de la tienda `[P-PUB-6]` | OK: 36, mínimo 36 |
| Permisos del paquete compilado | Solo `…DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, un permiso propio que añade una biblioteca; ninguno de la plataforma |
| 16 KB: `zipalign -c -P 16 -v 4` | OK («Verification successful») |
| 16 KB: segmentos `LOAD` y `GNU_RELRO` de las bibliotecas de 64 bits del paquete | OK: dos, ambas `libandroidx.graphics.path.so`. Sin NDK, Gradle avisa de que no puede quitarles símbolos y las empaqueta tal cual |
| git: el envoltorio se versiona y la compilación se ignora | OK |
| git: `gradlew` queda versionado como ejecutable (modo 100755) | OK |

**Avisos del análisis estático** (aceptados): `targetSdk` por debajo del último (dos avisos; decisión del ADR 0023), hay un Gradle posterior (9.9.2) y un complemento de Android posterior (9.5.3), fuera de la tabla de compatibilidad de Kotlin, y la app no declara icono.

**Sello del kit en Windows** (el sello lanza los comandos con `cmd`):
| `kit.checks` | Resultado |
|---|---|
| `./gradlew --no-daemon check` (preset sin cambios) | **Sin sello:** `cmd` no entiende `./` |
| `gradlew.bat --no-daemon check` | **Sin sello** en esta sesión, que tiene `NoDefaultCurrentDirectoryInExePath` (`cmd` no busca en la carpeta actual) |
| `.\gradlew.bat --no-daemon check` | OK: sello con gitleaks limpio |

No se probó `gradlew.bat` a secas en una sesión sin esa variable.

## Qué se reutilizó de la caché y qué se descargó
Por decisión del humano se usó su `~/.gradle`: **caché de dependencias reutilizada y revalidada**, no una resolución sin caché. Antes tenía 1072 archivos de dependencias (636,1 MB), la distribución 8.13 y ningún `gradle.properties` ni guion de inicio; el SDK tenía la plataforma `android-36`.

**Descargado para esta etapa**, autorizado por el humano:
- La distribución de Gradle 9.7.0, una vez, comprobando su suma: el envoltorio 8.13 que ya había generó en una carpeta vacía y temporal un envoltorio que la bajó a `~/.gradle/wrapper/dists`.
- La plataforma `android-37.1`, que instaló el complemento de Android en la primera ejecución estricta (licencia aceptada antes).
- 718 archivos de dependencias nuevos (359,2 MB). No se borró ni cambió de tamaño ninguno de los que había.

**Primera ejecución estricta** (2026-11-27T01:13Z, la que trajo las dependencias; recursos pedidos a los servidores):
| Origen | Recursos |
|---|---|
| Revalidados desde la caché de Gradle y ya presentes antes de la etapa | 168 |
| Revalidados desde la caché, bajados minutos antes al generar el envoltorio | 127 |
| Descargados (318 del registro de Google y 83 de Maven Central); ninguno estaba ya en la caché | 401 |
| Copiados del repositorio Maven del usuario (`~/.m2`) tras comprobar la suma contra el servidor | 44 |
| Consultas sin resultado | 107 |

De los artefactos que el proyecto resuelve (listado con `--write-verification-metadata`, solo para este informe): **269 (89,0 MB) ya estaban** en la caché y **549 (358,5 MB) no estaban**. Aquella primera ejecución listó además tres POM y listas de materiales padres.

**Última ejecución estricta** (sobre el esqueleto definitivo): **0 recursos descargados**; 168 revalidados que ya estaban antes de la etapa y 572 bajados en las ejecuciones anteriores. Entre la primera y la última cambiaron el manifiesto, las reglas de extracción, la prueba instrumentada, un comentario de la prueba local y el README del esqueleto; no las dependencias.

## Red y certificados
En esta máquina un programa inspecciona el tráfico cifrado y Java, con su almacén, no validaba (`PKIX path building failed` contra `services.gradle.org`). El verificador prueba primero la configuración habitual y, solo si falla por el certificado, hace que Java use el almacén del sistema (`-Djavax.net.ssl.trustStoreType=Windows-ROOT`, en `GRADLE_OPTS` y solo en sus comandos). Nunca desactiva la verificación y no cambia la configuración del equipo.

## Integración continua
Ejecutada en un servicio de integración continua alojado, en un repositorio de prueba privado que solo contenía el proyecto de ejemplo (el esqueleto, el envoltorio generado, `.gitattributes` y `.gitignore`; 24 archivos, autor neutro, sin secretos). Los resultados se leyeron de los trabajos reales.

| Ejecución | Contenido | Resultado |
|---|---|---|
| Primera (2026-11-27T01:26Z) | esqueleto anterior a los dos últimos cambios (el atributo `fullBackupContent` y la función vigente en la prueba instrumentada) | Éxito (3 min 27 s). Sin caché previa: la acción del JDK no la encontró, así que **las dependencias se resolvieron sin caché** |
| Segunda (2026-11-27T01:31Z) | esqueleto con esos dos cambios | Éxito (2 min 6 s), restaurando la caché de dependencias de la primera |
| Tercera (2026-11-27T01:47Z) | **esqueleto definitivo** (cambian el README y un comentario de la prueba local) | Éxito (1 min 50 s), con la misma caché; el JDK, Gradle y los pasos, iguales |

Entorno de las tres: ejecutor Linux `ubuntu-26.04` (imagen 20261116.202.1), Temurin 21.0.13+9, Gradle 9.7.0. Pasos: validación del envoltorio (reconocido como conocido), `./gradlew --no-daemon check` (33 tareas, `testDebugUnitTest` incluida; el trabajo no imprime cuántas pruebas) y `assembleDebug assembleDebugAndroidTest` (67 tareas). La compilación no instaló paquetes del SDK. Acciones usadas, por versión mayor: `actions/checkout@v7`, `gradle/actions/wrapper-validation@v6` y `actions/setup-java@v6` (las publicadas el 2026-11-26 eran 7.0.1, 6.4.1 y 6.3.0; sus direcciones, en el ADR 0023 del kit). Comprueba que siguen vigentes al usarlas.

No ejecutado en la integración continua: Windows y macOS, el disparo manual y por `pull_request`, las pruebas instrumentadas y la comprobación de 16 KB.

## Qué NO está verificado
- **Nada en un equipo real ni en un emulador.** La app no se instaló ni se arrancó. R1, R2 y R7 necesitan un equipo real y el esqueleto no los implementa.
- **Las pruebas instrumentadas** se compilan; nunca se ejecutaron.
- **Pantallas de coche** (Android Auto y Automotive OS), relojes, televisores e iOS.
- Publicación: ninguna variante de publicación, firma, paquete de la tienda ni reducción de código.
- El sello del kit y el verificador en macOS o Linux.
- Una resolución sin caché en Windows (en Linux, solo la primera ejecución de la integración continua).
- Las dos líneas de PowerShell del README para comparar sumas: no se ejecutaron (la comparación se hizo con el verificador y con las líneas POSIX).
- Sumas publicadas para los guiones `gradlew` y `gradlew.bat`: no se encontraron.
- La exclusión de copia y transferencia en un equipo, y el arranque en un equipo con páginas de 16 KB.

## Requisitos de referencia
| Requisito | Estado en el esqueleto |
|---|---|
| R1 (ubicación en primer plano) | No implementado ni comprobado |
| R2 (tiempo real sin conocer la posición) | No implementado ni comprobado |
| R3 (contenido de usuarios) | No implementado |
| R4 (acceso decidido por el servidor) | No implementado |
| R5 (publicación) | Solo destino y alineación de 16 KB, comprobados sobre el paquete de depuración; sin firma ni publicación |
| R6 (privacidad desde el diseño) | Sin permisos de la plataforma ni red; copia y transferencia excluidas por reglas, sin probar en un equipo |
| R7 (uso al volante) | No implementado ni comprobado |
