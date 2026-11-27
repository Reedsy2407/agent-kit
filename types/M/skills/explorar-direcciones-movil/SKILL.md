---
name: explorar-direcciones-movil
description: Propone tres o más direcciones visuales distintas, descritas en texto, para una app móvil (tipo M) a partir del estudio de referencias, deja la elección al humano y escribe el brief de diseño móvil con lo elegido. Úsala tras estudiar las referencias y antes de la primera pantalla, o cuando el humano pida un rediseño.
---

Exploración de direcciones antes de construir. Las direcciones se **describen**; no se programan. **No elijas por el humano.**

## 1. Prepara
- Lee `design/ESTUDIO-REFERENCIAS.md`. Si no existe, aplica antes `estudiar-referencia-movil`.
- Lee `DECISION-VIABILIDAD.md`, la especificación o el encargo y `kit/PLATAFORMA-ANDROID.md` (accesibilidad `[P-ACC-1]` a `[P-ACC-7]`; conducción [P-CON-5] si hay pantallas en marcha).
- No hace falta preguntar gustos antes de proponer: las direcciones son la pregunta.

## 2. Mínimo tres direcciones
**Al menos 3, distintas entre sí**, no tres colores de la misma idea: cambian la navegación o la jerarquía, la densidad, la forma o el tono. Una puede ser la convencional del rubro bien hecha; las otras se apartan con una razón de uso. Cada una dice:
1. **Nombre e idea** en una frase, y para qué situación de uso es la mejor.
2. **Qué patrón de referencia toma** (filas del estudio, con su fuente) y **qué deliberadamente no** toma, con el porqué. Marca, logotipos, textos, iconos propios, ilustraciones y pantallas concretas quedan fuera siempre: es regla del kit (la tienda, aparte, prohíbe suplantar e infringir derechos [P-MAR-1] [P-MAR-2]).
3. **Tokens como idea**, en palabras: **color** (papeles: fondo, texto, acción principal, estados; en claro y en oscuro), **tipografía** (carácter y escalones de jerarquía), **espaciado** (densidad y ritmo) y **radios** (forma). Sin valores finales.
4. **Pantallas clave** descritas: qué se ve primero, la acción principal y dónde queda el pulgar.
5. **Estados** (carga, vacío, error, sin red, bloqueo) y, si se usa en marcha, cómo cumple la regla de conducción.
6. **Riesgos** de legibilidad, accesibilidad o confusión con una app existente, y costo S/M/L.

**No escribas CSS, Compose, XML ni ningún código**, ni códigos de color ni medidas definitivas: eso llega con el stack y la construcción.

## 3. Entrega y parada
Escribe `design/DIRECCIONES.md` con las direcciones, una tabla comparativa (qué la distingue, qué toma, qué no toma, costo, riesgos) y **una recomendación razonada**. Después **te detienes**: elegir es del humano (decisión de negocio fuera del brief). Puede elegir una, combinarlas o pedir otras. Una recomendación no es una elección y el silencio tampoco.

## 4. Tras la elección
- Si no existe `design/DESIGN-BRIEF.md`, créalo desde `kit/plantillas/BRIEF-DISENO-MOVIL.md`; si existe, actualízalo sin borrar lo ya decidido.
- Anota la dirección vigente, la fecha, **quién la eligió** y qué se descartó y por qué. Lo que siga sin decidir va en «Qué sigue abierto».
- La interfaz construida se revisa con `kit/plantillas/REVISION-VISUAL-MOVIL.md`.
