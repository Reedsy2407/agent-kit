# Trabajo en segundo plano: detectar la interrupción, recuperarse y decirlo

## Problema
Una función tiene que seguir mientras la persona no mira la app, y el sistema, el fabricante del equipo o la propia persona pueden cortarla sin avisar. Aparece con un seguimiento que alguien inicia y termina, con una sincronización larga o con cualquier tarea cuyo silencio se confunde con que todo va bien. Lo caro no es que se interrumpa, sino no saberlo.

## Señales de que aplica
- La persona espera que algo continúe con la pantalla apagada o con otra app delante.
- Un hueco en lo registrado cambia el resultado: un recorrido, una jornada, un envío pendiente.
- La función se apoya en un servicio en primer plano, en trabajo programado o en un aviso que llega del servidor.

## Señales de que sobra
- Todo ocurre con la app visible y perderlo al salir no importa.
- La tarea puede esperar a la siguiente vez que se abra la app y repetirse entera sin daño.
- El servidor puede hacer el trabajo sin el teléfono.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: trabajar solo con la app visible y decirlo | Ninguno; la función termina al salir | Primera versión, o cuando la persona mira la app mientras ocurre |
| Trabajo programado que el sistema puede aplazar, con reintentos | Bajo | Puede ocurrir más tarde y repetirse sin daño |
| Una transferencia de datos iniciada por la persona | Bajo-medio: permiso y notificación; no existe en todas las versiones | La función es una descarga o subida larga que la persona pide |
| Geocercas del sistema, para actuar al llegar a un lugar | Alto: exigen ubicación en segundo plano, con sus declaraciones en la tienda | La función es esa y el permiso se justifica |
| Servicio en primer plano que la persona inicia y termina, con marcas de vida y detección de huecos | Medio-alto: permisos, declaraciones en la tienda y pruebas en equipos reales | Interrumpirlo estropea la función y no se puede aplazar |
| Pedir salir del ahorro de energía | Alto: restringido por la tienda | Solo si la función central falla sin ello y tras revisar la política vigente |

## Cómo se comprueba
- Una prueba local de la lógica de huecos: con marcas de vida separadas más de lo admitido, la app registra una interrupción y no rellena el tramo.
- En un equipo real, con registro por equipo: pantalla apagada durante un periodo completo de uso, reposo forzado, detención por la persona, cierre por falta de memoria, reinicio y ahorro de batería del fabricante.
- Al volver a abrir tras cada corte, la pantalla dice desde cuándo falta seguimiento y ofrece reanudar.
- Con la notificación del servicio descartada o sin permiso de notificaciones, la persona sigue pudiendo ver el estado y terminarlo desde la app.
- Una prueba de que un arranque no permitido desde segundo plano acaba en un aviso comprensible, no en un cierre.

## Cómo suele resolverse
El servicio arranca por una acción de la persona con la app visible y termina cuando ella lo dice. Mientras corre deja marcas de vida en el almacenamiento local. Cada vez que la app vuelve a ejecutarse compara la última marca con la hora actual y consulta el motivo de la última salida cuando el sistema lo ofrece; si hay un hueco, lo guarda como tal, lo muestra y no lo presenta como seguimiento. La recuperación ocurre en la siguiente oportunidad permitida, normalmente cuando la persona toca una notificación o abre la app. Nunca se promete que seguirá pase lo que pase: se promete que se sabrá cuándo no siguió.

## Anti-patrones frecuentes
- Dar por vivo el servicio porque la notificación se creó.
- Unir con una línea recta el tramo perdido y contarlo como medido.
- Intentar reiniciarlo en bucle desde segundo plano y tragarse el error.
- Pedir la exención de batería en el primer arranque, antes de que la persona entienda para qué.
- Probar solo en un emulador o en un único fabricante y declarar que sobrevive.
- Elegir un envoltorio web para algo que debe seguir con la app cerrada.

## Hechos en que se apoya
- [P-TRA-1]: cómo elige la guía entre trabajo asíncrono, trabajo programado, API específica y servicio en primer plano.
- [P-TRA-2]: el trabajo programado se conserva entre reinicios y admite reintentos.
- [P-FGS-1], [P-FGS-2]: tipo y permisos que declara un servicio en primer plano de ubicación.
- [P-FGS-3], [P-FGS-4]: restricciones para arrancar desde segundo plano, más duras para ubicación.
- [P-FGS-8], [P-FGS-9]: la persona puede detener la app sin aviso y el sistema puede matar el servicio y recrearlo o no.
- [P-FGS-12], [P-FGS-13]: reposo profundo y política sobre pedir la exención.
- [P-TRA-3], [P-TRA-4]: niveles de reposo e hibernación recortan lo que una app poco usada puede hacer.
- [P-FGS-14]: cómo forzar la detención y el reposo en un equipo.
- [P-OBS-2]: consultar por qué murió el proceso.
- [P-PER-6]: con un permiso de una sola vez, un servicio arrancado con la app visible conserva el acceso hasta que pare, y retirarlo termina el proceso.
- [P-TRA-5]: las transferencias iniciadas por la persona.
- [P-UBI-10], [P-UBI-3], [P-UBI-5]: las geocercas piden ubicación en segundo plano y lo que eso exige.
- [P-STK-3], [P-STK-7], [P-STK-8], [P-STK-9]: límites de otras alternativas de construcción en segundo plano.
- No verificado [P-FGS-6]: si un servicio de ubicación vuelve a arrancar tras reiniciar el equipo.
- No verificado [P-FGS-10]: cómo se combina la recreación del servicio con la restricción de ubicación.
- No verificado [P-FGS-11]: el cierre de procesos propio de cada fabricante.

## Requisitos de referencia
R1 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
- [Un turno interrumpido se detecta y se dice](../ejemplos-adr-m/interrupcion-se-detecta-y-se-dice.md)
