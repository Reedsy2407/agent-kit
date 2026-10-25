# Dinero, precios y redondeo

## Problema
Los importes atraviesan varias partes del sistema y se calculan con reglas (precio base, descuentos, topes, impuestos). Si cada parte representa y redondea el dinero a su modo, surgen diferencias de centavos, escrituras que no cambian nada pero suben la versión, y validaciones que fallan por una fracción.

## Señales de que aplica
- Hay importes persistidos que se recalculan o se comparan entre componentes.
- Existen descuentos de varias fuentes o reglas que se encadenan.
- Se aceptan tolerancias «de medio centavo» para que las cuentas cuadren.
- Un total pasó por un número de coma flotante en algún punto.

## Señales de que sobra
- El sistema solo muestra importes que otro sistema calcula y no los recalcula ni los compara.
- Un único importe sin descuentos ni conversión de moneda.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: decimales del lenguaje y redondeo por defecto | Ninguno; sorpresas de redondeo | Solo mostrar importes |
| **Un tipo de dinero compartido** (importe en la unidad menor entera, o decimal con escala) con moneda y modo de redondeo propios | Bajo | Siempre que se calcule |
| Redondear en el punto donde se calcula, a la escala que se persiste | Bajo | Siempre |
| Encadenar descuentos sobre el precio efectivo que dejó el anterior (no sumarlos) | Bajo | Descuentos porcentuales sucesivos |
| Instantánea con revisión: el cálculo guarda con qué versión de precio se hizo, y no se escribe si nada cambió | Medio | Alta contención sobre el mismo documento |
| Tolerancias explícitas y documentadas | Bajo | Cuando el redondeo de otro sistema no se controla |

## Cómo se comprueba
- Pruebas unitarias de cada regla de cálculo: orden de aplicación, encadenado, topes, tope por acumulables.
- Pruebas de redondeo con casos frontera (mitad exacta, escalas distintas) y de que el total es la suma de partes ya redondeadas.
- Una prueba de que ningún camino convierte dinero a coma flotante binaria.
- Una prueba de recálculo estable: recalcular sin cambios no escribe y no cambia nada.
- Pruebas de las tolerancias: lo que cae dentro pasa, lo que cae fuera falla.

## Cómo suele resolverse
Una solución habitual fija un único orden para resolver el importe, aplica los ajustes en cadena sobre el valor que dejó el anterior, redondea en el punto de cálculo a la escala que se guarda y obtiene los totales sumando valores ya redondeados. El resultado final se copia, no se recalcula; las tolerancias son pocas, escritas y acotadas, y una sincronización que no cambia nada no escribe.

## Anti-patrones frecuentes
- Varios tipos de dinero y varios modos de redondeo en el mismo sistema (decimal crudo en uno, entero en otro). Corrección: un tipo compartido con escala y redondeo propios.
- Un total que se calcula en algún paso con coma flotante binaria.
- Calcular un componente del importe dos veces o pisar el neto con el bruto.
- Recalcular y escribir aunque nada haya cambiado.
- Reaplicar descuentos sobre un valor ya descontado.
- Suponer que los impuestos están incluidos sin dejarlo escrito.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** `BigDecimal` con escala y `RoundingMode` explícitos (`setScale`, `divide` con modo); nunca `double`. Verificado el 2026-10-23 ([Java SE 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/math/RoundingMode.html)): `RoundingMode` como enumeración de políticas de redondeo (con `UNNECESSARY` que lanza si hay pérdida). No verificado: biblioteca de dinero concreta (la API estándar de moneda de JSR 354 no forma parte del JDK; no se contrastó).
- **.NET:** `decimal` con `Math.Round` y `MidpointRounding` explícitos. Verificado el 2026-10-23 ([.NET](https://learn.microsoft.com/en-us/dotnet/api/system.math.round)): que `Math.Round` tiene sobrecargas con `decimal`, número de decimales y `MidpointRounding`. No verificado: tipo compartido según el proyecto.
- **Node:** números enteros en la unidad menor o una biblioteca decimal (no `Number` con fracciones). No verificado: biblioteca preferida.
- **Python:** `decimal.Decimal` con contexto de redondeo explícito (por defecto `ROUND_HALF_EVEN`; `quantize(..., rounding=...)`; con `traps[Inexact]` se detecta la pérdida de dígitos); nunca `float`; ojo: `round(x)` sin decimales ignora el contexto. Verificado el 2026-10-23 ([Python](https://docs.python.org/3/library/decimal.html)): la aritmética decimal exacta, el modo por defecto, `quantize` y la salvedad de `round`.

## ADR de ejemplo
- Ninguno todavía.
