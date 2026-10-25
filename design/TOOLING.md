# TOOLING — herramientas de diseño de {{proyecto}}

Registro versionado de qué herramientas de diseño se instalaron, de qué fuente y por qué. El kit no trae ninguna skill ajena: este archivo fija **cómo** se instalan si el proyecto las quiere, y se rellena la tabla al hacerlo.

## Regla de uso
- La fuente de verdad del diseño es `design/DESIGN-BRIEF.md`. Ninguna skill la sustituye ni la contradice: si una sugiere otra dirección, gana el brief.
- Una skill que **genera** se usa para construir pantallas; una que **revisa** orienta y critica, no genera código.
- Toda herramienta es opcional. Sin ellas, el flujo funciona con el brief, los tokens y la skill propia `revision-visual`.

## Cómo se instala una herramienta de terceros (guías escritas únicamente)
1. Se audita su contenido leyéndolo, antes de copiar nada.
2. Se copia **solo Markdown** (guías escritas) desde un commit fijado, sin ejecutar instaladores, `npx`, ni scripts de terceros.
3. Nunca binarios, hooks, comandos de arranque automático ni subagentes que traigan `Bash` o `Write`.
4. Si la skill declara `allowed-tools`, se elimina ese bloque: cada escritura sigue pidiendo permiso.
5. Si la skill necesita un binario para funcionar, no se aprueba la descarga sin una decisión explícita del humano; se usa en modo degradado, siguiendo solo sus guías escritas.
6. Se registra aquí: nombre, fuente, commit fijado, fecha del commit, licencia y qué se copió. Quedan en `.claude/skills/` (local, no versionado).
7. Ninguna se actualiza sola. Para subir de versión: volver a auditar en el nuevo commit y actualizar la tabla.

## Impeccable: opcional por proyecto
Nunca entra al núcleo del kit (ADR 0004). Si un proyecto la quiere, se instala como guía escrita con las reglas de arriba y se usa **sobre el sitio ya construido**: `/critique`, `/audit` y `/polish`. No se usa `/overdrive`. Siempre manda el brief.

## Instalado
| Skill | Fuente | Commit fijado | Fecha del commit | Licencia | Qué se copió |
|---|---|---|---|---|---|
| _(ninguna)_ | | | | | |

## Excluido a propósito
_(Lo que se evaluó y se descartó, y por qué: binarios, hooks, permisos amplios, servidores MCP.)_

## Archivos que una herramienta podría crear
Si una herramienta escribe archivos propios en la raíz (por ejemplo notas de producto o de diseño), se añaden a `.gitignore` para que no se versionen por accidente ni compitan con `DESIGN-BRIEF.md`.

## Fuentes tipográficas
Se descargan como archivos estáticos con la versión fijada, sin instalar paquetes ni ejecutar scripts, y van con su licencia. Solo el subconjunto necesario, en woff2.
