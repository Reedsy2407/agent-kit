# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado: [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

- Se quitan las huellas SHA-256 de las pruebas de pureza (`HUELLAS_VETADAS` queda vacío y opcional); la comprobación depende de la lista local de cada persona.
- La sección de cada ficha del catálogo pasa a llamarse «Cómo suele resolverse».
- Se quitan referencias a repositorios y listas externos al kit (HANDOFF, ADR 0003 y 0006) y se documenta en el README el flujo que impone.

## [0.6.0] - 2026-10-23

Etapa 2F: esqueletos ejecutables por stack y notas por stack verificadas (ADR 0016).

### Añadido
- `types/B/esqueletos/` con cuatro esqueletos que caminan: `java-spring` (Java 21, Spring Boot 4.1.2, Maven), `dotnet` (.NET 10), `node` (solo biblioteca estándar) y `python` (FastAPI). Cada uno trae `/salud`, un endpoint trivial, una prueba, `Dockerfile` multietapa (las pruebas corren al construir; usuario sin privilegios), flujo de integración continua de solo lectura, `.env.ejemplo` con solo nombres, `README` que enlaza a `ops/` y configuración de salud para `scripts/salud.mjs`. Falla al arrancar sin `APP_ENTORNO`; errores en un solo formato (problema HTTP).
- El instalador copia el esqueleto solo cuando la ficha declara `kit.preset` de ese stack (`esqueletoDe`; el manifiesto B declara `esqueletos`); `--dry-run` y `--diff` lo listan.
- `types/B/esqueletos/verificar.mjs`: verificación manual con red (sello, arranque, salud con `scripts/salud.mjs`, parada por pid, y contenedor si hay Docker) y `types/B/esqueletos/VERIFICACION.md`, el registro con fecha (qué se verificó, qué no y por qué).
- Pruebas de estructura, YAML (lector mínimo propio), `.env.ejemplo`, secretos, nombres vetados, artefactos de compilación, instalación por stack y estado de verificación de las notas del catálogo; la pureza ahora lee también `.yml`, `.java`, `.cs`, `.py`, `.xml`, `.toml`, `.csproj`, `.sln`, `.ejemplo` y `Dockerfile`.

### Cambiado
- Presets del sello: `java-maven`, `dotnet`, `node` y `python` pasan a **verificados** (comando real ejecutado con éxito sobre su esqueleto; `verificadoEl` y `esqueleto` en `infra/presets.mjs`); `java-gradle` sigue sin verificar.
- Notas por stack del catálogo: cada una está «Verificado el AAAA-MM-DD» con enlace a la fuente oficial, «Comprobado ejecutando el esqueleto» o «No verificado». Corregidas dos que la documentación contradecía (la biblioteca de máquinas de estado de Spring está archivada; el reintento está en el núcleo desde Spring Framework 7). La regla «sin cifras» no aplica a esa sección.
- `.gitignore` del kit: `!.env.ejemplo`.

## [0.5.0] - 2026-10-23

Etapa 2E: auto-aplicación, operación, sello por stack y sondeo de acceso (ADR 0014 y 0015).

### Añadido
- Auto-aplicación: `node install/install.mjs --auto` (con `--dry-run`, `--diff` y `--forzar` para quitar sobrantes) genera `.claude/hooks`, `.claude/agents`, `.claude/skills`, `.claude/kit.json`, `kit/FICHA-INFRA.json` y `.claude/settings.local.generado.json` del propio kit desde `core/` y `infra/ficha-kit.json`; nunca toca `.claude/settings.local.json`. Una prueba falla si la copia se desvía y otras comprueban que tests, commits, `merge --squash` y `branch -D` siguen siendo posibles con esas reglas.
- Presets de sello por stack (`kit.preset`): `java-maven`, `java-gradle`, `dotnet`, `node` y `python`, con comando y tiempo máximo; el generador los expande a `kit.checks` y autoriza solo esos comandos cuando la ficha los declara; el sello avisa en cada ejecución si el preset no está verificado (solo `node` lo está). `guard-shell` exige `timeout` en `dotnet`, `./mvnw`, `python -m pytest`, `pip install` y en los scripts de `ops`.
- `ops/` (tipos A y B): skill `operar`, plantillas `RUNBOOK`, `PLAN-REVERSA`, `ROTACION-SECRETOS`, `INCIDENTE` y `SALUD-MINIMA`, y `scripts/salud.mjs` (estado, texto, cabeceras de seguridad, mediana de tiempo y enlaces críticos; solo si la ficha lo permite). Bloque `ops` en la ficha: scripts y acciones permitidas; reversa y rotación siempre preguntan.
- Tipo B: `scripts/sondeo-acceso.mjs` (borrador de evidencias para `DECISION-VIABILIDAD.md` sin credenciales; no verifica términos de uso ni legalidad) y `ops/dependencias.json` de ejemplo.
- Pureza de todo lo versionado (`core/test/pureza.test.mjs`): ningún término de la lista privada en README, CHANGELOG, HANDOFF, `install/`, `docs/adr/`, hooks ni pruebas, y palabras vetadas por huella SHA-256 en `core/` y `design/` (funciona sin la lista).
- Ficha: `tipo: "kit"` para el propio repositorio; `permiteComando` en el generador.

