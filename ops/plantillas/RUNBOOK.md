# Runbook — {{proyecto}}

Fecha: {{fecha}}. Se mantiene junto con el sistema: si cambia cómo se arranca, se para o se mira, cambia aquí en el mismo commit. Los comandos son los que la ficha permite (`kit/FICHA-INFRA.json`, bloque `ops`); aquí no hay secretos, solo su nombre y dónde viven.

## Qué es y de qué depende
Una frase sobre qué hace el sistema y quién lo usa. Dependencias externas que importan en una caída (datos de terceros, correo, base de datos, almacenamiento) y su plan B (ver `DECISION-VIABILIDAD.md` en el tipo B).

## Estado
- Dirección pública: ______
- Comprobación de salud: `node scripts/salud.mjs <dirección pública>` (configuración en `ops/salud.config.json`).
- Comando de estado del proveedor (si la ficha lo permite): ______
- Qué significa «sano»: ver `ops/SALUD-MINIMA.md`.

## Arranque
Pasos exactos, en orden, con el comando y lo que debe verse después de cada uno. Qué tarda en estar listo. Qué hacer si el primer arranque tras mucho tiempo es lento (servicios que se duermen).
1. ______
2. ______

## Parada
Pasos exactos y qué se pierde o se interrumpe (peticiones en curso, trabajos largos). Cómo volver a arrancar.
1. ______

## Dónde mirar cuando algo va mal
| Síntoma | Dónde mirar | Cómo (con filtro, límite y `timeout`) |
|---|---|---|
| El sitio no responde | Estado del proveedor, último despliegue | ______ |
| Errores 5xx | Registros del servicio, filtrados por fecha y nivel | ______ |
| Lento | Mediana de la comprobación de salud, cuotas, base de datos | ______ |
| Datos raros | Última migración, último dato bueno guardado, fuente externa | ______ |
| Un tercero falla | Estado del tercero; el sistema debe degradar (último dato bueno / dato declarado / «no disponible») | ______ |

Los registros nunca se siguen en vivo (`tail -f`): se leen con límite a un archivo temporal fuera del repositorio.

## Quién decide qué
- Reiniciar o reintentar (reversible): quien opera, si la ficha lo permite.
- Volver a la versión anterior: ver `PLAN-REVERSA.md`.
- Restaurar o borrar datos, rotar secretos, cambiar DNS: solo con autorización explícita del humano responsable.

Responsable: ______. Suplente: ______. Cómo se le avisa: ______.
