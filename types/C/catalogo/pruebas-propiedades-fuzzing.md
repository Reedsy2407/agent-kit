# Pruebas de propiedades y fuzzing para analizadores

## Problema
Un analizador (de un formato, de un protocolo, de una configuración) recibe entradas que nadie escribió a propósito. Las pruebas con ejemplos escogidos a mano cubren los casos que se le ocurrieron a quien las escribió, y los fallos viven justo en los demás: entradas vacías, truncadas, enormes, con campos repetidos, con codificación inválida. Las pruebas de propiedades y el fuzzing buscan esos casos de forma automática, comprobando reglas que deben cumplirse para toda entrada y no resultados para entradas concretas.

## Señales de que aplica
- Hay código que interpreta bytes o texto de fuera (archivos, mensajes de red, argumentos complejos).
- Existe una pareja natural de operaciones inversas (codificar y decodificar, serializar y leer).
- El analizador corre con privilegios o se alcanza desde una red.
- Un fallo del analizador tendría un costo alto (pánico, cuelgue, memoria agotada).

## Señales de que sobra
- El «analizador» es una conversión trivial de una biblioteca estándar ya muy probada.
- La entrada procede únicamente de código propio y ya tipado.
- El formato es tan pequeño que unos pocos ejemplos lo cubren de verdad y no se espera que crezca.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: pruebas con ejemplos escogidos | Ninguno; huecos en lo que nadie imaginó | Formatos triviales |
| Una tabla de casos límite escritos a propósito (vacío, un byte, el máximo, uno más, codificación inválida) | Bajo | Siempre, como base |
| Pruebas de propiedades con entradas generadas y una semilla fija reproducible | Medio: formular las propiedades | Analizadores con operaciones inversas |
| Fuzzing guiado por cobertura con un corpus de partida | Medio-alto: tiempo de ejecución y triaje | Analizadores expuestos a entrada no confiable |
| Fuzzing continuo en integración | Alto | Proyectos de larga vida con analizadores críticos |

## Cómo se comprueba
- Propiedad de ida y vuelta: leer lo que se escribió devuelve lo original, para entradas generadas.
- Propiedad de no fallar: para cualquier entrada, el analizador devuelve un resultado o un error, nunca un pánico, un cuelgue ni un consumo desproporcionado de memoria o de tiempo.
- Propiedad de idempotencia o normalización cuando el formato las promete.
- Cada fallo encontrado se guarda como caso de regresión que corre en las pruebas normales.
- El corpus de partida incluye entradas válidas reales y los casos límite de la tabla.
- Los generadores son reproducibles: una ejecución fallida se puede repetir con la misma semilla.

## Cómo suele resolverse
Primero se escribe la tabla de casos límite, que ya atrapa lo más frecuente. Después se formulan dos o tres propiedades (ida y vuelta, no fallar, límites respetados) y se ejecutan con entradas generadas con una semilla fija. Para analizadores expuestos, se añade fuzzing con un corpus pequeño de entradas válidas; cada entrada que rompe algo se minimiza y se guarda junto a las pruebas. El objetivo del fuzzing es la robustez, no la corrección: comprueba que no falla de formas graves, no que da el resultado correcto. Se ejecuta en sesiones acotadas, no en cada cambio.

## Anti-patrones frecuentes
- Fuzzing sin límites de memoria y de tiempo por entrada, que acaba colgando la máquina.
- Propiedades tan débiles que siempre se cumplen.
- Generadores que solo producen entradas válidas.
- No guardar los fallos encontrados como pruebas de regresión.
- Depender de estado global o de aleatoriedad no reproducible dentro de la función bajo prueba.
- Tratar un fuzzer como sustituto de las pruebas con ejemplos en lugar de complemento.
- Ejecutarlo con credenciales reales o sobre archivos reales del usuario.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** fuzzing integrado en `go test`. Verificado el 2026-10-30 ([guía de fuzzing](https://go.dev/doc/security/fuzz/)): una prueba de fuzzing es una función `FuzzXxx` con un `*testing.F` en un archivo de pruebas, con un único objetivo llamado con `Fuzz` y valores de partida añadidos con `Add`; `go test` ejecuta cada valor de partida como una prueba normal y `go test -fuzz` activa el fuzzing; un fallo se minimiza y se guarda bajo `testdata/fuzz`, y `go test` lo ejecuta después como regresión; la guía lista los tipos de argumentos admitidos, dice que la instrumentación de cobertura está disponible hoy en dos arquitecturas y que cada ejecución del objetivo tiene un plazo corto. Los esqueletos del kit no traen pruebas de fuzzing ni de propiedades: sus pruebas de entrada son una tabla de casos límite.
- **Python:** la biblioteca estándar no trae pruebas de propiedades ni fuzzing; `unittest` permite la tabla de casos límite con `subTest`. No verificado: las bibliotecas de terceros para propiedades y fuzzing guiado por cobertura, su disponibilidad por versión y plataforma, y cómo fijar su semilla.
- **Rust:** `cargo test` ejecuta las pruebas unitarias y de integración; la biblioteca estándar no trae pruebas de propiedades ni fuzzing. No verificado: las herramientas de terceros para propiedades y para fuzzing guiado por cobertura, y si exigen una cadena de herramientas concreta.

## ADR de ejemplo
- Ninguno todavía.
