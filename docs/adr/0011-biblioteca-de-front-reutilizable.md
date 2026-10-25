# 0011. Biblioteca de front reutilizable: pruebas, herramientas, presets y patrones

Estado: aceptada (2026-10-22)

## Contexto
La primera aplicación real del tipo A (un portafolio) acabó con un conjunto de pruebas de front de mucho valor (contraste contra el peor caso, desborde, objetivos táctiles, foco, movimiento, peso, contenido, datos sensibles, CSP, CPU) y con herramientas de capturas. Pero estaban atadas a ese proyecto: nombres de clase, textos, un correo y un CV concretos. Las reglas escritas del brief se incumplen; lo que se prueba, no.

## Decisión
- **Dónde vive:** en `front/` del kit (biblioteca, pruebas, herramientas y plantilla de configuración) y, en el proyecto, en `tests/front/` **versionado**: las pruebas son parte del proyecto y deben correr igual en cualquier clon. El diseño (`design/presets/`, `design/patrones/`, `design/FRONTEND.md`) se instala en `design/`, también versionado. Capturas, hoja y video van a `design/refs/`, ignorado por git; las herramientas se niegan a escribir en otro sitio o si esa carpeta no está en `.gitignore`.
- **Sin dependencias en el kit (ADR 0001 y 0004):** todo es Node ESM. `playwright-core` es una `devDependency` **opcional del proyecto**, con versión exacta y `package-lock.json` (`npm ci`); el kit no la instala ni descarga navegadores. Se usa el Chrome ya instalado con `CHROMIUM_PATH` (o `PLAYWRIGHT_CORE` para apuntar a la carpeta de `playwright-core`). Sin él, el comando dice cómo instalarlo y sale con 2.
- **Genéricas por configuración, no por nombres de clase:** las pruebas miden estilos calculados y leen `tests/front/front.config.json` (páginas, temas, anchos, umbrales, selectores de objetivos y decorativos, patrones de datos sensibles, lista permitida de `dist/`). Cambiar de género visual cambia la configuración y el HTML, no las pruebas. La configuración se valida de forma estricta (clave desconocida o umbral inválido falla al cargar).
- **Contra una carpeta o una URL:** una carpeta se sirve en proceso con su `_headers`; una URL prueba un sitio publicado. Es la forma de uso del tipo B (mismos tokens con el preset `sobrio` y mismas pruebas contra una URL).
- **Una fuente de verdad del color:** `front/lib/color.mjs` es la aritmética de contraste que usa Node y la que se inyecta como texto en la página (la función `colorFactory` no tiene cierres externos, y una prueba lo comprueba).
- **Presets y patrones:** `sobrio` y `expresivo` son dos conjuntos de tokens con el mismo contrato (una prueba lo exige); los patrones se copian y adaptan, usan solo tokens, no usan estilos en línea (compatibles con una CSP estricta) y un catálogo armado con cada preset pasa la propia biblioteca de pruebas.
- **Integración:** el manifiesto del tipo A instala todo; la ficha declara `kit.front` y el sello de pre-merge ejecuta `kit.front.comando` si existe `kit.front.config` (si no, lo dice); `guard-shell` pide `timeout` para esos comandos.

## Qué se extrajo del portafolio y cómo se generalizó
Contraste con resplandor y capas de textura (ahora a partir del `text-shadow` y de cualquier imagen de fondo calculados, con el alfa máximo de la configuración, sin variables CSS de un proyecto); desborde, objetivos de 44 px, foco de 3 px y texto mínimo (selectores de la configuración); animaciones solo `opacity` y `transform`, ciclo mínimo y movimiento reducido (decorativos declarados en la configuración); peso, JS, otros orígenes y fuentes (más registro de licencias); contenido sin JavaScript, `rel` de enlaces, un h1 (el texto esperado sale de la configuración); datos sensibles (teléfonos, nombres y patrones configurables, en texto, atributos y código); CSP sin violaciones y que bloquea un script inyectado; CPU en reposo con mediana de varias muestras; capturas esperando por condición. No se copió ningún texto, dato personal, estilo ni activo del proyecto de origen.

## Consecuencias
- Un proyecto con interfaz hereda reglas **ejecutables**, no solo escritas; el sello las corre.
- Quedan sin medir (y se declara): GPU real y equipos de gama baja; la pausa con la pestaña oculta en código ajeno a los patrones; el contraste de texto sobre imágenes de fondo complejas (se mide contra el color de respaldo y el peor caso de la textura).
- El primer despliegue de pruebas de navegador exige `playwright-core` y Chrome; en el kit esas pruebas se omiten y se dice por qué si no están.
