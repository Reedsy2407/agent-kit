# agent-kit

Núcleo reutilizable para trabajar un proyecto con un agente constructor (Claude Code) y un revisor independiente. Lo que debe cumplirse siempre vive en **hooks** y en **permisos deny**; el `CLAUDE.md` que se instala es corto y solo lleva lo que requiere juicio.

Versión 0.7.0 (etapa 2H): especificar cada funcionalidad antes de construirla (skill `especificar-funcionalidad`, criterios `CA-n` y contraste con el plan; una guía, no un bloqueo); antes, esqueletos ejecutables por stack para el tipo B (Java/Spring, .NET, Node y Python) con verificación registrada y notas por stack del catálogo contrastadas con la documentación oficial; antes, el kit se aplica a sí mismo (`--auto`), operación posterior a la publicación (`ops/`), sello y guarda por stack y sondeo de acceso para la viabilidad, núcleo, tipo A (portafolio estático) y tipo B (sistema con servicios) como guía de decisión —viabilidad, stack proporcional y catálogo de problemas, sin imponer tecnología—, más la biblioteca de front reutilizable (pruebas configurables, herramientas de capturas, presets y patrones).

## Requisitos y alcance

- Node 20 o superior y [Claude Code](https://code.claude.com). El kit no tiene dependencias.
- Se instala **copiando** a tu proyecto con `node install/install.mjs` (no es un plugin). Empieza siempre con `--dry-run`.
- Trae el catálogo de problemas del tipo B ya abstraído (patrones y razones, sin código ni nombres de terceros).
- Ajusta la ficha de infraestructura (`kit/FICHA-INFRA.json`) a tus proveedores antes de usar el generador de permisos.

## Flujo de trabajo que impone el kit

El kit es opinionado: los hooks bloquean lo que no sigue este flujo (detalle en `core/hooks/README.md`). Si no te encaja, cambia los hooks y las plantillas tras instalar.

- **Dos roles:** un agente constructor y un subagente `code-reviewer` independiente; el revisor solo lee y ejecuta pruebas, no corrige.
- **Ramas de etapa y merges `--squash`:** nada de `rebase`, `merge` sin `--squash` ni push forzado; cada rama de etapa tiene un tope de commits y `main` recibe uno por etapa.
- **Commits Conventional, sin coautor ni firma de la herramienta.** Si quieres atribución, desactiva esa regla en `guard-commit`.
- **Sello de pre-merge:** antes de integrar se corren las comprobaciones de tu ficha y un escaneo de secretos.
- **Permisos por ficha:** `.claude/settings.local.json` se genera desde `kit/FICHA-INFRA.json`; el agente no puede editar sus propias reglas.

## Estructura

| Carpeta | Contenido |
|---|---|
| `core/` | Plantillas (`CLAUDE.md`, `HANDOFF.md`, proceso, prompt de módulo, bloque de merge), skills, subagente `code-reviewer` y hooks con sus pruebas. |
| `design/` | `DESIGN-BRIEF.md` con reglas visuales mínimas, `styles.css` de tokens, `TOOLING.md` y la skill de revisión visual. |
| `front/` | Biblioteca de front sin dependencias: pruebas configurables contra una carpeta o una URL (contraste, maquetación, movimiento, peso, contenido, datos, CSP, publicación, CPU), herramientas de capturas, hoja comparativa y video, y plantilla de configuración. Se instala en `tests/front/` (ADR 0011). |
| `infra/` | Ficha «Infra del proyecto» y generador de `.claude/settings.local.json`. |
| `ops/` | Operación después de publicar: skill `operar`, plantillas (runbook, plan de reversa, rotación de secretos, incidentes, salud mínima) y `scripts/salud.mjs`. Se instala en `ops/` y `scripts/` de los tipos A y B (ADR 0015). |
| `types/A`, `types/B` | Manifiestos: qué puntos aplican y qué archivos se instalan. El tipo A trae además la publicación (`plantillas/`, skill `publicar`, guía de problemas); el tipo B, las skills de decisión, el catálogo de problemas, los ADR de ejemplo y los esqueletos por stack (`types/B/esqueletos/`, ADR 0016). |
| `install/` | Instalador (`--dry-run`, `--diff`, respaldo, `.gitignore` idempotente) y `--auto`, que genera el `.claude/` del propio kit (ADR 0014). |
| `HANDOFF.md` | Arranque de una terminal nueva en este repo (estado, siguiente paso, reglas que más se rompen). |
| `docs/adr/` | Una decisión por archivo (formato Nygard). |

## Tipos de proyecto

- **A — portafolio estático:** un sitio que debe abrir al instante. Trae publicación (`dist/`, cabeceras, humo) y toda la biblioteca de front. Perfil de expresión: expresivo.
- **B — sistema con servicios:** el kit no impone stack: enseña cómo piensa un proyecto real. `evaluar-viabilidad` (¿es posible? evidencia de acceso a lo externo; NO-GO o REDISEÑO detienen la obra), `elegir-stack-proporcional` (al menos dos alternativas, una la más simple; cuestionar un encargo que lleve a una mala elección) y `consultar-catalogo` (problemas, no soluciones, con "no hacer nada" siempre como opción). El front reutiliza tokens, presets y las pruebas del kit contra una URL. Recorrido en `types/B/GUIA-DECISION.md`; decisión en el ADR 0013.

## Uso

```
node install/install.mjs --destino <carpeta> --tipo A --dry-run
node install/install.mjs --destino <carpeta> --tipo A
node install/install.mjs --destino <carpeta> --tipo B --diff
```

Opciones: `--proyecto <nombre>` (por defecto, el nombre de la carpeta), `--ficha <archivo>` (ficha de infra; si falta se usa la del tipo), `--respaldo <carpeta>` (fuera del destino), `--forzar` (sobrescribe tras respaldar). Sin terminal interactiva hay que pasar `--tipo`; el instalador nunca espera entrada.

Lo no versionado (`CLAUDE.md`, `HANDOFF.md`, `kit/`, `tasks/`, `.claude/`, `design/refs/`, `node_modules/`, `tests/front/datos-privados.json`; el tipo A añade `dist/` y `.wrangler/`) se añade al `.gitignore` del destino, línea a línea y sin duplicar; el diseño (`design/`) sí se versiona. Nada se sobrescribe sin `--forzar`, y el respaldo (por defecto en `%LOCALAPPDATA%/agent-kit/respaldos`) queda fuera del destino (ADR 0008). Se añade también un `.gitattributes` (fin de línea LF) si no existe. El material privado de consulta local (`types/B/casos-privados/`, que no se versiona) solo se copia a `kit/casos-privados/` y únicamente si git lo ignora en el destino; si no, el instalador lo rechaza, lo avisa y sale con código 3 tras instalar el resto.

Tras instalar, el humano revisa `.claude/settings.local.json` (o `settings.local.generado.json` si ya existía uno), rellena la ficha en `kit/FICHA-INFRA.json` y vuelve a generar desde la carpeta del kit con `node infra/generate-settings.mjs --ficha <proyecto>/kit/FICHA-INFRA.json --destino <proyecto>` (`infra/` no se instala en el proyecto).

## Operación, presets y auto-aplicación

- **Después de publicar** (`ops/`, ADR 0015): la skill `operar` y las plantillas viven en el proyecto; `node scripts/salud.mjs <dirección>` comprueba estado, cabeceras, mediana de tiempo y enlaces críticos. Ningún script ni acción corre si la ficha (bloque `ops`) no lo permite; reversa y rotación siempre preguntan. El tipo B trae además `scripts/sondeo-acceso.mjs`, que redacta un borrador de evidencias para la viabilidad sin credenciales y sin verificar términos de uso ni legalidad.
- **Sello y guarda por stack** (`kit.preset` en la ficha, ADR 0014): `java-maven`, `java-gradle`, `dotnet`, `node` o `python` fijan la comprobación del sello con su tiempo máximo y autorizan solo esos comandos; `guard-shell` exige `timeout` en ellos. `node`, `java-maven`, `dotnet` y `python` están verificados sobre su esqueleto (fecha y límites en `types/B/esqueletos/VERIFICACION.md`); `java-gradle` sigue **sin verificar** y el sello lo avisa.
- **Esqueletos por stack** (tipo B, ADR 0016): si la ficha declara `kit.preset` y hay esqueleto de ese stack, el instalador copia un servicio mínimo que compila, se prueba, tiene `/salud`, `Dockerfile` multietapa e integración continua. Para repetir su verificación (con red): `node types/B/esqueletos/verificar.mjs <java-spring|dotnet|node|python>`; no forma parte de `node --test`.
- **El kit se aplica a sí mismo:** `node install/install.mjs --auto` regenera `.claude/` desde `core/` y `infra/ficha-kit.json`; una prueba falla si se desvía. El humano copia `.claude/settings.local.generado.json` sobre `.claude/settings.local.json` (los hooks no dejan que el agente edite sus propias reglas).

## Pruebas

```
node --test
```

Las pruebas de la biblioteca de front que abren un navegador se **omiten** (y dicen por qué) si no hay `playwright-core` ni Chrome: el kit no los instala. Para correrlas: `PLAYWRIGHT_CORE=<carpeta de playwright-core>` y, si Chrome no está en la ruta habitual, `CHROMIUM_PATH=<chrome>`.

## Referencias

Documentación oficial de Claude Code consultada el 2026-10-19 (`code.claude.com/docs/en/...`) y lo que se decidió por ella:

- **hooks**: los hooks se declaran en `settings*.json` como evento → grupo con `matcher` → manejador (`type`, `command`, `args`, `timeout`); `PreToolUse` recibe JSON por stdin (`tool_name`, `tool_input`, `cwd`) y `exit 2` bloquea con el stderr como motivo. Decisión: hooks propios en Node, forma `command: "node"` + `args` con `${CLAUDE_PROJECT_DIR}` (sin comillas ni shell, válido en Windows), bloqueo por `exit 2`; los errores internos salen con 1 (no bloquean) salvo el hook de merge (ADR 0002 y 0007).
- **settings** y **permissions**: `.claude/settings.local.json` es personal del proyecto y el propio Claude Code lo mantiene fuera de git si lo crea; a mano hay que ignorarlo. Las reglas se evalúan deny, luego ask, luego allow, y la primera coincidencia decide; `Bash(x:*)` equivale a `Bash(x *)`; las reglas de Bash no son una frontera de seguridad. Decisión: el generador rechaza autorizaciones tapadas por denegaciones y los hooks cubren lo que el patrón no alcanza (ADR 0002 y 0005).
- **skills**: `.claude/skills/<nombre>/SKILL.md` con frontmatter (`name`, `description`, `disable-model-invocation`, `allowed-tools`…); menos de 500 líneas. Decisión: tres skills de proceso más una de diseño, sin `allowed-tools` (cada escritura sigue pidiendo permiso) y con `disable-model-invocation` donde la skill solo debe correr cuando el humano o el prompt la pide.
- **sub-agents**: `.claude/agents/*.md`, obligatorios `name` y `description`; `tools` es una lista de permitidos y `Bash` puede escribir por redirección. Decisión: `code-reviewer` solo con `Read`, `Grep`, `Glob` y `Bash`, y un hook propio en su frontmatter (`hooks`) que limita `Bash` a lectura y verificación.
- **memory** (`CLAUDE.md`): es contexto, no configuración que se haga cumplir; cuanto más corto y específico, mejor se sigue. Decisión: tope de ~150 líneas verificado por una prueba (ADR 0002).
- **plugins**: un plugin empaqueta skills, agentes y hooks (`.claude-plugin/plugin.json`, `hooks/hooks.json`, `${CLAUDE_PLUGIN_ROOT}`) y cuesta contexto en cada turno de cada sesión. Decisión: no empaquetar como plugin en la etapa 1 (ADR 0003).

Etapa 2F (consultadas el 2026-10-23, detalle y fuentes por nota en `types/B/catalogo/` y `types/B/esqueletos/VERIFICACION.md`): dotnet.microsoft.com y learn.microsoft.com (soporte de .NET, ASP.NET Core, EF Core, resiliencia HTTP, opciones), nodejs.org y github.com/nodejs (calendario y API de Node, undici), devguide.python.org y docs.python.org, spring.io y docs.spring.io (Spring Boot, Framework, Security y Data), docs.oracle.com, maven.apache.org, docs.hibernate.org, fastapi.tiangolo.com, docs.sqlalchemy.org, docs.djangoproject.com y las páginas de pytest, httpx, Express, Fastify y otras bibliotecas citadas. Registros de paquetes: Maven Central, NuGet y PyPI.
