# ADR de ejemplo. Complementos como procesos aparte, sin cargar código en el proceso

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Una herramienta de transformación de archivos quiere que otros equipos añadan formatos propios. Los autores de esos formatos no son quien mantiene la herramienta ni están sujetos a su revisión, y la herramienta corre con acceso a datos que los complementos no necesitan. Ficha: `kit/catalogo-c/extensibilidad.md`.

## Decisión
Un complemento es un ejecutable aparte que lee una petición por su entrada estándar y escribe una respuesta por la salida estándar, con mensajes de un formato pequeño y versionado y un tamaño máximo. La herramienta lo lanza con una lista de argumentos, un entorno mínimo y un directorio propio, le impone un plazo y trata cada respuesta como entrada no confiable. Solo se descubren complementos en ubicaciones declaradas en la configuración. La interfaz ofrece solo transformar un contenido recibido y devolver el resultado.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Módulos compilados cargados en el proceso | Comparten memoria y privilegios con la herramienta y exigen compilarlos con la misma cadena de herramientas | Fallos y riesgos acoplados; compatibilidad frágil |
| Intérprete de scripts embebido | Una interfaz recortada que mantener y un intérprete cuyas actualizaciones seguir | Superficie y mantenimiento sin necesidad aún |
| Solo reglas declarativas | No cubre formatos con lógica propia | Los equipos copiarían el código de la herramienta |
| No ofrecer extensión | Cada formato nuevo exige publicar una versión | Cuello de botella en el mantenedor |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Intérprete de scripts embebido | Lógica pequeña y frecuente donde lanzar un proceso es demasiado lento |
| Confinamiento fuerte de los complementos | Complementos de autores desconocidos |
| Registro de complementos | Más de un puñado de complementos en uso |

## Consecuencias
Un complemento roto o lento no tumba la herramienta, que lo informa y sigue sin él. Se comprueba con pruebas de un complemento que falla, se cuelga y responde basura, y con una prueba de que la interfaz no expone más que transformar contenido.

## Señal para revisar
Complementos de autores desconocidos (confinamiento más fuerte) o un coste de arranque por proceso que haga lenta la herramienta.
