# App Android en Kotlin y Compose (esqueleto)

Un módulo, una pantalla vacía, un tema con tokens, una prueba local y una prueba instrumentada de ejemplo. Es **una de las salidas** de la guía del tipo M, no la obligatoria, y **no es una app**: sin lógica de negocio. Lo que cumple, cómo se comprueba y lo que no comprueba está en `kit/CONTRATO-ESQUELETOS.md`; los hechos citados (`[P-…]`), en `kit/PLATAFORMA-ANDROID.md`.

## Qué necesitas
- Un JDK 17 o superior [P-HER-4] y el SDK de Android con la plataforma `android-37.1` y las build-tools `36.0.0` [P-HER-4] [P-HER-7]. Si falta un paquete y su licencia ya está aceptada, la compilación puede descargarlo [P-HER-11].
- Un Gradle instalado, solo para generar el envoltorio [P-HER-3]: 9.5.0 o superior, que es lo que pide el complemento de Android del proyecto [P-HER-4]. Versión probada: **9.7.0**.

## 1. Genera el envoltorio de Gradle
El esqueleto llega **sin** `gradlew`, `gradlew.bat` ni `gradle/wrapper/`: incluyen un binario que el kit no distribuye. En la carpeta del proyecto, con tu Gradle instalado:

```
gradle wrapper --gradle-version 9.7.0 --distribution-type bin --gradle-distribution-sha256-sum 84fbba45c7f4c64abc77460e1c00f541e9f960e3c7ed2538f1ede19eacd873ae
```

La suma es la publicada para `gradle-9.7.0-bin.zip` [P-HER-9]: el envoltorio la comprueba al descargar la distribución. Si bajas Gradle a mano para generar el envoltorio, compara antes la suma del ZIP con la publicada.

## 2. Comprueba que el envoltorio es el oficial
La suma de `gradle/wrapper/gradle-wrapper.jar` debe ser igual a la publicada para la versión **9.7.0** [P-HER-9]:

```
7a9ce74cff467ca1bf60a4fcd9f05185acceda4d0f382434d393e17864262c5d
```

En PowerShell, las dos líneas deben mostrar lo mismo (**No verificado:** estas dos líneas no se ejecutaron; las de la consola POSIX, sí):
```
(Get-FileHash gradle\wrapper\gradle-wrapper.jar -Algorithm SHA256).Hash.ToLower()
(Invoke-RestMethod -TimeoutSec 60 https://services.gradle.org/distributions/gradle-9.7.0-wrapper.jar.sha256).Trim()
```
En una consola POSIX (en macOS, `shasum -a 256` en lugar de `sha256sum`):
```
sha256sum gradle/wrapper/gradle-wrapper.jar
curl -sSL --max-time 60 https://services.gradle.org/distributions/gradle-9.7.0-wrapper.jar.sha256
```
Comprueba además que `gradle/wrapper/gradle-wrapper.properties` apunta a `services.gradle.org` y conserva `distributionSha256Sum`. Para los guiones `gradlew` y `gradlew.bat` no se encontró una suma publicada (**No verificado**): salen de la distribución cuya suma comprobaste; léelos antes de versionarlos. Si subes de versión, cambia las sumas por las de la versión nueva.

## 3. Versiona el envoltorio
Añade a `.gitattributes` (sin esto, `gradlew.bat` quedaría con fines de línea de otro sistema):
```
*.bat text eol=crlf
*.jar binary
```
Y marca el guion como ejecutable, que en Windows no ocurre solo:
```
git add .gitattributes gradlew gradlew.bat gradle/wrapper
git update-index --chmod=+x gradlew
```
Sin ese permiso, la integración continua en Linux no puede ejecutar `./gradlew`.

## 4. Cambia los marcadores
`invalid.ejemplo.app` (en `app/build.gradle.kts` y en las carpetas y paquetes de Kotlin), `rootProject.name` en `settings.gradle.kts` y los textos de `app/src/main/res/values/strings.xml`. Los tokens del tema (`tema/Tokens.kt`) son provisionales: si existe `design/DESIGN-BRIEF.md`, manda ese archivo.

