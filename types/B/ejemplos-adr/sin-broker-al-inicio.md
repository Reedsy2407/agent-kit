# ADR de ejemplo. Sin intermediario de mensajes ni bandeja de salida al inicio

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Dos módulos deben reaccionar a un cambio de datos. Ambos viven en el mismo proceso y la misma base. No hay un tercer consumidor ni requisitos de entrega a otro sistema. Ficha: `kit/catalogo/consistencia-datos-eventos.md`.

## Decisión
La reacción ocurre dentro de la misma transacción mediante un servicio de aplicación; el cambio y su efecto se confirman o se deshacen juntos. Los módulos se comunican por interfaces internas, de modo que una publicación de eventos pueda reemplazar la llamada directa sin tocar el dominio.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Llamada directa dentro de la transacción (la más simple) | Es la elegida | Acoplamiento entre módulos, aceptado |
| Intermediario con bandeja de salida | Una tabla, un publicador, consumidores idempotentes y un servicio más que operar, sin un consumidor externo | Operación y pruebas adicionales sin retorno |
| Publicar tras confirmar sin bandeja | Pérdida silenciosa de avisos si el proceso cae | Datos que no cuadran |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Intermediario de mensajes | Un consumidor en otro proceso o en otro sistema |
| Bandeja de salida transaccional | Esos avisos hacia fuera no se pueden perder |
| Cola de mensajes muertos | Existe un consumidor asíncrono |

## Consecuencias
Menos piezas, una sola unidad de despliegue y consistencia inmediata. Se comprueba con una prueba que fuerza un fallo en el efecto y verifica que el cambio se deshace.

## Señal para revisar
El primer consumidor que no pueda ser síncrono.
