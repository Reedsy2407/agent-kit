# Actualizaciones y compatibilidad con el servidor

## Problema
Un servidor se cambia de una vez; las apps instaladas, no. Conviven versiones que hablan contratos distintos, y alguna no se actualizará nunca. Un cambio inocente en el servidor rompe a quien no actualizó, y una corrección urgente en la app tarda en llegar. Aparece desde la segunda versión publicada.

## Señales de que aplica
- Hay un servidor propio y la app ya está en manos de alguien.
- Un cambio de campo, de regla o de ruta afectaría a una versión instalada.
- Existe algo que, si falla en una versión vieja, causa daño: dinero, acceso, datos.

## Señales de que sobra
- Sin servidor propio ni datos compartidos entre versiones.
- Todas las personas usuarias se actualizan a mano y al momento, porque son pocas y cercanas.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: cambiar servidor y app a la vez | Ninguno; las versiones viejas se rompen | Antes de que alguien dependa de la app |
| Contrato que solo añade: campos nuevos opcionales y desconocidos ignorados | Bajo | Siempre, desde la primera versión |
| La app envía su número de versión y el servidor puede exigir una mínima, con pantalla de actualizar | Bajo-medio: prevista antes de la primera entrega | Habrá algún cambio que no se pueda hacer compatible |
| Avisar o forzar la actualización con la función de la tienda | Medio: una biblioteca de la tienda; qué hace en instalaciones de fuera de ella no está comprobado | Se quiere que la gente actualice antes |
| Varias versiones del contrato en paralelo | Alto | Hay clientes que no pueden actualizar y deben seguir |

## Cómo se comprueba
- Una prueba del servidor con las peticiones de la versión publicada más antigua que aún se admite.
- Una prueba de la app ante un campo nuevo, un valor desconocido y un campo ausente.
- Una prueba de versión mínima: la app antigua muestra la pantalla de actualizar, sin perder lo no enviado.
- Comprobación de que el número de versión crece en cada entrega.
- Una lista de versiones vivas antes de retirar algo del servidor.

## Cómo suele resolverse
La primera versión publicada ya sabe tres cosas: decir quién es, tolerar lo que no entiende y obedecer un «tienes que actualizar». El servidor solo añade; quitar o cambiar de significado espera a que ninguna versión admitida lo use. La versión mínima la decide y la hace cumplir el servidor, y la función de actualización de la tienda es una comodidad encima, no la garantía. Lo que se decide en el servidor (acceso, sanciones, precios) vale también para quien no actualiza.

## Anti-patrones frecuentes
- Añadir el mecanismo de versión mínima cuando ya hace falta: la versión rota no lo tiene.
- Hacer cumplir una regla solo en la app nueva.
- Reutilizar un campo con otro significado.
- Fallar ante un valor desconocido en una lista de estados.
- Suponer que todo el mundo actualiza en poco tiempo.
- Bloquear una versión sin dar camino para actualizar o salvar lo pendiente.

## Hechos en que se apoya
- [P-ACT-1]: número de versión creciente; el sistema no impone la compatibilidad.
- [P-ACT-2]: actualizaciones dentro de la app.
- [P-PUB-6]: la tienda exige un destino mínimo también a las actualizaciones.
- [P-PUB-3]: una revisión puede retrasar una corrección.
- No verificado [P-ACT-3]: instalaciones fuera de la tienda y cuánto tarda la mayoría en actualizar.

## Requisitos de referencia
R3 y R4 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
- [La versión mínima la hace cumplir el servidor](../ejemplos-adr-m/version-minima-en-el-servidor.md)