## Comprobaciones
```
./gradlew --no-daemon check                                     # el comando del preset
./gradlew --no-daemon assembleDebug assembleDebugAndroidTest    # compila la app y las pruebas instrumentadas
./gradlew --no-daemon connectedAndroidTest                      # las ejecuta: necesita un equipo o un emulador
```
`check` hace el análisis estático y las pruebas locales; **no** ejecuta las instrumentadas [P-HER-1].

**Sello del kit.** Tras declarar el preset y reinstalar, vuelve a generar `.claude/` desde la ficha: reinstalar no sobrescribe `.claude/kit.json` y sin eso el sello sigue sin comprobaciones (el comando está en `kit/GUIA-DECISION.md`, «Esqueleto Android»).

**En Windows,** el sello lanza los comandos con `cmd`, que no entiende `./gradlew`. Escribe en `kit.checks` de `kit/FICHA-INFRA.json` el comando `.\gradlew.bat --no-daemon check` (en el archivo, con la barra invertida duplicada), autorízalo en `permisos.permitidos` y vuelve a generar. El `.\` importa: en una sesión que no busca programas en la carpeta actual, `gradlew.bat` a secas no se encuentra.

**Si Java no valida los certificados** (`PKIX path building failed`), suele ser un programa del equipo que inspecciona el tráfico cifrado. **No desactives la verificación.** En Windows puedes hacer que Java use el almacén del sistema [P-HER-12] con la variable `GRADLE_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT`.

**Páginas de memoria de 16 KB** [P-PUB-7]: el paquete arrastra bibliotecas nativas aunque no escribas código nativo. Al añadir o subir dependencias, repite la comprobación [P-HER-10].

## Estructura
| Ruta | Qué hay |
|---|---|
| `settings.gradle.kts`, `build.gradle.kts` | fuentes de dependencias y complementos |
| `gradle/libs.versions.toml` | **todas** las versiones, con la fila que las respalda |
| `app/build.gradle.kts` | la app: versiones de Android, dependencias y ejecutor de las pruebas instrumentadas |
| `app/src/main/` | manifiesto sin permisos, reglas que excluyen los datos de copias y transferencias, `MainActivity`, la pantalla vacía y el tema |
| `app/src/test/` | prueba local de las parejas de color y los escalones de letra que enumera; al añadir un token, añádelo a la prueba |
| `app/src/androidTest/` | prueba **instrumentada** de interfaz, de ejemplo |
| `.github/workflows/ci.yml` | integración continua de ejemplo |

## Integración continua de ejemplo
Comprueba el envoltorio, ejecuta el comando del preset y compila las pruebas instrumentadas, en Linux y sin secretos. Necesita el envoltorio versionado (pasos 1 a 3). No ejecuta pruebas instrumentadas, no firma ni publica. Para guardar dependencias entre ejecuciones usa la caché de la acción del JDK; no usa otras cachés.

## Límites conocidos
- Nada se ha probado en un equipo ni en un emulador: ver «Qué NO comprueba» en el contrato.
- Sin variante de publicación configurada: no hay firma, reducción de código ni paquete para la tienda [P-PUB-4] [P-PUB-5].
- Sin icono propio ni pantalla de carga: llegan con el diseño del proyecto.
- Las versiones envejecen. Al subir una, relee la tabla de compatibilidad [P-HER-4] [P-HER-6] y vuelve a ejecutar las comprobaciones.

## Qué no construir todavía
| Qué | Señal para construirlo |
|---|---|
| Más módulos o una capa de dominio | El código ya no se entiende en un módulo [P-ARQ-4] |
| Navegación entre pantallas | Hay una segunda pantalla real |
| Inyección de dependencias con biblioteca | Crear los objetos a mano ya causa errores |
| Red, base de datos o segundo plano | Una funcionalidad especificada que lo pida, con su decisión escrita |
| Configuración de firma y publicación | El humano tiene la cuenta y las claves, fuera del control de versiones |
| Verificación de dependencias de Gradle | El proyecto va a publicarse y alguien mantendrá las sumas |
