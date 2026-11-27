# Contenido de usuarios: denunciar, bloquear y sancionar desde el servidor

## Problema
Unas personas ven lo que escriben o publican otras. Tarde o temprano alguien publica lo que no debe o molesta a otro, y hace falta que se pueda denunciar, bloquear y sancionar, y que alguien lo atienda. Aparece con comentarios, mensajes, reportes compartidos, perfiles o cualquier texto de una persona que llega a otra.

## Señales de que aplica
- Lo que aporta una persona lo ve otra, aunque sea corto o desaparezca pronto.
- Hay interacción entre dos personas dentro de la app.
- Un dato falso o abusivo aportado por alguien puede perjudicar a los demás.

## Señales de que sobra
- Cada persona solo ve lo suyo.
- El contenido lo publica únicamente quien opera la app.
- No hay quien modere: entonces la función no se construye todavía.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: sin contenido entre personas | Ninguno | La función central no lo necesita |
| Aportes acotados (elegir de una lista, sin texto libre) con denuncia y bloqueo | Medio-bajo | Basta con datos estructurados |
| Texto libre con condiciones aceptadas, denuncia, bloqueo, cola de revisión y sanciones en el servidor | Alto: trabajo continuo de moderar | El texto es la función y hay quien responda |
| Filtros automáticos previos | Medio-alto: falsos positivos y reclamos | El volumen supera a quien modera |

## Cómo se comprueba
- Con dos cuentas: lo bloqueado deja de verse y no puede volver a llegar.
- Una sanción decidida en el servidor rechaza las peticiones de la persona sancionada, también desde una versión antigua de la app.
- Una denuncia recorrida de punta a punta hasta quien modera, con el registro de la medida y la respuesta.
- No se puede publicar sin haber aceptado las condiciones.
- Está escrito quién revisa, en cuánto tiempo y qué pasa si nadie puede.

## Cómo suele resolverse
Antes del primer aporte se aceptan condiciones que dicen qué se prohíbe. Cada contenido y cada perfil tienen cómo denunciar y bloquear desde la propia app. Las denuncias llegan a una cola con responsable; las medidas las decide el servidor, quedan registradas y tienen una vía de reclamo. El contenido denunciado se puede ocultar mientras se revisa. Los plazos y las reglas de sanción son decisiones de negocio que pone el humano. Si no hay quien modere, se recorta la función, no la moderación.

## Anti-patrones frecuentes
- Publicar el texto libre y dejar la moderación para después.
- Bloquear solo en la app de quien bloquea, sin que el servidor lo cumpla.
- Sancionar dando de baja de un grupo de avisos.
- Denunciar por un correo que nadie lee.
- Borrar sin registro ni forma de reclamar.
- Denuncias automáticas sin revisión que permiten callar a alguien en masa.

## Hechos en que se apoya
- [P-UGC-1], [P-UGC-2]: condiciones previas, denuncia, bloqueo y moderación continua.
- [P-RT-3], [P-RT-7]: quién puede suscribirse a un grupo de mensajería y qué puede hacer el servidor con las suscripciones.
- [P-CTA-5]: qué identificadores se desaconsejan.
- [P-PRI-5]: eliminar la cuenta incluye sus datos; desactivarla no cuenta.
- No verificado [P-UGC-3]: plazos concretos de moderación.
- No verificado [P-RT-8]: si el servidor puede impedir una nueva suscripción; por eso un grupo no se usa como sanción.

## Requisitos de referencia
R3 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
- [Las sanciones las hace cumplir el servidor](../ejemplos-adr-m/sanciones-en-el-servidor.md)
