---
name: pulir-front
description: Ronda de pulido de un front ya construido - legibilidad del contenido largo, contenido mínimo, un solo punto de contacto y pruebas de front en verde. Úsala cuando la pantalla ya funciona y antes de pedir el cierre; no sustituye a revision-visual.
disable-model-invocation: true
---

Ronda de pulido sobre lo construido. Corrige defectos; no rediseña (un rediseño lo decide el humano). La fuente de verdad es `design/DESIGN-BRIEF.md`.

## 1. Legibilidad del contenido largo
- Experiencia, descripciones y listas **no** se muestran con formato de código (JSON, claves y llaves visibles): es decoración que estorba la lectura. Usa el patrón `linea-de-tiempo` o párrafos.
- Interlineado de 1,6 como mínimo; de 2 a 4 viñetas por puesto; etiquetas para las tecnologías (patrón `etiquetas`).
- Texto de 15 px como mínimo (base de 18 px); nada importante solo en color.

## 2. Contenido mínimo
- Sin demostración simulada y sin páginas largas de caso de estudio: si el sistema real existe, se enlaza.
- Una tarjeta del proyecto destacado con descripción, tecnologías y enlaces (patrón `tarjeta-proyecto`); no una rejilla de tarjetas idénticas.
- Sin marcadores «por confirmar» visibles ni datos de relleno.

## 3. Un solo punto de contacto
- Si el perfil ya trae correo, perfil profesional, perfil de código y CV, **no hay sección «Contacto»** ni enlace «Escribir».
- El correo es un solo chip que copia la dirección con confirmación accesible y, sin JavaScript, un enlace `mailto:` (patrón `chip-copiable`). Nunca dos enlaces al mismo correo.
- Sin teléfono publicado salvo decisión expresa del humano (la prueba `datos` lo vigila).

## 4. Pruebas y evidencia
- `node tests/front/run.mjs` completo, con `timeout`. Todo en verde; lo que no se pudo medir (GPU real, equipo de gama baja, pausa con pestaña oculta) se declara en el informe.
- `node tests/front/herramientas/capturas.mjs --etiqueta pulido` y revisa las capturas a 360 y 1280 px en ambos temas.

## 5. Cierre de la ronda
Responde por escrito: «¿saldría lo mismo para cualquier brief parecido?». Si sí, falta carácter: dilo (es una decisión de dirección, no la tomes por tu cuenta). Informe corto: qué defectos encontraste, cuáles corregiste y qué quedó sin medir.
