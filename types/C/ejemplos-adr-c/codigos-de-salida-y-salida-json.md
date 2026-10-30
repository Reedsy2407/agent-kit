# ADR de ejemplo. Pocos códigos de salida documentados y salida opcional para máquinas

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Una herramienta con tres subcomandos se invoca ya desde guiones y desde integración continua. Quienes la usan deciden por el código de salida y alguien analiza su texto. Cambiar los mensajes rompió una vez un guion. Ficha: `kit/catalogo-c/contrato-cli.md`.

## Decisión
Se fija una tabla corta de códigos: éxito, error inesperado, uso incorrecto, configuración inválida y entrada rechazada. Los resultados van a la salida normal y todo diagnóstico a la de error. Una opción única, válida en todos los subcomandos, cambia la salida normal a un solo objeto en una línea. El texto legible puede cambiar entre versiones; el formato para máquinas es el contrato y no cambia de campos sin aviso. Una tabla de casos ejecutada contra el binario real es la fuente de verdad.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Texto libre y éxito o fallo | Cualquier mejora del mensaje rompe a quien lo analiza | Guiones frágiles |
| Un código distinto por cada error posible | Nadie mantiene la tabla y los guiones acaban comparando contra números sueltos | Contrato imposible de documentar |
| Solo formato para máquinas | Peor uso a mano, sin ganar nada para los guiones | Quejas de uso |
| Un formato para máquinas distinto por subcomando | Cada guion necesita su propio analizador | Más superficie que mantener |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Versionado explícito del formato para máquinas | Un consumidor que no controlamos y un cambio incompatible previsto |
| Más de un formato para máquinas | Un consumidor que no puede leer el elegido |

## Consecuencias
Los guiones dependen de pocas cosas estables. Se comprueba con la tabla de casos: argumentos, código, salida normal y salida de error esperados.

## Señal para revisar
Una clase nueva de error que los guiones necesiten distinguir, o un consumidor que exija otro formato.
