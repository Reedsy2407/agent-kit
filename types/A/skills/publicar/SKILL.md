---
name: publicar
description: Publica un sitio estático (tipo A) en Workers con archivos estáticos - genera dist/, pasa las pruebas, despliega, hace la prueba de humo y deja la revisión humana en Chrome. Úsala solo cuando el humano pida publicar o actualizar el sitio.
disable-model-invocation: true
---

Flujo de publicación del tipo A: **publicar → pruebas → despliegue → humo → revisión**. Si un paso falla, reporta y no sigas. Nunca ejecutes `wrangler` con una orden que no esté en la ficha (`kit/FICHA-INFRA.json`). Decisión y motivos: ADR 0009 del kit.

## Antes de empezar: verificar la documentación
Antes de cada uso, comprueba en la documentación oficial de Cloudflare Workers (apartado de archivos estáticos) que siguen vigentes los campos de `wrangler.jsonc` (`assets.directory`, `not_found_handling`, `workers_dev`) y la sintaxis de `_headers`. Si algo cambió, para y dilo; no improvises. **No uses `wrangler pages project create` ni `--force`**: en la primera aplicación falló con un «Notice to agents» y esa vía queda descartada.

## Pasos SIEMPRE manuales (del humano, todos juntos y antes de empezar)
1. Crear la cuenta del proveedor y hacer `npx wrangler login` en una **shell real** (no la de Claude Code).
2. Registrar el subdominio de `workers.dev`: el panel nuevo no lo muestra antes del primer despliegue y `wrangler` lo pregunta de forma interactiva, por eso se hace en la shell real, en el primer despliegue.
3. El **primer despliegue lo hace el humano**. Después, si quiere, pone `despliegue.primerDespliegueHecho: true` en la ficha y vuelve a generar los permisos: solo entonces quedan autorizados `npm run deploy` y `npx wrangler deploy`, exactos. `wrangler delete`, `secret`, `logout` y `pages project delete` están siempre denegados.
4. Al terminar de desplegar, se recomienda `npx wrangler logout` (lo hace el humano): el inicio de sesión pide permisos que el sitio no usa.

Si el antivirus marca `powershell.exe` durante el inicio de sesión, ver `kit/PUBLICACION-PROBLEMAS.md`.

## Flujo
1. **Publicar:** `npm run publicar` (con `timeout`). Genera `dist/` (ignorada por git) copiando solo la lista permitida de `scripts/publish.mjs` y escribe `dist/_headers`. Revisa el resumen: nada de `design/`, `kit/`, `tests/`, `.claude/`, `scripts/`, `package*.json`, `CLAUDE.md`, `HANDOFF.md` ni capturas.
2. **Pruebas:** `npm test` (incluye `tests/publicacion.test.mjs`: contenido de `dist/` y CSP sin violaciones). Y el sello de pre-merge si la publicación sale de una rama.
3. **Despliegue:** solo con lo que ya está en la rama base, y solo con el bloque «DEPLOY AUTORIZADO» del prompt y la ficha al día. Con `npm run deploy`. Hasta confirmar en la documentación oficial que la vista previa por versión (`wrangler versions upload`) aplica a un Worker nuevo, **el primer despliegue es directo a producción y se revisa en vivo**; no la uses como si existiera.
4. **Humo:** `node scripts/humo.mjs <dirección pública>`: 200 en `/` y `/en/`, 404 con estilos, PDF del CV, cabeceras de seguridad, sin teléfono ni nombres prohibidos (edita las listas del script una vez). Un solo intento acotado; no hagas bucles.
5. **Revisión:** el humano, o el revisor externo, abre la dirección pública en Chrome (claro y oscuro, escritorio y móvil) y da el visto bueno. El informe cita lo que quedó sin medir.

## Archivos de este flujo
`scripts/publish.mjs`, `scripts/_headers.template` (sin comentarios, formato de archivos estáticos de Workers), `scripts/humo.mjs`, `wrangler.jsonc` (sin `main` ni binding), `tests/publicacion.test.mjs`. Las pruebas reproducibles requieren `playwright-core` como `devDependency` y `package-lock.json` versionado (`npm ci`, nunca `npm install` a ciegas).
