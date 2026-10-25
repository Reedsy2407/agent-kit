# Front del tipo B

El tipo B no trae código de front propio: reutiliza lo que el kit ya ofrece para cualquier interfaz y lo prueba **contra una dirección ya desplegada**.

## Qué se reutiliza
- **Tokens y reglas:** `design/styles.css`, `design/DESIGN-BRIEF.md` (el perfil de expresión del tipo B parte de «sobrio»), `design/TOOLING.md` y `design/FRONTEND.md`.
- **Presets y patrones:** `design/presets/` (`sobrio`, `expresivo`: mismos tokens) y `design/patrones/`.
- **Skills de diseño:** `explorar-direcciones`, `estudiar-referencia`, `pulir-front`, `elegir-tipografia-paleta` y `revision-visual`.
- **Biblioteca de pruebas:** `tests/front/` (contraste, desborde, objetivos táctiles, foco, movimiento, peso, CSP, contenido sin JavaScript, datos sensibles, CPU en reposo).

## Cómo se prueba contra una dirección
1. Copia `tests/front/front.config.ejemplo.json` a `tests/front/front.config.json`.
2. Pon en `origen.url` la dirección https del front desplegado y en `paginas` las rutas reales (tipo `portada`, `interior` o `404`).
3. Corre `node tests/front/run.mjs` (con `timeout`), o con otra dirección: `node tests/front/run.mjs --url https://…`.
4. Necesita `playwright-core` como `devDependency` opcional del proyecto (versión fijada y `package-lock.json`) y un Chrome instalado (`CHROMIUM_PATH`); sin ellos las pruebas de navegador se omiten con un aviso.

## En el sello de pre-merge
La ficha (`kit/FICHA-INFRA.json`) declara `kit.front` apuntando a `tests/front/front.config.json`. Mientras ese archivo no exista, el sello solo lo avisa; en cuanto existe, corre las pruebas de front como una comprobación más. Un front que aún no está desplegado no puede probarse contra una dirección: se prueba después del primer despliegue (por eso el despliegue va desde la primera rebanada).

## Lo que no mide
GPU real, equipos de gama baja y contraste sobre imágenes de fondo complejas se declaran, igual que en el tipo A.
