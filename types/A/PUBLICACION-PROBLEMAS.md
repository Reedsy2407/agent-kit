# Publicación: resolución de problemas

Cosas que salieron mal al publicar por primera vez y qué hacer. Documento corto y local (`kit/`).

## El antivirus marca `powershell.exe` durante `wrangler login`
Avast puede avisar de `powershell.exe` mientras se inicia sesión (detección heurística `IDP.HELU.PSE95`). Suele ser una falsa alarma.
- Comprueba que la **firma digital de Microsoft es válida** (propiedades del archivo, pestaña «Firmas digitales»).
- Si lo es, déjalo terminar. **No crees excepciones ni apagues el antivirus.**
- Si la firma no es válida o no es la ruta de Windows, detente y avisa al humano.

## `wrangler pages project create` falla con «Notice to agents»
La vía de Pages no se usa: el proyecto se publica como Worker con archivos estáticos (ADR 0009). No uses `--force`. Verifica con la documentación oficial antes de cada uso.

## `wrangler` pregunta por el subdominio de `workers.dev`
Es interactivo: se responde en una shell real, en el primer despliegue del humano. No lo intentes desde la terminal del agente (se quedaría esperando).

## `EBUSY` al preparar `dist/` en Windows
Algo tiene la carpeta abierta (un servidor local, el explorador). `publish.mjs` ya vacía el contenido con reintentos en vez de borrar la carpeta; si persiste, cierra lo que la use.

## El 404 sale sin estilos en una ruta anidada
El 404 de `dist/` debe usar rutas absolutas desde la raíz. `publish.mjs` las reescribe y `scripts/humo.mjs` lo comprueba; si falla, revisa que el 404 no cargue estilos con rutas que `publish.mjs` no reconoce.

## Línea de comando que se queda esperando
Nada de `wrangler login`, `wrangler dev` ni nada interactivo desde el agente. Sí `timeout` en todo lo que pueda tardar.
