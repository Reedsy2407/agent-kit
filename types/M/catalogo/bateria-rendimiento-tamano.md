# Batería, rendimiento y tamaño

## Problema
La app funciona en el equipo de quien la construye y en otros va lenta, se bloquea, gasta batería o no cabe. Quien la usa la desinstala sin explicar por qué y la tienda puede mostrarla menos. Aparece con seguimiento continuo, listas largas, mapas, muchas bibliotecas o equipos modestos.

## Señales de que aplica
- Hay trabajo continuo: ubicación, conexión abierta, temporizadores o dibujo constante.
- Los usuarios tienen equipos de gama baja, poco espacio o datos móviles escasos.
- La tienda ya muestra fallos o bloqueos, o la persona espera a que arranque.

## Señales de que sobra
- App de uso puntual, sin trabajo en segundo plano y sin quejas: basta con no empeorar.
- Aún no hay una versión usable que medir: se optimiza sobre medidas, no sobre sospechas.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: confiar en los valores por defecto y mirar las métricas de la tienda | Ninguno; los problemas se ven tarde | Antes de tener usuarios |
| Activar la optimización de la variante de publicación y probarla | Bajo-medio: revisar reglas y volver a probar | Antes de publicar |
| Presupuestos propios (arranque, memoria, tamaño, batería por periodo de uso) medidos en un equipo modesto | Medio | La función central es continua o los equipos son limitados |
| Perfiles de referencia y medición automatizada del rendimiento | Medio-alto | Hay recorridos lentos medidos que importan |

## Cómo se comprueba
- Un presupuesto escrito antes de medir, con el equipo modesto que se usa de referencia.
- Una sesión real de la función central, de la duración de un uso típico, anotando batería, datos y memoria.
- Una medida de arranque en frío de la variante de publicación, no de la de depuración.
- El tamaño de descarga del paquete, comparado con el de la entrega anterior, en cada entrega.
- Revisión de las métricas de la tienda tras publicar, con quién las mira y cada cuánto.

## Cómo suele resolverse
Primero se quita trabajo: menos frecuencia de ubicación, nada de consultas periódicas cuando sirve un aviso, ningún bloqueo de activación sin liberar y nada pesado en el hilo de la interfaz. Después se activa la optimización de la variante de publicación y se prueba esa variante, no la de depuración. Las bibliotecas se añaden de una en una, sabiendo cuánto pesan. Solo cuando una medida propia señala un recorrido lento se invierte en optimizarlo.

## Anti-patrones frecuentes
- Medir en la variante de depuración y en el equipo más potente.
- Pedir ubicación continua de alta precisión cuando basta una cada cierto tiempo.
- Optimizar antes de medir.
- Activar la reducción de código justo antes de publicar y sin probarla.
- Dar la cifra de una página de documentación como si fuera la de la propia app.

## Hechos en que se apoya
- [P-REN-1]: métricas principales de la tienda, sus umbrales y lo que arriesga superarlos.
- [P-REN-2]: cuándo el sistema declara un bloqueo.
- [P-REN-3]: activar la optimización en la variante de publicación.
- [P-REN-4]: perfiles de referencia para recorridos concretos.
- [P-REN-5]: límites y aviso por tamaño de descarga.
- [P-UBI-4], [P-FGS-12]: el sistema limita la ubicación en segundo plano y, con el equipo en reposo, la red.
- [P-OBS-3]: de dónde salen las métricas de la tienda.
- No verificado [P-REN-6]: el gasto de batería y de datos en un uso real largo.

## Requisitos de referencia
R1 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
- [Las métricas de la tienda antes que una biblioteca de fallos](../ejemplos-adr-m/metricas-de-la-tienda-primero.md)
