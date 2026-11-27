# ADR de ejemplo. Un ámbito único de avisos

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Muchas personas reciben avisos sobre hechos cercanos a ellas. Repartirlos por grupos de zona ahorra datos, pero con las credenciales de la mensajería y el identificador de registro de un equipo se listan sus grupos. Qué ve o conserva el proveedor no está comprobado, y se asume el peor caso. Fichas: `kit/catalogo-m/tiempo-real-mensajeria-push.md` y `kit/catalogo-m/ubicacion-privacidad.md`.

## Decisión
Todos los equipos reciben el mismo ámbito amplio. El mensaje solo dice que hay algo; la app pide las novedades de ese ámbito y filtra en el equipo por dónde está la persona. El servidor propio no recibe la posición ni identificadores de registro de la mensajería.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Un grupo por zona | La suscripción delata la zona | Prometer privacidad que no se cumple |
| Enviar la posición al servidor para elegir destinatarios | El servidor sabría dónde está cada persona | Un registro de movimientos que proteger y declarar |
| El detalle dentro del mensaje | Cualquiera puede suscribirse al grupo | Contenido reservado visible a cualquiera |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Ámbitos más pequeños | El volumen del ámbito único supera el presupuesto de datos medido, y se declara el tamaño mínimo |

## Consecuencias
Más datos de bajada y filtrado en el cliente. La latencia se mide en equipos reales antes de prometerla.

## Señal para revisar
Datos o batería por encima del presupuesto, o un cupo de la mensajería que se agota.
