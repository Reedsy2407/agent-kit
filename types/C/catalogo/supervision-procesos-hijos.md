# Supervisión de procesos hijos con política de reinicio

## Problema
Una herramienta que lanza otros procesos (servicios, trabajadores, órdenes externas) pasa a ser responsable de ellos: saber si siguen vivos, recoger su estado de salida, no dejarlos huérfanos ni acumular procesos terminados sin recoger, y decidir qué hacer cuando fallan. Reiniciar a ciegas puede convertir un fallo en un bucle que consume el equipo.

## Señales de que aplica
- La herramienta mantiene vivos procesos de larga vida o ejecuta órdenes de terceros de forma repetida.
- Un hijo puede morir por su cuenta y alguien depende de que vuelva.
- Al parar la herramienta, los hijos deben parar con ella (y no quedar corriendo sin dueño).

## Señales de que sobra
- La herramienta lanza una orden, espera su final y sigue: basta lanzar, esperar y mirar el código de salida.
- Los hijos los gestiona ya un supervisor del sistema (el gestor de servicios de la plataforma) y esta herramienta solo debe arrancar bajo él.
- Un hijo que falla debe fallar ruidosamente y que lo vea una persona: reiniciarlo escondería el problema.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: lanzar y esperar una vez | Ninguno; sin recuperación | Órdenes de ejecución corta |
| Reiniciar siempre que salga | Bajo; riesgo de bucle de reinicios que satura | Casi nunca como única política |
| Reiniciar con espera creciente y tope de intentos | Medio: estado por hijo y reloj | Hijos de larga vida que fallan a veces |
| Delegar en el supervisor del sistema | Bajo en código; depende de la plataforma | Instalación como servicio |
| Política por tipo de salida (error recuperable, error permanente, orden de parar) | Medio-alto | Varios tipos de hijos con necesidades distintas |

## Cómo se comprueba
- Una prueba con un hijo que sale con error: se reinicia con la espera esperada y no más veces que el tope.
- Una prueba con un hijo que sale con éxito o por orden de parar: no se reinicia.
- Una prueba de parada: al parar la herramienta, el hijo recibe primero la petición de terminar, luego, pasado un plazo, la terminación forzada, y no queda ningún proceso vivo ni sin recoger.
- Una prueba del hijo que ignora la petición de terminar: el plazo se cumple y se fuerza.
- Una prueba de salida muy rápida repetida: la espera creciente evita el bucle apretado.
- Una prueba de que la salida del hijo no bloquea al supervisor cuando nadie la lee.

## Cómo suele resolverse
Cada hijo tiene un pequeño bucle propio que lo lanza, espera su final y consulta una política: según cómo terminó y cuántas veces ha fallado seguidas, reinicia tras una espera que crece y se reinicia a cero cuando el hijo vive lo suficiente, o se rinde y lo informa. La parada es en dos tiempos (pedir y, vencido un plazo, forzar) y siempre recoge el estado de salida. Si el hijo escribe en tuberías, alguien las vacía mientras tanto. Las órdenes de terceros se lanzan con una lista de argumentos y no con una cadena que interprete un intérprete de órdenes.

## Anti-patrones frecuentes
- Reiniciar sin espera ni tope. Corrección: espera creciente y límite de intentos seguidos.
- Dejar de esperar al hijo y no recoger su estado: acumula procesos terminados sin recoger. Corrección: esperar siempre, también en la parada.
- Montar una cadena de texto con datos externos para ejecutarla en un intérprete de órdenes. Corrección: lista de argumentos sin intérprete.
- Parar solo al hijo directo y dejar vivos sus propios hijos.
- Leer la salida del hijo después de esperarlo: se bloquea si llena la tubería.
- No distinguir «terminó bien», «falló» y «lo paramos nosotros».

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** `os/exec`. Verificado el 2026-10-30 ([os/exec](https://pkg.go.dev/os/exec)): tras un `Start` correcto hay que llamar a `Wait` para liberar los recursos; `CommandContext` interrumpe el proceso cuando el contexto termina (por defecto lo mata), `Cancel` permite enviar otra señal y `WaitDelay` acota cuánto se espera a un hijo que no sale o que deja abiertas sus tuberías. La terminación de los nietos y los grupos de procesos dependen del sistema: No verificado.
- **Python:** `subprocess`. Verificado el 2026-10-30 ([subprocess](https://docs.python.org/3/library/subprocess.html)): `terminate` envía SIGTERM en POSIX y en Windows llama a `TerminateProcess`; `kill` envía SIGKILL en POSIX y en Windows equivale a `terminate`; `wait(timeout)` lanza `TimeoutExpired` si no termina a tiempo y es seguro reintentarlo; `wait` con tuberías puede bloquearse si el hijo las llena, y la documentación recomienda `communicate`. Usar `Popen` como administrador de contexto espera al proceso al salir.
- **Rust:** `std::process::Child`. Verificado el 2026-10-30 ([Child](https://doc.rust-lang.org/std/process/struct.Child.html)): soltar un `Child` no lo mata ni lo espera, y la biblioteca estándar nunca espera a los hijos por sí sola; en Unix un proceso terminado y no esperado queda como zombi, y demasiados pueden agotar identificadores de proceso; `try_wait` no bloquea y `kill` fuerza la salida. No verificado: una política de reinicio con espera creciente no viene en la biblioteca estándar y se escribe a mano.

## ADR de ejemplo
- Ninguno todavía.
