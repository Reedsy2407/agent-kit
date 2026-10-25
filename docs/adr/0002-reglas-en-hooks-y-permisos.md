# 0002. Las reglas que siempre se cumplen van en hooks y en permisos deny

Estado: aceptada (2026-10-19)

## Contexto
Las reglas de esg-trazabilidad vivían en un `CLAUDE.md` de más de 300 líneas y se incumplieron varias veces (shells colgadas, commits con coautor, merges sin comprobaciones). La documentación oficial es explícita: `CLAUDE.md` es contexto, no configuración que se haga cumplir; para bloquear una acción hay que usar un hook `PreToolUse`. Además, las reglas de Bash de `permissions` no son una frontera de seguridad: no cubren el mismo programa invocado de otra forma.

## Decisión
- Lo que debe cumplirse siempre se implementa como hook de Node (`PreToolUse`) y, donde el patrón es exacto, también como regla `deny`. Las dos capas se complementan: `deny` para lo literal, hook para lo que exige analizar el comando.
- El `CLAUDE.md` de las plantillas tiene como máximo ~150 líneas (hay una prueba que lo verifica) y contiene solo lo que requiere juicio.
- Una fuente de verdad por regla: la regla vive en un hook o en el generador de permisos, y el `CLAUDE.md` la nombra sin repetirla.

## Consecuencias
- Un agente que ignora el `CLAUDE.md` sigue sin poder hacer commit con coautor, empujar sin comprobaciones ni lanzar comandos que esperan stdin.
- Cambiar una regla es cambiar un script con su prueba, no una frase.
- Los hooks fallan abiertos ante un error interno (salida 1, aviso visible), para que un defecto del hook no inutilice la sesión; el ADR 0007 describe la excepción del merge.
