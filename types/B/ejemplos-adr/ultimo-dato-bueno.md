# ADR de ejemplo. Un dato de un servicio externo se guarda como último dato bueno

Ejemplo breve y abstracto, tomado del caso público esg-trazabilidad. Úsalo como forma, no como texto: tu decisión nace de tus criterios.

Estado: aceptada

## Contexto
El sistema muestra, junto a cada documento, un dato público agregado que publica un servicio de terceros. El servicio no está documentado, sus términos de uso no estaban verificados y puede cambiar o caer sin aviso. El dato cambia una vez al año. Dependencia **importante**, no crítica (ver `DECISION-VIABILIDAD.md`). Ficha: `kit/catalogo/dependencias-externas.md`.

## Decisión
- Un cliente de solo lectura detrás de un puerto, sin credenciales y con tiempos de espera cortos, que consulta fuera de cualquier transacción.
- Cada respuesta útil se guarda con su año y fecha de consulta; esa tabla hace de caché larga y de **último dato bueno** si el tercero deja de responder.
- Al emitir un documento, el dato se **congela en el propio documento**, con su fuente y año; reexportar nunca vuelve a consultar.
- Sin dato ni copia guardada, la pantalla dice «no disponible». Nada se bloquea por el tercero.
- De la respuesta solo se usa lo que es seguro entender (los conteos); lo ambiguo (unidades que no se declaran) se descarta.
- Las pruebas usan respuestas grabadas; la integración continua nunca llama al servicio real.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Consultar en vivo en cada pantalla (la más simple) | Frágil, lenta y abusiva con un servicio público para un dato anual | Cada caída ajena sería una pantalla rota |
| Caché solo en memoria | Se pierde cada vez que el alojamiento duerme el servicio | Consultas repetidas y sin último dato bueno |
| Pedir el dato por empresa a mano a cada cliente | Cambia el valor del producto y no escala | Trabajo manual recurrente |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Sincronización programada | Que el dato pase a cambiar con frecuencia |
| Reintentos automáticos | Que el tercero falle de forma transitoria con frecuencia medida |

## Consecuencias
Si el tercero cambia su interfaz, el contexto queda en la última copia y la pantalla indica su año. Se comprueba con una prueba de caída simulada (la pantalla responde con la copia) y otra de documento ya emitido (no consulta).

## Señal para revisar
Un convenio formal con el tercero, o que el dato pase a ser crítico para el valor del producto.
