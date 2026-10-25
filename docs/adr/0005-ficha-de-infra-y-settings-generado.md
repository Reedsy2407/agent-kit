# 0005. Ficha de infra y `settings.local.json` generado

Estado: aceptada (2026-10-19)

## Contexto
Los próximos proyectos no siempre usarán el mismo proveedor, pero el patrón de accesos es constante: permisos mínimos y preautorizados por escrito, una lista de permitido y otra de denegado, y el menor número posible de pasos manuales. Escribir ese archivo a mano produjo errores: una denegación general (`render deploys`) anulaba la autorización específica de `render deploys create`, porque en el sistema de permisos una denegación gana (el orden oficial es deny, ask, allow).

## Decisión
- Cada proyecto rellena una ficha «Infra del proyecto» (`infra/ficha-infra.template.json`): despliegue, base de datos y su punto de restauración, logs, URLs públicas, login manual, permisos extra y la configuración de los hooks.
- `infra/generate-settings.mjs` genera `.claude/settings.local.json` (permisos y registro de hooks) y `.claude/kit.json` a partir de la ficha, con un mínimo de allow y deny comunes.
- El generador **falla** si alguna autorización queda tapada por una denegación (una denegación gana a una autorización) y si la ficha contiene algo con forma de secreto.
- El instalador nunca sobrescribe un `settings.local.json` existente: escribe al lado `settings.local.generado.json` para que el humano lo revise y lo copie.

## Consecuencias
- Cambiar de proveedor es cambiar una ficha, no reescribir permisos.
- La ficha no lleva secretos; los logins son pasos manuales que la ficha solo documenta.
- Las reglas `deny` de Bash no son una frontera de seguridad (ver ADR 0002); la ficha se apoya en los hooks para lo crítico.
