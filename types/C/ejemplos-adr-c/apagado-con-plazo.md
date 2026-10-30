# ADR de ejemplo. El apagado deja terminar el trabajo en curso dentro de un plazo

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Un daemon procesa lotes de trabajo y escribe resultados en disco. Lo detiene un supervisor que primero pide terminar y, pasado un tiempo, fuerza. Una salida forzada a mitad de un lote deja resultados a medias. Ficha: `kit/catalogo-c/apagado-ordenado.md`.

## Decisión
La petición de terminar activa una bandera. El bucle no empieza lotes nuevos, deja acabar el lote en curso y sale con éxito tras registrar el apagado. El lote en curso tiene un plazo propio, algo menor que el del supervisor; si lo agota, se abandona y se registra qué quedó sin terminar. Las esperas entre lotes se interrumpen al instante.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Dejar el comportamiento por defecto del sistema | Corta el lote a mitad de camino | Resultados a medias que alguien debe limpiar |
| Cancelar también el lote en curso | Mismo daño, con un código más complejo | Escrituras parciales |
| Esperar sin plazo | Un lote colgado impide parar y el supervisor acaba forzando | Salida forzada sin registro |
| Cola persistente para reanudar | Resuelve el caso extremo con una pieza grande | Almacén, formato y recuperación que mantener |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Cola persistente de trabajo | Perder el lote abandonado por el plazo tiene costo real |
| Segunda señal que fuerza al instante | Un usuario necesita salir sin esperar al plazo |

## Consecuencias
Un apagado pedido termina limpio casi siempre y el resumen cuenta lo ocurrido. Se comprueba con una prueba que pide parar con un lote a medias y verifica que termina, que no empieza otro y que la salida es de éxito.

## Señal para revisar
Lotes que agotan el plazo de forma habitual (hay que acortarlos o subir el plazo), o un supervisor distinto con otra política de señales.
