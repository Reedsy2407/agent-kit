# 0008. Instalación segura: no sobrescribir, respaldar fuera, gitignore idempotente

Estado: aceptada (2026-10-19)

## Contexto
El instalador toca repos ajenos al kit. Un incidente previo: al sacar carpetas del índice con `git rm --cached` y cambiar de rama, git las borró del disco. Y el respaldo dentro del repo destino no sirve si el repo se pierde o se limpia.

## Decisión
- `--dry-run` imprime el plan completo y no escribe nada (ni siquiera la carpeta de respaldo).
- Ningún archivo existente se sobrescribe sin `--forzar`; con él, la versión anterior se copia antes al respaldo.
- El respaldo vive fuera del destino (por defecto `%LOCALAPPDATA%/agent-kit/respaldos` o `~/.local/share/agent-kit/respaldos`); si queda dentro del destino, el instalador se detiene.
- Toda ruta de destino se resuelve contra la raíz del destino y se rechaza si sale de ella (`..`, rutas absolutas, enlaces fuera).
- Las rutas no versionadas se añaden a `.gitignore` una por una, exactas, sin duplicar y sin tocar el resto del archivo.

## Consecuencias
- Reinstalar es seguro y repetible; una actualización del kit exige `--forzar` y deja respaldo.
- Lo local (CLAUDE.md, hooks, skills, kit/, tasks/) no se versiona; el diseño (brief, tokens) sí.
