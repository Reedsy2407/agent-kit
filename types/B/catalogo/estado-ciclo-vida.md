# Estado y ciclo de vida de entidades largas

## Problema
Una entidad que vive horas o días (una orden, un cobro, una reserva, un trámite) recibe eventos repetidos o fuera de orden. Hay que impedir transiciones absurdas (cerrar lo ya cancelado) y compensar lo que quedó a medias cuando algo se cancela.

## Señales de que aplica
- La entidad tiene estados que se suceden y no todos los saltos son válidos.
- Llegan eventos duplicados o desordenados que cambian su estado.
- Una cancelación debe deshacer efectos en otras entidades.
- Hay dimensiones independientes (estado de cobro, de entrega, de verificación) metidas en un solo campo.

## Señales de que sobra
- Un estado de dos valores (activo e inactivo) sin reglas de salto: un booleano y una guarda bastan.
- Entidades de vida corta que se crean y terminan en la misma petición.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: cualquier código asigna el campo estado | Ninguno; transiciones ilegales posibles | Estados triviales |
| Métodos con guarda que informan de si algo cambió (idempotentes) | Bajo | Pocos estados |
| Máquina de estados en la propia entidad: cada estado define las transiciones que permite | Medio | Varios estados con reglas de salto |
| Estados separados por dimensión independiente | Bajo-medio | Causas distintas que hoy comparten un campo |
| Compensación por eventos | Medio | Una cancelación debe deshacer efectos en otras partes |
| Motor de flujos o sagas | Alto | Procesos largos que la compensación por eventos ya no cubre |

## Cómo se comprueba
- Pruebas de dominio puras (sin framework) de cada transición válida y de cada inválida, incluida la repetición del mismo evento (idempotente).
- Una prueba por compensación: cancelar a medio camino deja los efectos deshechos.
- Una prueba de que ningún camino asigna el estado sin pasar por la máquina.
- Una prueba de que cada estado declarado tiene al menos una transición que entra a él.

## Cómo suele resolverse
Una solución habitual modela cada entidad larga como una enumeración con comportamiento: cada estado implementa solo las transiciones que admite, algunos aceptan repetirse para que un evento duplicado sea inofensivo, y las dimensiones independientes tienen estados separados. La compensación va por eventos: al cancelar se deshacen los efectos ya producidos y lo que falla se encola de forma persistente para reintentarlo; lo que caduca se expira con un proceso periódico.

## Anti-patrones frecuentes
- Asignar el estado directamente en algún camino, saltándose la máquina.
- Declarar estados que nadie transiciona (de compensación, por ejemplo). Corrección: no declarar lo que no se usa.
- Señalar la transición inválida de dos maneras distintas (ver la ficha de errores).
- Un solo campo con tres valores que mezcla dos causas («activa», «inactiva», «sin verificar»). Corrección: dos campos independientes.
- Completar una entidad que luego «revive» por una escritura obsoleta (ver la ficha de concurrencia).

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** Enumeración con métodos por estado. La biblioteca Spring Statemachine está archivada y sin mantenimiento (aviso del repositorio, archivado el 2026-07-05): no la elijas para proyectos nuevos. Verificado el 2026-10-23 ([Spring Statemachine](https://github.com/spring-projects/spring-statemachine)): el estado de Spring Statemachine. No verificado: alternativas vigentes.
- **.NET:** tipos que representan cada estado (o una enumeración con métodos de extensión) y un registro de transiciones; bibliotecas de máquinas de estado existen. No verificado: bibliotecas vigentes.
- **Node:** un objeto de transiciones permitidas por estado y una función pura `transicionar`. XState solo si el flujo es complejo. No verificado: ajuste a la versión actual de XState.
- **Python:** `enum` más una tabla de transiciones; bibliotecas como `transitions` si crecen. No verificado.

## ADR de ejemplo
- [Estados independientes: actividad y verificación](../ejemplos-adr/estados-independientes.md)
