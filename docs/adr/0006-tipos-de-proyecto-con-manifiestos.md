# 0006. Tipos de proyecto A y B con manifiestos

Estado: aceptada (2026-10-19). El tipo B dejó de estar pendiente en el ADR 0013. El tipo C (herramientas y software de sistemas) se añade con el ADR 0018 y estado `en-construccion`: el instalador lo trata como no disponible, igual que a un tipo pendiente.

## Contexto
No todo proyecto es un sistema con servicios. Un portafolio (tipo A) es un sitio estático que debe abrir al instante; un sistema con servicios (tipo B) tolera arranque en frío y necesita operación (despliegue, base de datos, logs).

## Decisión
- Cada tipo tiene un manifiesto en `types/<X>/manifest.json` con los puntos del kit que aplican, y los que no, y la lista de archivos del núcleo y del diseño que se instalan.
- El tipo A se entrega completo en la etapa 1. El tipo B solo trae el manifiesto de puntos, con `estado: "pendiente-etapa-2"` y sin contenido de operación; el instalador lo avisa y termina sin error.
- El instalador pregunta el tipo solo si hay terminal interactiva; sin ella exige `--tipo`, para no esperar stdin.

## Consecuencias
- Añadir un tipo es añadir un manifiesto, no tocar el instalador.
- Nada específico de un proveedor entra en `core/`; lo de operación (Render, Neon y equivalentes) irá en `infra/` y en el tipo B.
