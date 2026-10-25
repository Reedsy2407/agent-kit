# ADR de ejemplo. Una cifra que no se puede verificar se declara y se etiqueta como declarada

Ejemplo breve y abstracto, tomado del caso público esg-trazabilidad. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Un documento que se entrega a un tercero necesita una cifra por empresa que solo existe detrás de la cuenta de cada empresa en una plataforma estatal. No hay una interfaz pública para terceros, y una integración real exigiría un convenio. La viabilidad resultó **REDISEÑO**: el producto sigue teniendo valor si la cifra la declara el operador y se dice claramente. Ficha: `kit/catalogo/declarado-vs-verificado.md`.

## Decisión
- La cifra la declara quien opera y el personal la registra a mano, con el período que cubre y su autor.
- Es obligatoria para emitir el documento; si ningún registro cubre el período, la emisión se rechaza y la consola lo detecta antes.
- Pantallas, documento y exportaciones la rotulan siempre «declarado» y aclaran que no es una cifra oficial ni está verificada.
- Puede llevar una referencia escrita al comprobante (solo texto, nadie la contrasta); se muestra como «referenciado, no verificado».
- Los registros de un mismo sujeto no pueden superponerse.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Presentarla como cifra oficial (la más simple) | Falsa; el documento daría fe de algo no comprobado | Riesgo reputacional y legal |
| Dejar la cifra fuera del documento | Se pierde el valor central del producto | Producto sin sentido |
| Esperar a un convenio | Bloquea todo por un tercero | Meses sin producto |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Subida y validación de comprobantes | Que el cliente exija evidencia comprobable |
| Integración con la plataforma | Un convenio firmado |

## Consecuencias
El producto es honesto y funciona; el cliente sabe qué le entregan. Se comprueba con pruebas de que cada salida lleva la etiqueta y de que la emisión se rechaza sin cobertura.

## Señal para revisar
Aparece una interfaz pública para terceros, o el cliente deja de aceptar datos declarados.
