# 0001. Node ESM sin dependencias

Estado: aceptada (2026-10-19)

## Contexto
El kit se instala en proyectos con stacks distintos (sitio estático, Java, Angular). Los hooks y el instalador corren en la máquina del humano, en Windows, y no deben traer superficie de ataque: nada de `npm install`, binarios ni scripts de terceros.

## Decisión
Todo el código del kit es Node (>= 20) en módulos ESM, sin dependencias, con pruebas de `node:test`. Las rutas se tratan con `node:path` y nunca se asume `/` ni un shell concreto.

## Consecuencias
- No hace falta instalar nada para usar ni probar el kit (`node --test`).
- Sin `jq`, `bash` ni PowerShell en los hooks: funcionan igual en Windows, macOS y Linux.
- Hay que escribir a mano utilidades pequeñas (análisis de comandos, `.gitignore`); se mantienen en `core/hooks/lib/` y en `install/`, con pruebas.
