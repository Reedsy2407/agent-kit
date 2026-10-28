# 0017. Especificar cada funcionalidad antes de construirla

Estado: aceptada (2026-10-28). Complementa los ADR 0002 (reglas en hooks y permisos) y 0013 (tipo B como guía de decisión).

## Contexto
El kit ordenaba cómo se construye (módulos, rebanadas, revisor interno, sello) y, en el tipo B, si conviene construir (viabilidad, stack, catálogo), pero no decía **qué debe hacer** cada funcionalidad de forma comprobable. El prompt del módulo llevaba el objetivo y los criterios de calidad escritos a mano, sin ids que el informe de cierre pudiera citar: al final no había manera mecánica de saber qué se prometió y qué se cubrió.

Ya existen herramientas dedicadas a esto: spec-kit y OpenSpec, que ofrecen flujos completos de especificación, plan y tareas con sus propios comandos y carpetas. No se adoptan: traerían un flujo paralelo al del kit (otro formato de plan, otras tareas, otro ciclo de revisión) y dependencias externas que el ADR 0004 excluye. Lo que al kit le faltaba era una sola pieza; lo que lo distingue —hooks y permisos que bloquean lo que no debe pasar, y un revisor independiente de solo lectura— ya existe y no se toca.

## Decisión
- **Una skill de núcleo, `especificar-funcionalidad`, y una plantilla**, instaladas en los tipos A y B por el mismo patrón que las demás (el manifiesto instala `core/skills` completa y añade `core/plantillas/ESPECIFICACION.md` → `kit/plantillas/ESPECIFICACION.md`). La especificación tiene: resumen y por qué; usuarios y casos de uso; requisitos; criterios de aceptación con id estable (`CA-1`, `CA-2`…) en forma Dado/Cuando/Entonces y con su comprobación; fuera de alcance; dependencias externas (enlaza `DECISION-VIABILIDAD.md` en el tipo B); datos y estados; preguntas abiertas.
- **Dónde vive: `docs/specs/<nombre>.md`, versionada en el proyecto destino.** Es una decisión del producto, no una herramienta del agente: debe viajar con el código, revisarse en el mismo diff y sobrevivir a una máquina nueva, a diferencia de `kit/` y `tasks/`, que son locales y no se versionan. `docs/specs/` no es documentación pública del sitio ni menciona el repositorio; quien no quiera publicarla puede ignorarla en su proyecto sin romper nada. La plantilla sí se instala en `kit/` (sin versionar), como las demás.
- **Los ids `CA-n` son estables:** no se renumeran ni se reutilizan; uno retirado queda como «retirado». Así el prompt, los commits y el informe de cierre pueden citarlos.
- **Máximo 3 preguntas abiertas, cerradas y con recomendación; la skill se detiene a hacerlas todas juntas antes de seguir.** Encaja en la parada ya existente de «decisión de negocio fuera del brief»: no se añade una parada a la lista cerrada.
- **El contraste especificación ↔ plan es una sección de la misma skill** (parte 2), no una skill hermana. Razón: es el mismo documento y el mismo momento (justo antes de construir); una skill aparte sumaría otra descripción que mantener y otra decisión de «cuál invoco» para quien no tiene contexto, sin ganar nada. La tabla vive al final de la especificación: cada CA vigente tiene una rebanada y una prueba o evidencia prevista, y toda rebanada del plan cita al menos un CA. Si el contraste crece o se necesita volver a correrlo sobre un plan cambiado, se separa entonces.
- **Integración:** `prompt-de-modulo` y `PROMPT-MODULO.md` lo leen en LEE PRIMERO, toman de ahí el objetivo y citan `CA-n` en los criterios sin copiarlos (una fuente de verdad por regla); `cierre-de-modulo` y el informe de cierre dicen qué CA quedaron cubiertos y con qué evidencia; el `CLAUDE.md` de la plantilla, el proceso y `GUIA-DECISION.md` colocan el paso después de la viabilidad y la elección de stack (tipo B) o del brief (tipo A), y antes del prompt del módulo.

## Límite, dicho con honestidad
**Este paso es una skill que guía, no un hook que bloquea.** Nada impide construir sin especificación ni con una especificación pobre: si el agente o la persona se la saltan, el kit no se entera. Lo que sí hace es dejar un rastro verificable (ids, tabla de contraste, informe de cierre por CA) que el revisor interno y la revisión externa pueden comprobar contra el diff. Convertirlo en un bloqueo (por ejemplo, un hook que rechace commits sin `docs/specs/` o sin tabla completa) cambiaría lo que el kit promete a quien lo instala, y sería frágil: un hook no puede juzgar si un criterio es comprobable. Si el uso real muestra que se omite con frecuencia, se reabre esta decisión con ese dato.

## Consecuencias
- El objetivo y los criterios de un módulo tienen una sola fuente; el informe de cierre pasa de «qué se hizo» a «qué criterios quedaron cubiertos y con qué evidencia».
- Un paso más antes de construir. En un ajuste pequeño basta una especificación de pocas líneas; la skill no pide más de lo que el cambio necesita.
- Dos documentos que pueden desfasarse (la especificación y el código). Se mitiga editando la especificación en la misma rebanada que cambia el comportamiento, y con el contraste previo a construir.

## Alternativas descartadas
- **Adoptar spec-kit u OpenSpec:** flujo paralelo y dependencias externas (ADR 0004); duplicarían el plan, las tareas y la revisión que el kit ya tiene.
- **Un hook que bloquee sin especificación:** ver el límite; promete más de lo que puede comprobar.
- **Skill hermana para el contraste:** más superficie sin beneficio hoy.
- **Guardarla en `kit/` o `tasks/`:** local y sin versionar; la especificación se perdería con la máquina y no pasaría por la revisión del diff.
