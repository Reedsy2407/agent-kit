# 0003. Empaquetado: copia con instalador, no plugin (por ahora)

Estado: aceptada (2026-10-19)

## Contexto
Claude Code permite empaquetar skills, subagentes y hooks como plugin (`.claude-plugin/plugin.json`, `skills/`, `agents/`, `hooks/hooks.json`, `${CLAUDE_PLUGIN_ROOT}`), con espacio de nombres (`/plugin:skill`) y actualizaciones desde un marketplace. Un plugin se habilita en todas las sesiones y el nombre y la descripción de cada skill cuentan en el contexto de cada turno.

El kit, además de skills, agentes y hooks, entrega cosas que un plugin no cubre: `CLAUDE.md`, `HANDOFF.md`, plantillas de proceso, brief y tokens de diseño, líneas de `.gitignore` y un `settings.local.json` generado desde una ficha por proyecto (permisos específicos de cada proveedor). Y el proyecto necesita que las herramientas queden en local y sin versionar.

## Decisión
En la etapa 1 el kit se instala por copia con `install/install.mjs`. Los hooks quedan en `.claude/hooks/` del proyecto y se registran en `.claude/settings.local.json`. No se publica como plugin.

## Consecuencias
- Cada proyecto es autosuficiente: nada se descarga ni se actualiza solo (una actualización es una versión nueva del kit reinstalada con respaldo).
- Se renuncia al versionado y las actualizaciones de un marketplace y al espacio de nombres.
- Se reevalúa cuando haya varios proyectos en marcha y la parte genérica (hooks, skills, agente) se pueda separar de la parte por proyecto: ese subconjunto sí encajaría como plugin local, instalado con `--plugin-dir`, sin marketplace público.