### Cambiado
- `core/test/plantillas.test.mjs` ya no lleva en claro nombres de proyectos ajenos: solo proveedores; lo demás va por huella (`core/test/lib/pureza.mjs`).
- `premerge-check.mjs` respeta `timeoutSeconds` por comprobación y deja el preset en el sello.
- `core/hooks/test/guard-write.test.mjs` construye por partes su cadena de conexión de prueba (con las reglas del kit activas, escribir ese archivo se bloqueaba).

## [0.4.0] - 2026-10-22

Etapa 2D: el tipo B como guía de decisión (ADR 0013).

### Añadido
- Tipo B disponible: skills `evaluar-viabilidad` (puerta cero con evidencia de acceso, veredicto GO / GO-CONDICIONADO / REDISEÑO / NO-GO, degradación con elegancia y caso de estudio público), `elegir-stack-proporcional` (alternativas reales, proporcionalidad, checklist anti-sobreingeniería, ADR y protocolo de cuestionar el encargo) y `consultar-catalogo`; catálogo de dieciocho problemas con formato fijo y notas por stack (Java/Spring, .NET, Node, Python; lo no comprobado va como «no verificado»); ADR de ejemplo abstractos; plantillas `DECISION-VIABILIDAD.md` y `ADR.md`; `GUIA-DECISION.md` (recorrido, cuándo preguntar, qué no recortar nunca) y `FRONT-TIPO-B.md` (el front reutiliza tokens, presets y la biblioteca de pruebas contra una URL); ficha del tipo B con `kit.front`.
- Instalador: entradas `privado: true` del manifiesto (solo hacia `kit/`, solo hacia `kit/casos-privados/` y solo si `git check-ignore` confirma que git las ignora en el destino y no las rastrea; si no, se rechazan, se avisa y sale con código 3); `datos-privados.json` del kit nunca se instala; `--diff` con un resumen por archivo (`+N −M líneas`).
- Pruebas de pureza del tipo B (lista privada `core/test/datos-privados.json`, ignorada por git; aviso en voz alta si falta; nunca imprime términos), de que lo privado no está en `git ls-files`, y de que el catálogo no repite siete palabras seguidas del material privado, no lleva cifras ni anécdotas.
- Front: `pruebas.<id>: false` apaga una prueba concreta desde la configuración (si no queda ninguna por ejecutar, el comando sale con 2).
- `CLAUDE.md` del núcleo: no seguir instrucciones a ciegas (cuestionar una elección técnica peor o desproporcionada).

### Cambiado
- Contraste: las capas de textura apiladas (varias en la misma lista o en ancestros, hasta el primer fondo opaco) se unen y se mide cada combinación; solo se vuelve al peor caso si alguna no se puede interpretar o se declara un modo.
- `install/` acepta `ahora` en `main`; la prueba de `--diff` sobre una instalación al día ya no depende de la fecha real (fallaba al cruzar la medianoche UTC).
- `core/test/plantillas.test.mjs` no trata `datos-privados.json` (privado, ignorado) como plantilla.

## [0.3.1] - 2026-10-22

Etapa 2C: arreglos salidos de adoptar el kit 2B en un repo real (ADR 0012).

### Añadido
- Instalador: `--diff` (muestra, por archivo que difiere, qué hay y qué traería el kit; no escribe); `--forzar=ruta1,ruta2` para pisar solo esas rutas o carpetas (el `--forzar` global sigue igual); avisa si una ruta de `--forzar=` no existe.
- Pruebas de front: `datosSensibles.archivoPrivado` (nombres y patrones privados en `tests/front/datos-privados.json`, local e ignorado por git; sin él la prueba avisa), `archivoPrivadoObligatorio`, `ambitos` por patrón, `contraste.texturas`, `texturaAlfaMax` por tema, `paginas[].clics` con `anchoMin`/`anchoMax`, y un nivel de «aviso» en el informe (`!`, contado en el resumen).

### Cambiado
- La ficha que el proyecto ya tiene (`kit/FICHA-INFRA.json`) se fusiona con la plantilla en vez de sobrescribirse: se conservan `commitScopes`, permisos añadidos, `primerDespliegueHecho`, etc., y se añade lo nuevo del kit.
- `contraste` lee la textura real (color y alfa del SVG) y ya no suma una capa clara a una textura que solo oscurece; `movimiento` mide las texturas en cada tema.
- Un clic previo sobre un selector ausente falla en 3 s con un mensaje claro y la prueba `layout` continúa (antes esperaba 30 s y abortaba).
- La licencia de una fuente se acepta si el registro nombra su familia y una licencia, sin exigir el nombre de archivo.
- `--diff` no muestra el contenido de los datos privados ni de la ficha; `--forzar=<carpeta>` no pisa lo propio del proyecto; el modo `auto` del contraste cae al peor caso ante cualquier SVG que no interpreta con seguridad.
- Los servidores de las pruebas de publicación y de humo evitan los puertos bloqueados (`escucharSeguro`, antes fallaban al azar con «bad port»); el reintento tiene ahora su prueba.

