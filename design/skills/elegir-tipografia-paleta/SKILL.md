---
name: elegir-tipografia-paleta
description: Elige fuentes y paleta con licencia verificable, cobertura latina completa y contraste AA calculado, con un máximo de cuatro archivos de fuente, y lo registra en el brief y en TOOLING. Úsala al fijar la dirección visual o al cambiar de tipografía o de paleta.
disable-model-invocation: true
---

Tipografía y paleta como decisiones auditables. Ninguna se elige «porque se ve bien»: se elige con licencia, cobertura y números.

## 1. Tipografía
- **Licencia verificable:** libre y redistribuible (por ejemplo OFL o Apache 2.0), leída del archivo de licencia de la fuente, no de memoria. Anótala en `design/TOOLING.md` (sección «Fuentes tipográficas»): nombre, versión fijada, fuente de descarga, licencia, archivos usados.
- **Cobertura latina:** letras acentuadas, ñ, ü, «¿», «¡», comillas «» “ ”, guion largo, símbolos de moneda y cifras tabulares. Pruébalo con una línea de muestra en el idioma del proyecto, no con «Lorem ipsum».
- **Máximo 4 archivos de fuente** en total (woff2 de subconjunto latino), autoalojados; ninguna carga desde otro origen. La prueba `peso` lo vigila y la prueba comprueba también que cada archivo figure en el registro de licencias (`fuentes.licencias` en `tests/front/front.config.json`).
- **Voz propia:** nunca Inter, Roboto, Arial ni la fuente del sistema como voz. Un par con intención (una para titulares y datos, otra para lectura) o una sola familia con pesos.
- **Sin salto al cargar:** respaldo local con `size-adjust`, `ascent-override` y `descent-override` en `design/styles.css`.
- Descarga como archivo estático con versión fijada: sin instalar paquetes ni ejecutar scripts (ADR 0004). Si el equipo no tiene red, es un paso manual del humano.

## 2. Paleta
- Parte de los colores de marca o del mundo del público; una paleta propia, no la del tema por defecto de una librería.
- Cada color es un token en `design/styles.css` con su contraste **calculado** anotado al lado (texto normal 4,5:1, texto grande y controles 3:1), y se añade al brief. `design/test/tokens.test.mjs` verifica que lo anotado es exacto.
- Si hay brillos o texturas, el contraste se calcula contra el peor caso (la prueba `contraste` lo mide en el sitio construido).
- Los colores de estado solo para su significado y nunca como único canal.

## 3. Registro
Actualiza la sección de tipografía y paleta del brief (familias, pesos, respaldo, tokens) y la tabla de `design/TOOLING.md`. Entrega: las fuentes elegidas con su licencia, la muestra de cobertura, la paleta con sus contrastes y una línea que diga cuántos archivos de fuente se cargan (≤ 4).
