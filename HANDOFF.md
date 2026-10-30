# Handoff — agent-kit (0.9.1, etapa C2.1)

Plantilla de arranque para una terminal nueva en este repo. Léelo primero; es corto a propósito. Reglas: `CLAUDE.md`. Decisiones: `docs/adr/`. Referencias oficiales consultadas: sección «Referencias» del `README.md`.

## Estado
- Etapa 1 cerrada: núcleo (`core/`), diseño (`design/`), ficha de infra y generador (`infra/`), manifiestos (`types/A`, `types/B`) e instalador (`install/`).
- Etapa 2A cerrada: lecciones de la primera aplicación real del tipo A (un portafolio).
- Etapa 2B cerrada: biblioteca de front reutilizable (`front/`, presets, patrones, skills, `design/FRONTEND.md`). ADR 0001 a 0011.
- Etapa 2C cerrada: arreglos de uso real (instalador con `--diff`, `--forzar=ruta` y ficha fusionada; datos privados fuera del repositorio; contraste de textura real; clics por ancho; licencias por familia). ADR 0012.
- Etapa 2D cerrada: tipo B como guía de decisión (ADR 0013): skills `evaluar-viabilidad`, `elegir-stack-proporcional` y `consultar-catalogo`, catálogo de dieciocho problemas (`types/B/catalogo/`), ADR de ejemplo, `GUIA-DECISION.md`, front por URL, instalador con lo privado solo si git lo ignora, pruebas de pureza, y los pendientes de la 0.3.1 (capas de textura apiladas, `pruebas.<id>: false`, resumen en `--diff`).
- Etapa 2E cerrada: auto-aplicación (`node install/install.mjs --auto`, ADR 0014), `ops/` con la skill `operar`, plantillas y `scripts/salud.mjs` (ADR 0015), presets de sello por stack (`kit.preset`: java-maven, java-gradle, dotnet, node, python; solo `node` verificado), `scripts/sondeo-acceso.mjs` para la viabilidad del tipo B, y la limpieza de nombres ajenos en las pruebas con pureza ampliada a todo lo versionado.
- Etapa 2F cerrada: esqueletos ejecutables por stack (`types/B/esqueletos/`: `java-spring`, `dotnet`, `node`, `python`; ADR 0016), instalados solo si la ficha declara `kit.preset` del stack; registro de verificación con fecha en `types/B/esqueletos/VERIFICACION.md` (repetible con `node types/B/esqueletos/verificar.mjs <stack>`, necesita red y no forma parte de `node --test`); presets `node`, `java-maven`, `dotnet` y `python` verificados; notas por stack del catálogo con fuente y fecha (o «No verificado»).
- Etapa 2G cerrada: alineación con la copia pública y `infra/exportar-publico.mjs` (`infra/PUBLICAR.md`; nunca hace push; se detiene ante material privado, términos de la lista local, secretos o correos no permitidos; no exporta el propio script, su prueba ni `PUBLICAR.md`).
- Etapa 2H cerrada: especificar antes de construir (ADR 0017). Skill de núcleo `especificar-funcionalidad` y plantilla `kit/plantillas/ESPECIFICACION.md` (instaladas en A y B): `docs/specs/<nombre>.md` con criterios `CA-n` y tabla de contraste con las rebanadas; `prompt-de-modulo` y `cierre-de-modulo` los citan. Es una guía, no un hook (límite dicho en el ADR). Orden: viabilidad o brief → (stack, en B) → especificar → prompt del módulo → construir → cierre.
- Etapa C1 cerrada: tipo C (herramientas y software de sistemas) como guía de decisión (ADR 0018; `types/C/`). Ramas C en `evaluar-viabilidad` (sección 7: puerta de uso responsable y seis ejes; GO, REDISEÑO o NO-GO) y `elegir-stack-proporcional` (sección 8: Go, Rust, Python). No hay tipo D. El instalador no instala el tipo C y el generador de fichas no lo acepta hasta C2. Quedan C2 a C5: esqueletos (Go, Rust), catálogo de problemas, ficha y preset de sello, instalación.
- Etapa C2 cerrada: el tipo C se instala (`--tipo C`) y trae esqueletos ejecutables de Go, Python y Rust con un contrato común (ADR 0019; `types/C/esqueletos/`). Presets del sello por tipo (`go`, `python`, `rust` solo en el tipo C). Verificación repetible: `node types/C/esqueletos/verificar.mjs <go|python|rust>` (necesita las herramientas del stack; registro en `VERIFICACION.md`). El tipo C sigue «en construcción» en la documentación: faltan el catálogo de problemas y las notas por lenguaje (C3 y C4). Material privado del tipo C en `types/C/casos-privados/` (ignorada).
- Tipos A y B disponibles. El tipo B no impone stack: su ficha deja `kit.checks` vacío hasta que el proyecto elija el suyo (sin pruebas el sello se niega).
- Pruebas: `node --test` (sin dependencias, ADR 0001/0004).
- El kit se aplica a sí mismo: `.claude/` (hooks, agentes, skills, `kit.json`), `kit/FICHA-INFRA.json` y `.claude/settings.local.generado.json` están **generados** desde `core/` y `infra/ficha-kit.json` con `node install/install.mjs --auto`; una prueba falla si se desvían (tras tocar `core/` o la ficha del kit, corre `--auto` y commitea). Para activar las reglas en esta carpeta el humano copia `.claude/settings.local.generado.json` sobre `.claude/settings.local.json` (git lo ignora; el agente no puede editarlo). Instalar en otro proyecto sigue siendo decisión del humano (empezar con `--dry-run`).