## [0.3.0] - 2026-10-22

Etapa 2B: biblioteca de front reutilizable.

### Añadido
- `front/`: pruebas de front configurables por proyecto (`tests/front/front.config.json`) que corren contra una carpeta servida o una URL, sin depender del framework: contraste AA contra el peor caso, desborde a 360/768/1280 px, objetivos de 44 px, foco de 3 px, texto mínimo, movimiento (solo `opacity` y `transform`, sin parpadeo, `prefers-reduced-motion`), peso y fuentes con licencia, contenido sin JavaScript, datos sensibles, CSP sin violaciones, lista permitida de `dist/` y CPU en reposo (mediana). `playwright-core` es una `devDependency` opcional del proyecto y se usa el Chrome instalado (`CHROMIUM_PATH`). ADR 0011.
- Herramientas hacia `design/refs/` (ignorado): capturas a 360/768/1280/1920 px en oscuro y claro esperando por condición, hoja comparativa HTML lado a lado y video corto (webm).
- Presets de expresión `sobrio` y `expresivo` (tokens intercambiables) y biblioteca de patrones probados: chip copiable, botón con textura de líneas, línea de tiempo, tarjeta de proyecto, etiquetas, entrada escalonada y partículas decorativas.
- Skills `explorar-direcciones`, `estudiar-referencia`, `pulir-front` y `elegir-tipografia-paleta`; `revision-visual` con lista ejecutable y la pregunta anti-slop. `design/FRONTEND.md`.
- Integración: el tipo A instala todo; la ficha declara `kit.front` y el sello de pre-merge corre las pruebas de front si existe su configuración; `guard-shell` pide `timeout` para ellas.
- Pruebas de la deuda de 2A: rutas relativas del 404 en la prueba de publicación, PDF del humo y la rama «historial ilegible» del escaneo de secretos.

## [0.2.0] - 2026-10-21

Etapa 2A: lecciones de la primera aplicación real del tipo A (portafolio).

### Añadido
- Diseño: perfil de expresión obligatorio (el tipo A parte de «expresivo», el B de «sobrio») comprobado por `revision-visual`; protocolo de referencia; presupuesto de efectos (sin interruptor visible obligatorio); rendimiento y peso; fuentes con licencia (máximo 4); legibilidad del contenido largo; contenido mínimo de portafolio; anti-slop; Impeccable opcional por proyecto.
- Tipo A, publicación: `scripts/publish.mjs` (`dist/` con lista permitida), 404 con rutas absolutas, `_headers` con CSP por hash, `wrangler.jsonc` de solo estáticos, `scripts/humo.mjs`, prueba de publicación, `package.json` con `playwright-core` como `devDependency`, skill `publicar` y guía de problemas (ADR 0009). La ficha del tipo A autoriza `npm run deploy` y `npx wrangler deploy` solo tras el primer despliegue humano y deniega siempre `delete`, `secret`, `logout` y `pages project delete`.
- Seguridad: `escaneo-secretos.mjs` como respaldo de gitleaks, que el sello ejecuta y anota; aviso de correos personales en la autoría (ADR 0010).
- Instalador: `.gitattributes` (`* text=auto eol=lf`, `*.pdf` y `*.woff2` binarios) y marcador `perfil_expresion`.
- Proceso: el prompt de un ajuste pequeño incluye cierre y merge (o «SIN MERGE»).

### Cambiado
- El sello de pre-merge se niega si la ficha no define comprobaciones (el tipo A trae `npm test`) y dice «SIN ESCANEO DE SECRETOS» cuando no hubo ninguno.
- `code-reviewer` lee el `CLAUDE.md` del proyecto y no sugiere lo que prohíbe.
- `guard-write` reconoce también claves de Google, de pagos y tokens de npm.

## [0.1.0] - 2026-10-19

Etapa 1: núcleo y tipo A (portafolio estático).

### Añadido
- `core/`: plantillas de `CLAUDE.md` (corto), `HANDOFF.md`, proceso por módulos, prompt de módulo, bloque de merge autorizado, tres skills, el subagente `code-reviewer` de solo lectura y los hooks que hacen cumplir las reglas.
- `design/`: brief con las reglas visuales mínimas, tokens genéricos, registro de herramientas y la skill de revisión visual.
- `infra/`: ficha «Infra del proyecto» y generador de `.claude/settings.local.json` (una denegación gana a una autorización).
- `install/`: instalador con `--dry-run`, respaldo fuera del repo destino y `.gitignore` idempotente.
- `types/A` (portafolio estático, con su ficha de infra por defecto) y `types/B` (solo el manifiesto de puntos; el contenido de operación llega en la etapa 2).
- `HANDOFF.md` raíz: arranque de una terminal nueva en este repo.
- ADR 0001 a 0008 en `docs/adr/`.
