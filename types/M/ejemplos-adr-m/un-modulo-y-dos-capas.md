# ADR de ejemplo. Un módulo y dos capas

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Una app pequeña, de una o dos personas, con unas pocas pantallas y datos que vienen de un servidor y se leen sin red. Hay apps de referencia con muchos módulos. Ficha: `kit/catalogo-m/arquitectura-app.md`.

## Decisión
Un solo módulo con interfaz y datos separados. Los datos son la fuente de verdad y se observan; cada pantalla recibe un estado inmutable y devuelve eventos. Sin capa de dominio mientras ninguna regla se repita. Las pruebas usan dobles falsos de la capa de datos.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Copiar la estructura modular de una app de referencia | Resuelve problemas de tamaño que no hay | Compilación y fronteras que mantener |
| Toda la lógica en las pantallas | Las reglas no se pueden probar solas | Cambios que rompen sin aviso |
| Capa de dominio desde el principio | Clases que solo reenvían | Más código que leer |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Capa de dominio | La misma regla en varias pantallas |
| Varios módulos | La compilación estorba o entra más gente |

## Consecuencias
Poco que aprender y pruebas locales desde el primer día. Si crece, separar módulos exigirá ordenar dependencias.

## Señal para revisar
Archivos que todos tocan a la vez, o compilaciones que frenan el trabajo.
