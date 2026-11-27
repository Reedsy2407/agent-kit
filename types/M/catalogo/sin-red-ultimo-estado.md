# Sin red y sincronización: último estado conocido, con caducidad

## Problema
La red falta, va y viene o responde tarde, y la app tiene que decidir qué enseñar y qué permitir. Si enseña lo último como si fuera de ahora, engaña; si no enseña nada, no sirve; y si decide la antigüedad con el reloj del equipo, basta con cambiarlo. Aparece con cualquier dato que viene de un servidor.

## Señales de que aplica
- La app se usa en movimiento, en interiores o con datos escasos.
- La persona escribe cosas que tienen que llegar al servidor.
- Hay algo que solo vale durante un tiempo: un acceso, un precio, un estado.

## Señales de que sobra
- La app no tiene sentido sin conexión y basta con decirlo claro y reintentar.
- Nada se guarda ni se escribe: cada pantalla es una consulta.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: mensaje de sin conexión y botón de reintentar | Bajo | La función exige red y se usa poco |
| Leer sin red lo último recibido, marcado con su momento | Medio: almacenamiento local y estados de antigüedad | Consultar sin red ya sirve |
| Además, escribir en una cola que se envía luego | Medio-alto: reintentos, duplicados y conflictos | La persona registra cosas sin cobertura |
| Sincronización en los dos sentidos con resolución de conflictos | Alto | Varios equipos editan lo mismo sin conexión |

## Cómo se comprueba
- Cada pantalla clave probada sin red, con red lenta y con un fallo del servidor: dice qué es antiguo y qué se puede hacer.
- Una prueba de cola: sin red se encola, al volver se envía una sola vez, y reintentar no duplica.
- Una prueba con el reloj del equipo adelantado y atrasado: la caducidad no se alarga.
- Una prueba tras reiniciar el equipo sin red: la app no gana tiempo ni acceso.
- Una prueba de conflicto con la decisión escrita de quién gana.

## Cómo suele resolverse
La app lee de su almacenamiento local, y lo que llega de la red se escribe primero ahí. Cada dato guarda el momento que dijo el servidor y la pantalla muestra su antigüedad. Mientras el equipo sigue encendido, el paso del tiempo se mide con un reloj monótono; tras un reinicio sin red se trata la antigüedad como desconocida y se cae del lado prudente para lo que concede algo. Las escrituras llevan un identificador creado en el equipo para que repetirlas sea inocuo, y el servidor decide.

## Anti-patrones frecuentes
- Mostrar un dato viejo sin decir que lo es.
- Calcular la caducidad con la hora del equipo.
- Reintentar sin espera creciente y sin identificador.
- Vaciar la pantalla cuando falla una actualización.
- Guardar dos copias de un dato que se editan por separado.
- Construir resolución de conflictos antes de que exista un conflicto.

## Hechos en que se apoya
- [P-ARQ-3]: qué significa «sin conexión primero».
- [P-ARQ-8]: una referencia pública que lee siempre del almacenamiento local.
- [P-RED-1]: el reloj de pared puede saltar; el monótono mide intervalos desde el arranque.
- [P-TRA-2]: trabajo programado con condiciones de red y reintentos.
- [P-ARQ-1]: una fuente de verdad por dato.
- [P-PRI-6]: lo guardado puede salir del equipo.

## Requisitos de referencia
R4 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
- [El acceso lo decide el servidor](../ejemplos-adr-m/acceso-decidido-en-el-servidor.md)
