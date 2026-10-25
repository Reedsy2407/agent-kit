# 0010. Escaneo de secretos de respaldo y comprobación de autoría

Estado: aceptada (2026-10-21)

## Contexto
El sello de pre-merge (ADR 0007) corría gitleaks solo si había binario, y sin él lo único que hacía era avisar en un log: un sello podía pasar sin que nadie hubiera buscado secretos. Además, el sello con la lista de comprobaciones vacía pasaba (un pendiente conocido del tipo A), y el historial de un proyecto nuevo puede llevar el correo personal del autor a un repositorio público.

## Decisión
- `core/hooks/escaneo-secretos.mjs` (Node, sin dependencias, ADR 0001 y 0004) busca patrones de claves y tokens en el árbol de trabajo y en las líneas añadidas del historial, con la misma lista de patrones que `guard-write` (una sola fuente), y nunca imprime el valor. Una línea con `escaneo-secretos:ignorar` se salta, y las rutas exactas de `.escaneo-secretos-ignorar` se saltan enteras, también en el historial (ejemplos y pruebas con secretos falsos a propósito).
- El sello usa gitleaks si hay binario; si no, corre este escaneo. Si tampoco puede correr, o gitleaks está desactivado en la ficha, el sello dice «SIN ESCANEO DE SECRETOS» y lo deja anotado en `.git/kit-premerge.json`.
- El sello se niega si la ficha no define comprobaciones (`kit.checks`): exige al menos las pruebas del proyecto. La ficha del tipo A trae `npm test`.
- `lib/autoria.mjs` revisa los correos de autor y committer de todo el historial: son válidos los que contienen «noreply» y los que la ficha indique en `kit.autoria.correosPermitidos` (correos o dominios con `@`). El sello **avisa**, no bloquea, si hay un correo personal.
- Reescribir la autoría antes de publicar es una excepción puntual: requiere autorización explícita del humano y una rama de respaldo local que nunca se sube.

## Consecuencias
- Ningún sello pasa en silencio sin escaneo de secretos.
- El escaneo propio es más simple que gitleaks (patrones conocidos, no entropía): no lo sustituye, lo respalda, y el informe de cierre dice cuál corrió.
- La decisión sobre la autoría sigue siendo del humano; el kit solo la hace visible antes del primer push.
