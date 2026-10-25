---
name: explorar-direcciones
description: Explora tres o más direcciones visuales maquetadas en local (una basada en una referencia que el humano nombra), con capturas, hoja comparativa y video, y deja la elección al humano. Úsala antes de la primera pantalla con interfaz o cuando el humano pida un rediseño.
disable-model-invocation: true
---

Exploración de direcciones antes de construir. La fuente de verdad sigue siendo `design/DESIGN-BRIEF.md`; esta skill rellena su sección «Dirección vigente» solo cuando **el humano** elige. Todo lo que genera va a `design/refs/` (ignorado por git). **Sin commits hasta que se elija una dirección.**

## 1. Prepara
- Lee el brief: audiencia, tres adjetivos, perfil de expresión (`sobrio` o `expresivo`) y reglas visuales mínimas.
- Pide al humano **una referencia que nombre** (una página admirada). Si no la tiene, es la única pregunta; no inventes una.
- Elige el preset de partida: `design/presets/expresivo.css` o `sobrio.css` (se cargan después de `design/styles.css`).

## 2. Tres direcciones como mínimo
Distintas entre sí, no tres variantes de color:
1. **Conservadora:** lo esperable del género, bien hecho.
2. **Editorial o de oficio:** salida del mundo del público (material, objeto, oficio), no de un sitio web.
3. **Basada en la referencia nombrada:** primero aplica la skill `estudiar-referencia` y trabaja solo con su lista de lo que se toma.
Más direcciones si ayudan, nunca menos de tres. Cada una en su carpeta: `design/refs/<direccion>/` (HTML y CSS estáticos, tokens de `styles.css` + preset, datos de ejemplo marcados como demostración). El marco de editor de código, o cualquier género concreto, es **una** dirección posible, no el punto de partida.

## 3. Evidencia
Con la biblioteca de `tests/front/` (si el proyecto la tiene):
- `node tests/front/herramientas/capturas.mjs --carpeta design/refs/<direccion> --etiqueta <direccion>`: 360, 768, 1280 y 1920 px, oscuro y claro, esperando por condición.
- `node tests/front/herramientas/hoja.mjs --carpetas d1,d2,d3`: hoja comparativa lado a lado en `design/refs/hoja.html`.
- `node tests/front/herramientas/video.mjs --carpeta design/refs/<direccion> --etiqueta <direccion>`: un video corto (webm) por dirección.
Sin ellas, capturas a mano con los mismos anchos y temas.

## 4. Entrega
Una tabla: dirección, qué la distingue, costo S/M/L, tokens y dependencias nuevas, riesgos de legibilidad o rendimiento, y **una recomendación razonada**. La ambición se decide aquí. Después **te detienes**: elegir la dirección es del humano (decisión de negocio fuera del brief).

## 5. Tras la elección
Actualiza el brief (dirección, perfil, elemento firma, paleta y tipografía con `elegir-tipografia-paleta`), borra lo no elegido de la vista pero conserva `design/refs/` local, y empieza la construcción con `revision-visual`.
