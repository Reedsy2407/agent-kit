# ADR de ejemplo. Sumas de verificación publicadas por un canal distinto al de los artefactos

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Una herramienta se distribuye como binarios por plataforma a equipos que no la construyen. Quienes la instalan quieren saber que lo que descargaron es lo que se publicó. No hay infraestructura de firmas todavía y la gestión de claves no está resuelta. Ficha: `kit/catalogo-c/empaquetado-releases-multiplataforma.md`.

## Decisión
Un flujo disparado por la etiqueta de versión ejecuta las pruebas, compila para cada plataforma declarada, empaqueta y genera un archivo de sumas con una suma por artefacto. Los artefactos se publican en el canal de descargas; el archivo de sumas se publica además en un segundo canal distinto, controlado por otra cuenta o por otro medio. Las instrucciones de instalación explican cómo comprobar la suma. No se promete firma: queda escrito como paso manual futuro. El binario informa su versión, tomada de la etiqueta.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Binarios sin sumas | Nadie puede comprobar la integridad | Confianza ciega |
| Sumas en el mismo canal que los binarios | Quien comprometa ese canal cambia ambos | Una protección aparente |
| Firma de artefactos desde el primer día | Exige claves y su custodia, que aún no están resueltas | Claves dentro del flujo o una firma que no significa nada |
| Instaladores nativos | Un proceso por plataforma que mantener | Mantenimiento sin demanda real |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Firma de los artefactos | Distribución amplia o usuarios que la exigen, y claves con custodia resuelta |
| Instaladores nativos o paquetes de un gestor | Usuarios que esperan esa forma de instalar |
| Compilaciones reproducibles verificadas | Un tercero que debe poder reconstruir el binario |

## Consecuencias
Quien instala puede verificar la integridad frente a un canal comprometido, siempre que lea la suma del segundo canal. Se comprueba con una prueba de las sumas y con una prueba en cada plataforma declarada de que el comando de versión responde.

## Señal para revisar
Una petición de firma de artefactos, o un canal de sumas que deje de ser independiente del de descargas.
