# ADR de ejemplo. Las métricas de la tienda antes que una biblioteca de fallos

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
La app se publica en la tienda y hace falta saber qué falla y cuánto gasta. Una biblioteca de informes daría más detalle, a cambio de otro destinatario de datos que declarar. Fichas: `kit/catalogo-m/observabilidad-sin-datos-personales.md` y `kit/catalogo-m/bateria-rendimiento-tamano.md`.

## Decisión
Se usan las métricas que ya reúne la tienda y el motivo de salida del proceso que ofrece el sistema, guardado en el equipo como diagnóstico que la persona puede revisar y enviar. Una persona mira las métricas con la cadencia escrita. No se añade ninguna biblioteca.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Biblioteca de informes desde el primer día | Aún no hay una pregunta que las métricas no contesten | Declaración, conservación y un tercero más |
| Registro propio enviado al servidor | Fácil de llenar con datos personales | Un almacén que proteger y borrar |
| No mirar nada | Los problemas se descubren por las desinstalaciones | Perder usuarios sin saber por qué |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Biblioteca de informes de fallos | Un fallo repetido que las métricas y el diagnóstico no permiten localizar |

## Consecuencias
Los datos llegan solo de quienes aceptaron compartirlos e instalaron desde la tienda en equipos certificados, y se muestran cuando hay suficientes: con pocas personas puede no verse nada. Hay que conservar lo necesario para leer los fallos de la versión optimizada.

## Señal para revisar
Fallos que se repiten sin causa conocida tras una entrega.
