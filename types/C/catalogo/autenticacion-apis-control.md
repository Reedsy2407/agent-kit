# Autenticación de APIs de control: token maestro frente a tokens con alcance

## Problema
Cuando una herramienta ofrece una interfaz de control a la que se llega por la red local o por un canal compartido, algo debe decidir quién puede usarla y qué puede hacer. El camino más corto es un único secreto que abre todo (un token maestro). Funciona hasta que hay más de un cliente, hasta que un cliente se compromete o hasta que se quiere dar a alguien solo una parte del poder. La alternativa son credenciales con alcance limitado, que se pueden dar, restringir y revocar por separado.

## Señales de que aplica
- La interfaz de control es alcanzable por más de un usuario o proceso (puerto local, red, canal compartido).
- Hay clientes con necesidades distintas: solo leer estado, recargar, administrar.
- Un cliente comprometido no debe poder hacerlo todo.
- Hace falta saber quién hizo qué.

## Señales de que sobra
- El único canal es un archivo con permisos solo para el propietario y el único cliente es su propio usuario: los permisos del sistema ya son la autenticación.
- La interfaz solo es alcanzable desde el propio proceso o desde un componente de confianza total.
- Es un prototipo que nunca se expondrá fuera del propio equipo de desarrollo.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: sin autenticación, confiando en que el canal es local | Ninguno; cualquier proceso del equipo manda | Solo si el canal ya está restringido por permisos del sistema |
| Un token maestro compartido | Bajo; todo o nada, sin atribución, revocar rompe a todos | Un único cliente de confianza |
| Un token por cliente, todos con el mismo poder | Medio: emisión, almacenamiento, revocación | Varios clientes, atribución necesaria |
| Tokens con alcance (qué órdenes y sobre qué) y caducidad | Medio-alto | Clientes con permisos distintos |
| Identidad del sistema (credenciales del proceso que conecta, certificados) | Medio-alto: depende de la plataforma | Cuando el sistema ofrece una identidad fiable del cliente |

## Cómo se comprueba
- Una prueba de rechazo: sin credencial, con una errónea, con una caducada o revocada, la orden se rechaza con un error que no revela si la credencial existe.
- Una prueba de alcance: una credencial limitada no puede ejecutar una orden fuera de su alcance, y el rechazo queda registrado.
- Una prueba de comparación en tiempo constante o equivalente: el tiempo de respuesta no depende de cuántos caracteres coinciden.
- Una prueba de almacenamiento: el servidor guarda solo una huella de cada credencial, no el valor en claro, y la credencial nunca se registra.
- Una prueba de revocación y de rotación: se revoca una sin afectar a las demás y sin reiniciar.
- Una prueba de fuerza bruta: intentos repetidos fallidos se limitan o se registran.
- Una prueba de atribución: cada orden aceptada deja constancia de quién la dio.

## Cómo suele resolverse
Las credenciales se generan con un generador aleatorio criptográfico y con suficiente longitud, se entregan una sola vez y el servidor guarda solo una huella. Cada una declara su alcance (órdenes y recursos permitidos) y, si conviene, una caducidad. La verificación compara en tiempo constante y responde con el mismo mensaje ante cualquier fallo de autenticación. Cada orden se autoriza contra el alcance, se registra con la identidad de la credencial y se rechaza por defecto si no está permitida. El token maestro, si existe, es solo para administración local y para emitir los demás, y se puede rotar. La interfaz escucha en el canal más restringido posible (ver la ficha de control local).

## Anti-patrones frecuentes
- Un único token compartido por todos los clientes y todos los entornos.
- Guardar las credenciales en claro en el servidor o en el registro.
- Comparar con una igualdad de texto corriente.
- Credenciales que nunca caducan y que no se pueden revocar sin reiniciar.
- Mensajes distintos para «credencial inexistente» y «credencial equivocada».
- Incluir el token en la dirección de las peticiones, que se registra por el camino.
- Autorizar solo en la interfaz de usuario y no en cada orden.
- Un alcance «administrador» como valor por defecto.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** `crypto/subtle`. Verificado el 2026-10-30 ([crypto/subtle](https://pkg.go.dev/crypto/subtle)): `ConstantTimeCompare` devuelve uno si el contenido de las dos secuencias de bytes es idéntico y cero en otro caso; para secuencias de igual longitud el tiempo depende solo de la longitud, y si las longitudes difieren devuelve cero de inmediato. No verificado: el generador aleatorio criptográfico de la biblioteca estándar para emitir credenciales (la fuente consultada no lo cubre).
- **Python:** `hmac` y `secrets`. Verificado el 2026-10-30 ([hmac](https://docs.python.org/3/library/hmac.html), [secrets](https://docs.python.org/3/library/secrets.html)): `hmac.compare_digest` se diseñó para resistir ataques de tiempo y evita el atajo de detenerse en el primer byte distinto; si las longitudes difieren, un ataque de tiempo podría revelar tipos y longitudes pero no valores; `secrets` genera valores criptográficamente fuertes (`token_bytes`, `token_hex`, `token_urlsafe`) y debe usarse en lugar de `random`; la documentación considera suficientes treinta y dos bytes de aleatoriedad para usos típicos, con la salvedad de que esa cifra puede subir con el tiempo.
- **Rust:** No verificado: que la biblioteca estándar no traiga comparación en tiempo constante ni un generador aleatorio criptográfico (la fuente consultada no la cubre); de ser así, hacen falta bibliotecas de terceros para ambas cosas, y cuál conviene a cada caso tampoco está verificado.

## ADR de ejemplo
- Ninguno todavía.
