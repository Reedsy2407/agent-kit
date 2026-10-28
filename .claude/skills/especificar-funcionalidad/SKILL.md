---
name: especificar-funcionalidad
description: Escribe la especificación de una funcionalidad antes de construirla (casos de uso, requisitos verificables, criterios de aceptación CA-n en forma Dado/Cuando/Entonces, fuera de alcance, preguntas abiertas) y, antes de construir, la contrasta con el plan del módulo. Úsala después de la viabilidad (si la hay) o del brief, y antes de redactar el prompt del módulo.
---

Antes de construir, escribe **qué debe hacer** la funcionalidad de modo que se pueda comprobar. Salida: `docs/specs/<nombre>.md` (parte de `kit/plantillas/ESPECIFICACION.md`), versionada en el proyecto. Es una guía de proceso, no un bloqueo: ningún hook la exige; el contraste de la parte 2 y el revisor son lo que la hace valer.

## Parte 1. Escribir la especificación
1. **Lee primero** `HANDOFF.md`, el brief (`design/DESIGN-BRIEF.md` si hay interfaz) y, si existe, `DECISION-VIABILIDAD.md`. No repitas decisiones ya tomadas ni las conviertas en preguntas.
2. **Rellena la plantilla en este orden:** resumen y por qué; usuarios y casos de uso; requisitos; criterios de aceptación; fuera de alcance; dependencias externas (enlaza `DECISION-VIABILIDAD.md` si el proyecto la tiene); datos y estados; preguntas abiertas.
3. **Criterios de aceptación**, uno por comportamiento observable:
   - id estable `CA-1`, `CA-2`… Nunca se renumeran ni se reutilizan; uno retirado queda como «retirado».
   - forma **Dado** (estado inicial) / **Cuando** (una acción) / **Entonces** (resultado observable).
   - comprobable con **una prueba o una evidencia** concreta (captura, salida de un comando, consulta). Si no se puede decir cómo se comprobaría, no es un criterio sino un deseo: reescríbelo o pásalo a preguntas abiertas.
   - sin cifras inventadas: un umbral (tiempo, tamaño) lo pone el brief o el humano.
4. **Requisitos:** frases cortas con «debe»; cada una queda cubierta por al menos un CA. **Fuera de alcance:** lo que alguien podría esperar y no se hace ahora.
5. **Preguntas abiertas: máximo 3**, cerradas (opciones con tu recomendación) y solo las que cambian un criterio. Si hay alguna, **te detienes y las preguntas todas juntas** antes de seguir. Lo que el brief ya decidió no se pregunta. Sin preguntas, sigues.
6. Sin preguntas abiertas, sigues con la parte 2 sin pedir confirmación. Un cambio de alcance respecto del brief lo decide el humano (parada de «decisión de negocio fuera del brief»), no tú.

## Parte 2. Contrastar especificación y plan
Cuando exista el plan del módulo (sus rebanadas) y antes de la primera línea de código, rellena la tabla «Contraste con el plan» de la especificación:

| CA | Rebanada que lo construye | Prueba o evidencia prevista |
|---|---|---|

Reglas:
- Todo CA vigente tiene **una rebanada** y **una prueba o evidencia prevista**.
- Toda rebanada del plan cita **al menos un CA**; la que no cita ninguno sobra, o falta un criterio. Corrige el plan o la especificación.
- Si el hueco solo se cierra con una decisión del humano, dilo en una línea («Hay que parar: CA-n no tiene prueba posible, porque X»); si no, corrígelo tú.

## Durante la construcción y el cierre
- El prompt del módulo y los commits citan ids `CA-n`. Un criterio nuevo o cambiado se edita en la especificación en la misma rebanada que lo implementa.
- El informe de cierre (`cierre-de-modulo`) dice qué CA quedaron cubiertos y con qué evidencia, y cuáles no.
