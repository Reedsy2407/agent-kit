# Control local de un daemon: canal y quién puede hablarle

## Problema
Un proceso residente necesita aceptar órdenes mientras corre (consultar estado, recargar, parar, cambiar un ajuste). Cualquier canal que lo permita también permite que otro proceso del mismo equipo le dé órdenes. La pregunta no es solo «cómo se comunican», sino «quién tiene derecho a hacerlo» y «qué puede ordenarle».

## Señales de que aplica
- Hay que operar el proceso sin reiniciarlo: estado, recarga, parada, ajustes en caliente.
- Una herramienta de línea de órdenes del mismo proyecto actúa como cliente del daemon.
- Más de un usuario del equipo, o procesos de distinto nivel de confianza, conviven con el daemon.

## Señales de que sobra
- Las únicas órdenes necesarias son parar y recargar y bastan las señales del sistema: un canal propio añade superficie sin aportar.
- El proceso es de ejecución corta o se controla solo por archivos de configuración y reinicios.
- Un supervisor del sistema ya ofrece arrancar, parar y consultar el estado.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: señales del sistema y reinicio | Ninguno; sin consulta de estado ni ajustes en caliente | Daemon sencillo |
| Socket local de dominio Unix en una ruta con permisos propios | Bajo-medio: protocolo, permisos, limpieza del archivo | Sistemas de tipo POSIX, un usuario o un grupo de confianza |
| Tubería con nombre (equivalente en Windows) | Medio: otra API por plataforma | Cuando Windows es plataforma objetivo |
| Puerto TCP solo en la interfaz local | Medio: lo alcanza cualquier usuario del equipo; hace falta autenticar | Cuando no hay socket de archivo disponible y se acepta autenticar |
| Lo anterior más un token por cliente con alcance | Medio-alto | Varios clientes con permisos distintos (ver la ficha de autenticación de APIs de control) |

## Cómo se comprueba
- Una prueba de permisos: el archivo del socket y su carpeta solo admiten a quien debe; otro usuario no puede conectar.
- Una prueba de que el canal nunca escucha en una interfaz externa por defecto.
- Una prueba de entrada hostil al canal: mensajes enormes, truncados, mal formados o lentos se rechazan con límite y plazo sin colgar el daemon.
- Una prueba de qué se puede ordenar: una orden fuera del alcance del cliente se rechaza y queda registrada.
- Una prueba de limpieza: tras parar (y tras una salida forzada) un arranque nuevo no se encuentra con un socket huérfano que lo bloquee ni con uno que otro proceso pueda suplantar.
- Una prueba de versión: un cliente de otra versión recibe un error claro y no un comportamiento indefinido.

## Cómo suele resolverse
El daemon crea el canal en una carpeta que solo su usuario (o un grupo concreto) puede recorrer, con permisos del archivo ajustados antes de aceptar la primera conexión, y lo elimina al salir. El protocolo es pequeño, con mensajes delimitados, un tamaño máximo, un plazo de lectura y una versión; cada orden se valida como cualquier entrada no confiable y el daemon responde con un resultado estructurado. Qué puede ordenar cada cliente es explícito y lo registrado incluye quién y qué. Si hay que cruzar plataformas, se aísla el transporte detrás de una interfaz y el protocolo no cambia.

## Anti-patrones frecuentes
- Escuchar en todas las interfaces «por comodidad». Corrección: solo la interfaz local, o un archivo con permisos.
- Confiar en que «solo lo usa el equipo propio» y no autenticar nada cuando conviven usuarios distintos.
- Crear el socket en una carpeta compartida y escribible por todos.
- No ajustar los permisos antes de aceptar conexiones: hay una ventana en la que cualquiera conecta.
- Un protocolo sin límite de tamaño ni plazo: un cliente lento o enorme colgaría al daemon.
- Dejar el archivo del socket tras una salida forzada y que el arranque siguiente falle o, peor, lo reutilice.
- Una orden «ejecuta esto» genérica en el canal de control.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** el paquete `net`. Verificado el 2026-10-30 ([net](https://pkg.go.dev/net)): `Dial` conoce las redes `unix`, `unixgram` y `unixpacket`, y para ellas la dirección debe ser una ruta del sistema de archivos; los plazos de `Conn` (`SetDeadline`) hacen que la lectura o escritura devuelvan un error que envuelve `os.ErrDeadlineExceeded` cuando vencen, y un plazo cero significa sin plazo. No verificado: si `UnixListener` borra el archivo al cerrarse (la fuente consultada no lo detalla), los permisos con los que nace el archivo y la compatibilidad con Windows.
- **Python:** el módulo `socket`. Verificado el 2026-10-30 ([socket](https://docs.python.org/3/library/socket.html)): si la constante `AF_UNIX` no está definida el protocolo no se admite; la dirección de un socket ligado a un nodo del sistema de archivos es una cadena; `settimeout` con un valor positivo hace que las operaciones lancen una excepción de plazo agotado. No verificado: la fuente no trata los permisos ni el ciclo de vida del archivo del socket, y solo da el criterio de la constante, no una lista de sistemas operativos.
- **Rust:** `std::os::unix::net`. Verificado el 2026-10-30 ([UnixListener](https://doc.rust-lang.org/std/os/unix/net/struct.UnixListener.html)): el tipo existe solo en Unix; `accept` bloquea el hilo hasta que llega una conexión y, tras `set_nonblocking(true)`, devuelve de inmediato un error de tipo `WouldBlock` si no puede completarse. No verificado: la fuente no dice qué pasa con el archivo al soltar el escuchador, y la biblioteca estándar no trae tuberías con nombre de Windows.

## ADR de ejemplo
- Ninguno todavía.
