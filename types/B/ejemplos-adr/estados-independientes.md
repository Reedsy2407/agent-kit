# ADR de ejemplo. Actividad y verificación son dos estados independientes

Ejemplo breve y abstracto, tomado del caso público esg-trazabilidad. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Una entidad pasó a tomar su nombre legal de un registro oficial. Hay entidades registradas cuando el registro no respondía, con un nombre escrito a mano: no están «inactivas», están sin comprobar. Y una entidad verificada puede dejar de recibir documentos por una decisión del negocio sin dejar de estar verificada. Un solo campo no distingue las dos causas. Ficha: `kit/catalogo/estado-ciclo-vida.md`.

## Decisión
Dos campos que cambian por separado:
- Actividad: activa o inactiva, que cambia el personal con un motivo.
- Verificación: verificada o no verificada, que pasa a verificada con la acción «verificar».

Solo una entidad activa **y** verificada recibe documentos. El servicio comprueba primero la actividad y después la verificación, con códigos de error distintos.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Un campo con tres valores (activa, inactiva, no verificada) (la más simple) | Mezcla dos causas y obliga a perder una al cambiar de estado | Estados imposibles de representar |
| Dejar emitir a las no verificadas con una advertencia | El documento repetiría un nombre sin comprobar | Documentos con datos dudosos |

## Consecuencias
Cuatro combinaciones y una sola que emite; cada estado tiene una causa y una salida (reactivar o verificar). Las entidades heredadas, escritas a mano, figuran como no verificadas hasta verificarlas. Se comprueba con una prueba por combinación.

## Señal para revisar
Que aparezca una tercera dimensión independiente (por ejemplo, vigencia de una licencia).
