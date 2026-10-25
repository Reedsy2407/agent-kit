# 0009. Publicación del tipo A como Worker con archivos estáticos

Estado: aceptada (2026-10-21)

## Contexto
La primera aplicación real del kit (un portafolio de tipo A) se publicó en Cloudflare. El proveedor ha integrado Pages dentro de Workers: el sitio estático se publica hoy como un Worker con `assets`. Al intentar la vía de Pages, `wrangler pages project create` falló con un aviso dirigido a agentes («Notice to agents»), cuyo remedio era `--force`. Esa vía no se tomó. No se ejecutó nada contra la red al preparar este ADR: lo anotado sale de esa primera aplicación y debe **verificarse con la documentación oficial antes de cada uso**.

## Decisión
- El tipo A se publica como Worker de solo archivos estáticos: `wrangler.jsonc` sin `main` ni binding, `assets.directory` en `./dist`, `not_found_handling` en `404-page` y `workers_dev` activo.
- `dist/` (ignorada por git) la genera `scripts/publish.mjs` copiando **solo una lista permitida explícita**; una prueba falla si aparece algo que no debe publicarse. Las cabeceras (`_headers`, sin comentarios) llevan una CSP estricta con el script en línea autorizado por hash.
- No se usa `wrangler pages project create` ni `--force`. No se ejecuta `wrangler` desde el kit ni desde sus pruebas.
- El primer despliegue y el inicio de sesión son manuales del humano. Tras el primer despliegue, una opción de la ficha (`despliegue.primerDespliegueHecho`) autoriza solo `npm run deploy` y `npx wrangler deploy`, exactos. Siempre denegados: `wrangler delete`, `secret`, `logout` y `pages project delete`.
- Hasta confirmar en la documentación oficial que la vista previa por versión (`wrangler versions upload`) aplica a un Worker nuevo, el primer despliegue es directo a producción y se revisa en vivo.
- Lo específico del proveedor vive en `types/A/` y en `infra/`, nunca en `core/` ni en `design/`.

## Consecuencias
- Cambiar de proveedor de hosting es cambiar las plantillas de `types/A/plantillas/` y la ficha, no el núcleo.
- La publicación es reproducible y auditable: la lista permitida está en un archivo corto y la prueba la vigila.
- El kit depende de que la documentación del proveedor siga siendo como se anotó; por eso la skill `publicar` pide verificarla antes de cada uso.
