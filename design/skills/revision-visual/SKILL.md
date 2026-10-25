---
name: revision-visual
description: Lazo de revisión visual antes de pedir un merge en un proyecto con interfaz - pruebas de front ejecutables, capturas por condición en varios anchos, lista de autocrítica con la pregunta anti-slop y corrección de defectos. Úsala al terminar cada pantalla o rebanada con interfaz, antes del lint, las pruebas y el build.
disable-model-invocation: true
---

Corre este lazo antes del lint, las pruebas y el build, y antes de pedir un merge. La fuente de verdad es `design/DESIGN-BRIEF.md`. Si el proyecto tiene `tests/front/`, la parte medible **se ejecuta**, no se opina.

## 0. Perfil de expresión
Antes de nada, comprueba en `design/DESIGN-BRIEF.md` que el **perfil de expresión** está declarado («sobrio» o «expresivo»). Si falta, es un defecto bloqueante: avisa y no sigas. Después, durante todo el lazo, comprueba que el perfil se **respeta**: un perfil sobrio no lleva efectos decorativos; uno expresivo se mantiene dentro del presupuesto de efectos del brief (solo `opacity` y `transform`, `aria-hidden`, apagados con `prefers-reduced-motion`, pausados en pestaña oculta, contraste AA contra el peor caso). El kit no hereda el perfil de otro proyecto.

## 1. Lista ejecutable
Cada línea es un comando con `timeout` (y sin esperar entrada). Todos en verde antes de seguir; lo que falle se corrige, no se desactiva.

```
node tests/front/run.mjs                       # todo lo configurado en tests/front/front.config.json
node tests/front/run.mjs --solo contraste      # una prueba (ids: dist, datos, contenido, contraste, layout, movimiento, peso, csp, cpu)
node tests/front/herramientas/capturas.mjs --etiqueta revision        # 360, 768, 1280 y 1920 px, oscuro y claro
node tests/front/herramientas/hoja.mjs --carpetas revision            # hoja lado a lado en design/refs/hoja.html
```

| Punto de la revisión | Prueba |
|---|---|
| Contraste AA contra el peor caso (resplandor, texturas) | `contraste` |
| Sin scroll lateral (360, 768, 1280), objetivos de 44 px, foco de 3 px, texto ≥ 15 px | `layout` |
| Solo `opacity` y `transform`, nada parpadea, texturas ≤ 8 %, `prefers-reduced-motion` | `movimiento` |
| Portada ≤ 150 KB, JS ≤ 15 KB, sin otros orígenes, ≤ 4 fuentes con licencia | `peso` |
| Legible sin JavaScript, `rel` de enlaces externos, un h1, enlaces sin roturas | `contenido` |
| Teléfonos y nombres que no se publican | `datos` |
| CSP sin violaciones y que bloquea un script inyectado | `csp` |
| Solo lo permitido en la carpeta de publicación | `dist` |
| CPU en reposo (mediana de varias muestras) | `cpu` |

Si el proyecto no tiene la biblioteca, repite a mano esos puntos con los mismos umbrales y dilo en el informe. Declara siempre lo no medido (GPU real, equipo de gama baja).

## 2. Capturas
- Pantallas clave: acceso, listas, detalle, formularios, estados vacíos y de error.
- Anchos: 360 y 1280 px siempre; 768 y 1920 px cuando el layout cambia. Claro y oscuro solo si el producto los tiene.
- **Esperas por condición, no por tiempo** (la herramienta ya lo hace): contenido final presente y animaciones terminadas. En la primera pasada de un proyecto se fotografió una pantalla imprimiéndose y un contador animándose, y el número del contador era la animación, no el dato.
- Guarda las capturas en `design/refs/` (local, ignorado por git). En Windows, si usas un servidor propio, elige un puerto fuera de los rangos reservados (`netsh int ipv4 show excludedportrange protocol=tcp`).

## 3. Autocrítica: lo que ninguna prueba mide
Una línea por pantalla y variante:
1. **Jerarquía:** un solo foco por pantalla.
2. **Espaciado:** escala de 4 px, sin valores sueltos fuera de los tokens.
3. **Estados vacíos y de error:** existen, dicen qué hacer y no usan el color como único canal.
4. **Ancho aprovechado:** nada de una columna estrecha flotando sobre un fondo vacío a 1280 o 1920 px.
5. **Legibilidad:** el contenido largo (experiencia, descripciones) no se muestra con formato de código; interlineado de 1,6 como mínimo.
6. **Un solo punto de contacto** y nada de relleno ni demostraciones simuladas.
7. **Anti-slop:** tipografía deliberada, paleta propia y un elemento firma. Prueba de intercambio (¿serviría con otro logo?) y de escala de grises. Preguntas de control, por escrito: «¿se ve plano o genérico?» y **«¿saldría lo mismo para cualquier brief parecido?»**. Si la respuesta es sí, se rehace (o se avisa al humano si es una decisión de dirección).

## 4. Corrige y registra
- Arregla la accesibilidad con roles y teclado reales; nunca con un `disable` del lint ni quitando la prueba.
- La crítica de fondo la hace un subagente aislado, que **antes de opinar lee `design/TOOLING.md`** y el brief.
- El informe de cierre dice qué defectos se encontraron y se corrigieron, el resultado de `tests/front/run.mjs` con cifras, qué no se midió, y cita las skills de diseño usadas (o que no estaban instaladas).
