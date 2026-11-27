# Tiempo real y mensajería push: lo que prometen y lo que no

## Problema
La persona quiere enterarse pronto de algo que ocurre en otro sitio, con la app abierta o cerrada. Un mensaje push puede llegar tarde o no llegar; los grupos de suscripción no son privados ni controlan el acceso; y la red se cae a mitad. Aparece con avisos, estados compartidos o cualquier novedad que caduca.

## Señales de que aplica
- Una novedad pierde valor si se ve mucho después.
- La app debe avisar cuando no está abierta.
- Muchas personas reciben lo mismo, o cada una algo distinto.

## Señales de que sobra
- Basta con actualizar al abrir la pantalla o con un gesto de refrescar.
- Nadie actúa de forma distinta por saberlo antes.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: pedir los datos al abrir o al refrescar | Ninguno; no hay avisos | La novedad aguanta hasta la próxima visita |
| Consulta periódica o conexión abierta solo con la app visible | Bajo-medio: reconexión | Importa mientras se mira |
| Mensajes push como aviso, y el dato se pide al servidor | Medio: registro, caducidad, duplicados | Hay que avisar con la app cerrada |
| Grupos de suscripción amplios | Medio: nada de lo enviado es reservado | La misma información pública para muchos |
| Mensajería propia con conexión permanente | Alto: batería, restricciones del sistema y un servicio más | Una latencia medida que la plataforma no cumple |

## Cómo se comprueba
- Latencia medida en un equipo real con la app abierta, en segundo plano y en reposo, antes de prometer nada.
- Una prueba de entrega repetida y desordenada: cada novedad se aplica una vez y la antigua no pisa a la nueva.
- Una prueba de reconexión tras perder la red: se recupera lo perdido sin duplicar.
- Una prueba de caducidad: lo que llega tarde se muestra como antiguo o se descarta.
- Una prueba de cambio de identificador de registro: las suscripciones se rehacen.
- Captura de lo que envía y recibe el servidor, sin posiciones ni datos reservados en el mensaje.

## Cómo suele resolverse
El mensaje push es una señal, no la verdad: dice que hay algo y la app lo pide al servidor, que comprueba quién pregunta. Cada novedad lleva identificador y momento del servidor, de modo que repetir o desordenar no cambie el resultado, y caducidad. Tras una reconexión se pide lo posterior a lo último visto. La prioridad alta se reserva para lo que la persona va a ver. La app se declara útil sin avisos: quien no concede el permiso, o tiene la app hibernada, se entera al abrirla.

## Anti-patrones frecuentes
- Mandar el contenido reservado dentro del mensaje a un grupo al que cualquiera puede suscribirse.
- Usar la baja de un grupo como sanción.
- Marcar todo como prioritario.
- Suponer que enviado significa entregado, o entregado significa visto.
- Prometer un plazo de entrega que nadie midió.
- Repartir por grupos de zona creyendo que así nadie sabe dónde está cada uno.

## Hechos en que se apoya
- [P-RT-1], [P-RT-2], [P-RT-18]: mensajería recomendada, prioridades y su valor por defecto.
- [P-RT-3], [P-RT-4]: grupos de suscripción, cupos y costo.
- [P-RT-7], [P-RT-13]: control desde el servidor y cambio de identificador.
- [P-RT-12]: caducidad y sustitución de mensajes.
- [P-RT-6], [P-FGS-4]: recibir un aviso no basta para arrancar el seguimiento de ubicación desde segundo plano, salvo con el permiso de ubicación en segundo plano; que la persona toque una notificación sí figura entre los casos que lo permiten.
- [P-RT-14], [P-RT-15]: retiradas y configuración nueva anunciadas.
- [P-TRA-4], [P-PER-1]: hibernación y permiso de notificaciones.
- No verificado [P-RT-8]: si el servidor puede impedir una nueva suscripción.
- No verificado [P-RT-11]: qué ve el proveedor de las suscripciones.
- No verificado [P-RT-16]: arranque en segundo plano con la configuración nueva.
- No verificado [P-RT-17]: plazos y garantía de entrega.

## Requisitos de referencia
R2 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
- [Un ámbito único de avisos](../ejemplos-adr-m/ambito-unico-de-avisos.md)
