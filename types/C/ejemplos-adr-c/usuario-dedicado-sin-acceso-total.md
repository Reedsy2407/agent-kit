# ADR de ejemplo. Usuario dedicado y sin acceso al canal de control del runtime de contenedores

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Una herramienta de operación quiere arrancar y detener contenedores. La vía más corta es dar a su cuenta acceso al canal de control del runtime de contenedores, lo que equivale a control total del equipo: quien tomara el proceso podría hacer cualquier cosa en la máquina. La viabilidad (puerta de uso responsable y eje de privilegios) la dejó en rediseño por ese motivo. Ficha: `kit/catalogo-c/privilegios-minimos.md`.

## Decisión
La herramienta corre con una cuenta de servicio dedicada, sin inicio de sesión y sin acceso al canal de control. Las operaciones de arrancar y detener las ejecuta un componente aparte, una instalación del runtime en su modo sin privilegios del que la herramienta es solo cliente; para consultar el estado se usa un intermediario que solo permite lecturas. El instalador no añade al usuario a ningún grupo con poder equivalente a administrador y trae su desinstalación. El radio de daño queda escrito en una frase en la evaluación de viabilidad.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Dar acceso total al canal de control a la cuenta de la herramienta | Cualquier fallo de la herramienta compromete el equipo entero | Radio de daño total |
| Pedir administrador al instalar y dejar la herramienta elevada | Elevación permanente para un paso puntual | Superficie permanente sin necesidad |
| Un proceso grande con privilegios que además analiza entrada externa | Mezcla lo que necesita permisos con lo que recibe datos hostiles | Un fallo del analizador es un fallo con privilegios |
| No ofrecer la operación | Pierde el valor del producto | Producto sin función principal |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Proceso privilegiado pequeño aparte | Una operación que el modo sin privilegios no permita |
| Alcances por orden en el intermediario | Clientes con permisos distintos |

## Consecuencias
Un compromiso de la herramienta no da control del equipo. El runtime en modo sin privilegios limita lo que se puede hacer (por ejemplo, puertos reservados); eso se documenta. Se comprueba con una prueba que arranca la herramienta con el usuario sin privilegios y una revisión del instalador.

## Señal para revisar
Una operación imprescindible que el modo sin privilegios no soporte, o un cliente que necesite permisos más finos que los del intermediario.
