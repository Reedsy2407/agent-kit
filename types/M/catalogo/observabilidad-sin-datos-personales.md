# Observabilidad sin datos personales: fallos y métricas

## Problema
La app falla en equipos que nunca verás y, sin información, cada fallo es una adivinanza. La salida fácil es mandarlo todo, y entonces los registros se llenan de nombres, posiciones y testigos de sesión. Aparece en cuanto hay una persona usándola fuera de tu mesa.

## Señales de que aplica
- Hay usuarios reales y nadie puede describir qué falló.
- La función central depende de algo que puede cortarse en silencio.
- Ya hay registros o una biblioteca de analítica y nadie sabe qué envían.

## Señales de que sobra
- Pocas personas, a las que se puede preguntar y ver su equipo.
- La app no tiene estados que fallen en silencio y las métricas de la tienda bastan.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: preguntar a quien usa la app | Ninguno; se pierde lo que nadie cuenta | Grupo muy pequeño y cercano |
| Las métricas que ya reúne la tienda | Bajo: mirarlas con una cadencia; con pocas personas pueden no mostrar nada | Publicada en la tienda |
| Un diagnóstico local que la persona revisa y envía si quiere | Bajo-medio | Problemas de segundo plano que la tienda no explica |
| Una biblioteca de informes de fallos o de analítica | Medio: declaración de datos, conservación, borrado y un tercero más | Las anteriores no bastan y está escrito qué falta |

## Cómo se comprueba
- Una prueba que falla si un registro o un informe lleva coordenadas, datos personales o testigos.
- Un fallo provocado en la variante de publicación se puede leer por la vía que se controla (diagnóstico propio o biblioteca), con los nombres de código recuperables; las métricas de la tienda no sirven para esta prueba fuera de ella ni con pocos datos.
- Revisión de lo que sale del equipo, comparado con la política y con el formulario de la tienda.
- Una prueba de que, al volver a abrir tras morir el proceso, la app sabe el motivo cuando el sistema lo ofrece.
- Una persona asignada a mirar las métricas y un umbral que obliga a actuar.

## Cómo suele resolverse
Se decide primero qué preguntas hay que poder contestar. Se usa lo que ya reúne la tienda y lo que dice el sistema sobre la muerte del proceso. Los registros de la app guardan códigos y hechos, no valores de personas, y los niveles ruidosos se quitan de la variante publicada con la optimización. Si se añade una biblioteca, se lee antes qué envía, se declara y se puede desactivar.

## Anti-patrones frecuentes
- Registrar la petición o la respuesta enteras.
- Adjuntar el identificador de la persona a cada informe sin necesidad.
- Añadir una biblioteca de analítica «para el futuro».
- Publicar sin guardar los archivos que permiten leer los fallos de la versión optimizada.
- Medir muchas cosas que nadie mira.

## Hechos en que se apoya
- [P-OBS-1]: qué no registrar y cómo quitar registros.
- [P-OBS-2]: motivos de muerte del proceso.
- [P-OBS-3]: de quién reúne datos la tienda, a quién no cuenta y cuándo los muestra.
- [P-REN-1]: métricas principales y sus consecuencias.
- [P-REN-3]: la optimización de la variante publicada.
- [P-PRI-3], [P-PRI-4]: avisos y formulario de datos, bibliotecas incluidas.
- [P-RT-10]: ejemplo de lo que una biblioteca declara que envía.

## Requisitos de referencia
R6 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
- [Las métricas de la tienda antes que una biblioteca de fallos](../ejemplos-adr-m/metricas-de-la-tienda-primero.md)