## Lecciones del portafolio que ya están en el kit
- **Diseño:** el perfil de expresión («sobrio» o «expresivo») es obligatorio en el brief (tipo A parte de expresivo, B de sobrio) y `revision-visual` lo comprueba. Protocolo de referencia (tres direcciones, una con referencia nombrada, lista de qué se toma y qué no, maquetas en `design/refs/`, sin commits hasta elegir). Presupuesto de efectos, rendimiento (mediana de muestras, 150 KB, 15 KB), fuentes con licencia y máximo 4, legibilidad del contenido largo, contenido mínimo de portafolio, anti-slop. No se pide un interruptor visible de efectos: el humano lo descartó. Impeccable es opcional por proyecto y no entra al núcleo.
- **Publicación (tipo A):** `dist/` con lista permitida, 404 con rutas absolutas, `_headers` sin comentarios y con CSP por hash, `wrangler.jsonc` de solo estáticos, humo con `fetch`, skill `publicar` y guía de problemas (ADR 0009). Pasos manuales: cuenta, `wrangler login`, subdominio, primer despliegue y `wrangler logout`. Nunca la vía de Pages ni `--force`. No se ejecuta `wrangler` desde el kit.
- **Proceso y seguridad:** el revisor lee el `CLAUDE.md` del proyecto; un ajuste pequeño lleva el cierre y el merge en el mismo prompt (o «SIN MERGE»); el sello exige comprobaciones, corre gitleaks o el escaneo de secretos propio y dice «SIN ESCANEO DE SECRETOS» si no hubo ninguno; el sello avisa de correos personales en el historial (ADR 0010); el instalador añade `.gitattributes` para evitar el ruido de fin de línea en Windows; el tipo A documenta `playwright-core` como `devDependency` y el `package-lock.json`.

## Front reutilizable (etapa 2B)
- `front/` (pruebas, herramientas, plantilla de configuración) se instala en `tests/front/`; se configura en `tests/front/front.config.json` y corre con `node tests/front/run.mjs` contra una carpeta o `--url`. Las pruebas leen estilos calculados y la configuración, no nombres de clase: otro género visual no las toca.
- `playwright-core` es `devDependency` opcional del proyecto (versión fijada, `package-lock.json`); Chrome por `CHROMIUM_PATH`. En el kit, las pruebas de navegador se omiten sin ellos: para correrlas, `PLAYWRIGHT_CORE=<carpeta>`.
- `design/presets/` (`sobrio`, `expresivo`: mismos tokens) y `design/patrones/` (siete patrones probados). Herramientas de capturas, hoja y video escriben solo en `design/refs/`.
- La ficha declara `kit.front` y el sello corre las pruebas de front si existe su configuración.
- Sin medir (se declara): GPU real, equipos de gama baja, pausa con la pestaña oculta fuera de los patrones, contraste sobre imágenes de fondo complejas.

## Siguiente paso
- Etapas C3 y C4: catálogo de problemas del tipo C y notas por lenguaje (Go, Python, Rust), con la regla del tipo B (nada de técnicas de ataque ni cargas útiles; notas «Verificado», «Comprobado ejecutando el esqueleto» o «No verificado»). Después, decidir si el tipo C deja de llamarse «en construcción».
- Repetir `node types/C/esqueletos/verificar.mjs <go|python|rust>` en Linux y macOS (señal de punta a punta, permisos de archivo, el código POSIX de Rust, `go test -race` y `cargo audit` si se instala) y ejecutar los flujos de integración continua de los tres esqueletos en un proyecto de prueba. Desde una terminal de agente en Windows ya se puede verificar todo lo demás (el verificador amplía el PATH y, si `pip` no valida PyPI por una inspección de TLS, usa un PEM temporal con las autoridades del sistema; ver `types/C/esqueletos/VERIFICACION.md`, «Red y PATH»).
- Exportar a la copia pública: `node infra/exportar-publico.mjs --destino ..\agent-kit-publico --dry-run` (y sin `--dry-run` solo si el humano lo decide; el push siempre es suyo).
- Probar `especificar-funcionalidad` en un módulo real y recoger si se omite o resulta larga; si se omite con frecuencia, reabrir la decisión del ADR 0017.

