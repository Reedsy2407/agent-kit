# Entrada no confiable en protocolos: límites, plazos y análisis defensivo

## Problema
Cualquier herramienta que recibe bytes de fuera de sí misma (un archivo, una tubería, una conexión, un argumento, un mensaje de otro proceso) recibe datos que no controla. Un lector que confía en lo que le llega puede agotar la memoria, quedarse esperando para siempre, aceptar lo malformado como válido o fallar de una forma que otro pueda provocar a propósito. La defensa no es adivinar intenciones, sino fijar límites, plazos y reglas estrictas antes de actuar sobre la entrada.

## Señales de que aplica
- La herramienta lee de la red, de archivos que no escribió ella o de otros procesos.
- Escucha en una dirección a la que llegan clientes que no controla.
- Analiza un formato (de texto o binario) que puede venir malformado.
- Corre con más privilegios que quien produce la entrada.

## Señales de que sobra
- La única entrada son los argumentos que escribe su propio usuario y ya los valida un analizador estricto.
- La entrada procede de un componente del mismo proceso, ya validado en su borde.
- Es una prueba o un prototipo desechable que nunca recibirá datos reales.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: leer y analizar lo que llegue | Ninguno; memoria y tiempo sin tope | Prototipo desechable |
| Tope de tamaño y plazo de lectura en cada borde | Bajo | Siempre que haya entrada externa |
| Lo anterior más análisis estricto con rechazo ante la duda y errores que no revelan estado interno | Medio | Formatos propios o estándar |
| Lo anterior más límites por conexión y por origen (cantidad, ritmo) | Medio-alto | Servidores que aceptan muchos clientes |
| Aislar el análisis en un proceso con menos privilegios | Alto | Analizadores complejos con privilegios elevados |

## Cómo se comprueba
- Una prueba del tope: una entrada justo en el límite se acepta, una un byte más se rechaza, y no se lee más allá del límite.
- Una prueba del plazo: una fuente que no entrega nada o que entrega muy despacio se corta al vencer el plazo, incluida la apertura.
- Una prueba de entrada malformada, truncada, vacía, con campos repetidos, con longitudes declaradas absurdas y con codificación inválida: se rechaza sin pánico ni cuelgue y sin consumir recursos desproporcionados.
- Una prueba de que el mensaje de error no incluye la entrada completa ni datos internos.
- Una prueba de ráfaga: muchas conexiones o mensajes a la vez no agotan memoria ni descriptores.
- Pruebas de propiedades y de fuzzing del analizador (ver su ficha) alimentadas con entradas aleatorias.

## Cómo suele resolverse
En cada borde se aplican tres cosas antes de analizar: un tope duro de bytes que se comprueba leyendo uno más del límite, un plazo total que incluye abrir y leer, y una validación estricta en el orden correcto (tamaño, forma, valores, coherencia). Las longitudes declaradas por el emisor nunca se usan para reservar memoria sin tope. El analizador rechaza ante la duda y los errores dicen qué regla se incumplió sin repetir el contenido. Los servidores añaden un tope de conexiones simultáneas y plazos por conexión. Lo que no se necesita se descarta pronto y lo analizado se trata como datos, nunca como instrucciones para ejecutar.

## Anti-patrones frecuentes
- Leer «hasta el final» sin tope.
- Confiar en un campo de longitud para reservar memoria.
- Un solo plazo para toda la conexión o ninguno.
- Aceptar variantes ambiguas y resolverlas con una suposición (campos repetidos, codificaciones mixtas).
- Errores que devuelven la entrada o el estado interno al emisor.
- Pasar texto de la entrada a un intérprete de órdenes o a una consulta construida por concatenación.
- Registrar la entrada completa, secretos incluidos.
- Dar por hecho que el plazo de lectura cubre también la apertura o la conexión.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** el paquete `io`. Verificado el 2026-10-30 ([io](https://pkg.go.dev/io)): `LimitReader` devuelve un lector que termina con fin de archivo tras leer el número de bytes indicado; `ReadAll` lee hasta un error o el fin de archivo; un lector puede devolver menos bytes de los pedidos, y quien lee debe procesar los bytes devueltos antes de mirar el error. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el esqueleto Go lee con tope más uno y plazo que incluye la apertura; el caso de entrada demasiado grande del verificador pasa y las pruebas del límite y del plazo son unitarias.
- **Python:** `socket` y lectura acotada. Verificado el 2026-10-30 ([socket](https://docs.python.org/3/library/socket.html)): `settimeout` con un valor positivo hace que las operaciones lancen una excepción de plazo agotado si pasa el tiempo, con cero pone el socket en modo no bloqueante y con `None` en modo bloqueante. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el esqueleto Python lee en otro hilo con tope más uno y plazo; el caso de entrada demasiado grande del verificador pasa y las pruebas del límite y del plazo son unitarias.
- **Rust:** `std::io::Read` y `std::net::TcpStream`. Verificado el 2026-10-30 ([Read](https://doc.rust-lang.org/std/io/trait.Read.html), [TcpStream](https://doc.rust-lang.org/std/net/struct.TcpStream.html)): `Read::take` crea un adaptador que lee como máximo el límite y después devuelve fin de archivo; `read_to_end` bloquea indefinidamente con flujos que no terminan; una lectura puede devolver menos bytes de los pedidos; `set_read_timeout` con `None` significa sin plazo, rechaza una duración cero, y el tipo de error al vencer depende de la plataforma (en Unix suele ser `WouldBlock` y en Windows puede ser `TimedOut`). Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el esqueleto Rust lee con `take` en otro hilo con plazo; el caso de entrada demasiado grande del verificador pasa y las pruebas del límite y del plazo son unitarias.

## ADR de ejemplo
- Ninguno todavía.
