# ADR de ejemplo. Lenguaje de una herramienta de línea de órdenes: la alternativa simple primero

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Una herramienta de línea de órdenes lee un directorio local y compara sumas de archivos. La viabilidad del tipo C dio GO: privilegios mínimos (lectura del directorio indicado), entrada no confiable limitada a archivos locales, distribución como binario con sumas publicadas aparte, mantenimiento a tres años por una persona. Criterios medidos: el usuario no tiene un intérprete instalado; el tiempo de ejecución sobre un directorio típico en un prototipo es de segundos; la entrada no es de confianza pero el proceso no tiene privilegios.

## Decisión
Go. Un binario por plataforma, sin intérprete en la máquina del usuario, con el ecosistema estándar para archivos y sumas y compilación cruzada probada en cada plataforma declarada.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Go (la más simple para este problema y este equipo) | Es la elegida | Recolector de memoria que no importa a esta escala |
| Python | Exige que el usuario tenga el intérprete o que se empaquete uno; empaquetar por plataforma cuesta más que compilar | Más pasos de instalación y un artefacto más grande |
| Rust | Seguridad de memoria superior, pero el prototipo de Go ya cumple el rendimiento medido, el proceso no tiene privilegios y la curva de aprendizaje de quien mantiene es mayor | Más tiempo de aprendizaje y de mantenimiento sin una necesidad medida |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Actualizador propio | Los usuarios no pueden actualizar con su gestor o a mano |
| Sistema de extensiones | Una segunda persona necesita añadir comportamiento |
| Proceso residente | Hay eventos que no caben en una ejecución bajo demanda |
| Soporte de macOS | Un usuario real y pruebas ejecutándose allí |

## Consecuencias
Menos piezas, instalación de un solo archivo y mantenimiento por una persona. Se comprueba con las pruebas ejecutadas en cada plataforma declarada y con la verificación de las sumas publicadas.

## Señal para revisar
Una medición sobre un directorio real que el prototipo en Go no cumpla; o que la herramienta pase a procesar entrada de la red con privilegios, que haría pesar más la seguridad de memoria.