## Pendiente tras la etapa 2F
- **Sin verificar (y por qué):** Python en local (desde la máquina de la etapa `pip` no validó el certificado de PyPI; solo se probó en contenedor) y .NET en local (el SDK instalado era el 9 y el esqueleto apunta a .NET 10; solo se probó con el SDK 10 de la imagen); `java-gradle` (no hay Gradle ni esqueleto); Java 25; los flujos de integración continua (`.github/workflows/ci.yml`, no ejecutados: solo su sintaxis); el despliegue de cualquier esqueleto (sin cuenta); las etiquetas de imagen base sin fijar por resumen. Las versiones de acciones de GitHub (`checkout@v7`, `setup-node@v7`, `setup-java@v6`, `setup-dotnet@v6`, `setup-python@v7`) salen de los README oficiales del 2026-10-23.
- **Notas del catálogo que siguen «No verificado»:** las que dependen de bibliotecas de terceros sin contrastar (por ejemplo Testcontainers para .NET, Node y Python, Polly fuera del paquete de resiliencia, ArchUnit, ShedLock, Spring Retry independiente, structlog, OpenTelemetry), de patrones sin API que contrastar (`declarado-vs-verificado`, estructura en capas) y de detalles de versión que la documentación no dice. Se verifican de una en una al adoptarlas.
- Comprobar `PLAN-REVERSA` y la rotación de secretos contra un proveedor real, y la vista previa por versión de Workers (`wrangler versions upload`) con la documentación oficial.
- Probar el kit en un proyecto nuevo del tipo B (por ejemplo con el esqueleto .NET) y recoger qué falta.
- Esqueleto Gradle y esqueletos con base de datos o mensajería (solo si una decisión lo justifica).
- Repetir `verificar.mjs` al subir versiones (Spring Boot, .NET, Node, Python, imágenes base) y actualizar `VERIFICACION.md`. Si tu red inspecciona TLS, mira la nota de ese archivo antes de desactivar nada.

## Publicación
- Esta copia se publicó como un solo commit limpio, sin el historial de desarrollo. Mantén la autoría con un correo público o `noreply` de tu cuenta.

## Pasos manuales tras esta etapa
1. Copiar `.claude/settings.local.generado.json` sobre `.claude/settings.local.json` para activar los hooks y los permisos en esta carpeta.
2. (Opcional) Rellenar `core/test/datos-privados.json` en cada máquina donde se trabaje, para que la pureza se compruebe.
3. (Cuando haya cuenta) probar los flujos de integración continua de los esqueletos en un repositorio de prueba; el kit no los ejecuta.

## Otros pendientes
- Evaluar plugin local solo para la parte genérica (ADR 0003).

## Pureza del tipo B
- Lo versionado de `types/B/` está abstraído: patrones y razones, sin código, nombres, servicios ni valores ajenos; solo se cita esg-trazabilidad como caso público. Si tienes material propio de consulta, déjalo en `types/B/casos-privados/` (ignorado por git).
- `core/test/datos-privados.json` (`{"terminos": [...]}`, ignorado por git) alimenta la prueba de pureza; sin él la prueba avisa. Nunca imprimas sus términos ni los copies a nada versionado. `node --test` falla si lo privado aparece en `git ls-files`.
- El catálogo no lleva cifras, anécdotas ni frases del material privado (siete palabras seguidas).

## Reglas que más se rompen
- Una fuente de verdad por regla: vive en un hook (`core/hooks/`) o en el generador (`infra/`); las plantillas la nombran, no la repiten.
- Nada específico de un proveedor en `core/` ni en `design/`, ni nombres de proyectos reales. Texto en español. Las plantillas públicas no mencionan el repositorio ni su alojamiento. Lo del proveedor de hosting va en `types/`.
- Cada hook lleva su prueba y su línea en `core/hooks/README.md`.
- Ramas de etapa `v1/etapa-<n>`. Commits Conventional con scope `kit`, sin coautor; máximo 10 por rama de etapa y 1 en `main` (`git merge --squash`, nunca rebase). Antes de pedir un merge, `git rev-list --count main..HEAD`.
- Shell: nada que espere stdin, `timeout` en lo que pueda tardar, temporales fuera del proyecto, sin matar procesos por nombre. Secretos nunca en archivos.

## No hagas
- No añadas dependencias, binarios ni scripts de terceros (ADR 0004).
- No instales el kit en un proyecto sin dry-run previo y sin que el humano lo decida.
- No crees remoto ni publiques.
