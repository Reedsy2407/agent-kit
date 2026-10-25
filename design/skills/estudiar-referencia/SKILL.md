---
name: estudiar-referencia
description: Estudia en Chrome una página que el humano nombra como referencia - oscuro y claro, escritorio y móvil, midiendo - y deja por escrito qué se toma y qué no, sin copiar activos ni textos. Úsala antes de maquetar una dirección basada en una referencia.
disable-model-invocation: true
---

Protocolo de estudio de una referencia. El objetivo es extraer **decisiones**, no píxeles. Todo se guarda en `design/refs/<referencia>/` (ignorado por git).

## 1. Estudia en Chrome
- Abre la página en Chrome (con las herramientas de navegador de la sesión, o con el navegador ya instalado); no descargues el sitio, no guardes su HTML, CSS, imágenes ni fuentes.
- Recórrela en **oscuro y claro** y en **escritorio (1280 y 1920 px) y móvil (360 px)**.
- **Mide**, no estimes: anchos de columna y de contenedor, espacios entre secciones, tamaños de letra y escala, relación de contraste, radios, densidad, duración de los movimientos y cuántos hay. Anota los números.

## 2. Escribe `NOTAS.md`
Dos listas obligatorias:

**Qué se toma** (decisiones): género, estructura de la página, orden de las secciones, ritmo de espacios, escala tipográfica, forma, tipo y tope de los efectos.

**Qué no se toma**: textos, ilustraciones, mascota, tema y marca, fuente, logo, paleta exacta, nombres de archivo, y cualquier composición reconocible. Si una decisión sola ya identifica a la referencia, se cambia.

Añade las mediciones y una línea por cada decisión con su razón: por qué sirve a **este** proyecto (audiencia y adjetivos del brief), no por qué es bonita.

## 3. Límites
- Lo que no está en «se toma» no se usa.
- Ni copiar textos, ni calcar la composición, ni reutilizar un activo, aunque sea «temporal».
- La referencia manda sobre el género y la estructura, no sobre el brief: si discrepan, gana el brief.

## 4. Salida
`design/refs/<referencia>/NOTAS.md` y, si ayuda, capturas **propias** de las mediciones para uso local. Entrégaselo a `explorar-direcciones` como entrada de la dirección basada en la referencia. No hay commits de este material.
