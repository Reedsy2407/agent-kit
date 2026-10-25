---
name: prompt-de-modulo
description: Redacta el prompt de un módulo o etapa con la estructura fija (objetivo, pasos manuales, autorizaciones, criterios, límites de commits, paradas, bloque de merge) y lo autoverifica antes de entregarlo. Úsala cuando el humano pida el prompt de un módulo nuevo.
disable-model-invocation: true
---

Redacta el prompt del módulo que pida el humano siguiendo `kit/PROMPT-MODULO.md` al pie de la letra: el orden de las secciones no cambia y una sección sin contenido dice «ninguno».

1. Lee `HANDOFF.md` y los documentos del módulo antes de escribir; no repitas decisiones ya tomadas ni las conviertas en preguntas.
2. Reúne **todos** los pasos manuales del humano y ponlos al inicio. Un paso que aparezca a mitad del módulo es un defecto del prompt.
3. Escribe las autorizaciones permanentes que el módulo necesita (migraciones, configuración de despliegue ligada al módulo, commits, especificaciones, documentación) para que la terminal no vuelva a preguntar.
4. Criterios de calidad, no soluciones: ante un problema de diseño, el prompt pide el mejor criterio y las skills, no dicta la solución. Si hay interfaz, exige los tokens de `design/styles.css` y cita `frontend-design`, `impeccable` y `revision-visual`.
5. Paradas: solo las de la lista cerrada del `CLAUDE.md`, una línea cada una.
6. Cierra con el bloque de `kit/MERGE-AUTORIZADO.md` si el humano autoriza el merge en esta etapa; esto vale también para un ajuste pequeño (el cierre y el merge van en el mismo prompt). Si no lo autoriza, escribe «SIN MERGE: te detienes en la rama».
7. Autoverifica con la lista del final de `kit/PROMPT-MODULO.md` y corrige antes de entregar.

Estilo: corto, concreto, una recomendación en lugar de un repaso de alternativas.
