---
name: actualizar-handoff
description: Actualiza HANDOFF.md al cerrar un módulo para que una terminal nueva arranque sin arrastrar contexto. Úsala tras el cierre de un módulo o cuando el humano pida preparar el relevo.
disable-model-invocation: true
---

Actualiza `HANDOFF.md` y mantenlo corto (una pantalla y media como máximo):

1. **Estado:** último módulo cerrado, módulo en curso, dónde está desplegado y en qué commit.
2. **Tarea actual y Siguiente:** una o dos líneas cada una.
3. **Reglas que más se rompen:** añade solo lo que acaba de salir mal en este proyecto, con una frase; no copies reglas que ya hacen cumplir los hooks.
4. **Accesos y cuenta de pruebas:** remite a `.claude/settings.local.json` y a la ficha; nunca pegues contraseñas, tokens ni hashes.
5. **No hagas:** una lista corta de lo que el humano ya descartó.

Mueve a `tasks/LEARNINGS.md` la narrativa larga de lo ya cerrado (con un ancla por tarea) y deja en `tasks/todo.md` una línea por tarea cerrada. `HANDOFF.md`, `tasks/` y `kit/` son locales: no se versionan.
