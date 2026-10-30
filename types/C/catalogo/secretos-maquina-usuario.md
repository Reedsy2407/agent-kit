# Secretos en la máquina del usuario: qué protege el cifrado local y qué no

## Problema
Una herramienta que se instala en el equipo de otra persona a veces necesita guardar un secreto (una clave de acceso, un token, una contraseña de servicio) entre ejecuciones. Todo lo que el programa puede leer para usarlo también lo puede leer cualquier código que corra con los mismos permisos. Cifrar el secreto en disco ayuda contra unas amenazas y no contra otras, y llamarlo «seguro» sin decir cuáles es la forma más común de engañarse.

## Señales de que aplica
- La herramienta guarda credenciales, tokens o claves entre ejecuciones.
- Se instala en equipos de otras personas, a veces compartidos.
- El secreto abre algo que importa fuera de la herramienta (un servicio, una cuenta, datos de terceros).

## Señales de que sobra
- La herramienta no necesita recordar el secreto: puede pedirlo en cada ejecución, o recibirlo del entorno de quien la lanza.
- El secreto es un valor de bajo riesgo, de un solo uso o que caduca en minutos.
- El equipo ya aporta un almacén de credenciales gestionado y el secreto se obtiene de él sin copiarlo.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: guardarlo en el archivo de configuración | Ninguno; legible por quien lea el archivo, copias de seguridad incluidas | Nunca como política; solo para un prototipo sin valor |
| No guardarlo: pedirlo cada vez o leerlo de una variable de entorno de quien lanza | Bajo; incómodo | Secretos de alto valor y uso poco frecuente |
| Archivo aparte con permisos restrictivos (solo el propietario) | Bajo; depende del sistema de archivos del sistema operativo | Un usuario, equipo no compartido |
| Almacén de credenciales del sistema operativo | Medio: una API por plataforma | Cuando existe y se acepta depender de él |
| Archivo cifrado con una clave derivada de una frase que da el usuario | Medio: gestión de la frase y su derivación | Cuando hay que proteger el archivo en reposo y no se puede usar el almacén |
| Tokens de corta vida obtenidos de un servicio, sin guardar el secreto permanente | Medio-alto | Cuando el servicio lo permite |

## Cómo se comprueba
- Una prueba de que el secreto nunca aparece en el registro, en los mensajes de error, en la salida de comprobación ni en los argumentos de otros procesos que se lanzan.
- Una prueba de permisos del archivo donde el sistema los expone, y de que la herramienta se niega a leer uno demasiado abierto.
- Una prueba de que el archivo de respaldo, la caché y los volcados de depuración no incluyen el secreto en claro.
- Una prueba de que el secreto no se pasa como argumento de la línea de órdenes, visible para otros procesos del equipo.
- Una prueba de cifrado (si se usa): la clave no se guarda junto al archivo, una frase incorrecta falla sin pistas, y el formato lleva versión para poder cambiar la derivación.
- Una prueba de revocación y rotación: cambiar el secreto no exige reinstalar y el viejo deja de usarse.

## Cómo suele resolverse
Primero se intenta no guardar nada: se pide cuando hace falta y se retiene en memoria el tiempo mínimo. Si hay que persistirlo, se prefiere el almacén de credenciales del sistema. Si no existe, un archivo aparte con permisos solo para el propietario, cuya presencia y permisos se comprueban al arrancar. El cifrado local se explica con honestidad: protege el secreto en reposo frente a quien copie el disco o una copia de seguridad, pero no frente a otro proceso del mismo usuario, porque el programa necesita la clave para descifrar y ese otro proceso puede pedirla o leer la memoria. El secreto nunca se pasa por argumentos, no se registra y se muestra solo como «definido» o «ausente».

## Anti-patrones frecuentes
- Llamar «cifrado» a codificar el secreto sin una clave que no esté al lado.
- Guardar la clave de cifrado junto al archivo cifrado.
- Pasar el secreto como argumento de la línea de órdenes o dejarlo en el historial.
- Valores por defecto para secretos: la herramienta arranca «funcionando» con un valor conocido.
- Registrar la configuración completa o la respuesta de un servicio que incluye el token.
- Incluir el secreto en informes de error o en archivos de depuración.
- Prometer en la documentación una protección que el diseño no da.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** el paquete `os`. Verificado el 2026-10-30 ([os](https://pkg.go.dev/os)): `CreateTemp` crea el archivo con permisos restrictivos antes de aplicar la máscara de creación; en Windows `Chmod` solo usa el bit de escritura del propietario, de modo que los permisos de un archivo no protegen allí como en Unix. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el verificador ejecuta el caso «check-config oculta el token» contra el binario del esqueleto Go y pasa, y las pruebas del esqueleto comprueban que el token no sale en el registro; las pruebas de permisos POSIX se omiten en Windows y no se ejecutaron aquí. No verificado: un almacén de credenciales del sistema, que la biblioteca estándar no trae.
- **Python:** `secrets` y `os`. Verificado el 2026-10-30 ([secrets](https://docs.python.org/3/library/secrets.html), [os](https://docs.python.org/3/library/os.html)): el módulo `secrets` está pensado para generar secretos y debe usarse en lugar de `random`; en Windows `chmod` solo cambia el indicador de solo lectura. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el caso «check-config oculta el token» pasa con el esqueleto Python y sus pruebas comprueban que el token no sale en el registro; las pruebas de permisos POSIX se omiten en Windows y no se ejecutaron aquí. No verificado: un almacén de credenciales del sistema y las bibliotecas de terceros que lo envuelven.
- **Rust:** `std::os::unix::fs::PermissionsExt`. Verificado el 2026-10-30 ([PermissionsExt](https://doc.rust-lang.org/std/os/unix/fs/trait.PermissionsExt.html)): el rasgo existe solo en Unix y da acceso a los bits de permisos. Comprobado ejecutando el esqueleto el 2026-10-30 (`types/C/esqueletos/VERIFICACION.md`): el caso «check-config oculta el token» pasa con el esqueleto Rust; el código de permisos para POSIX no se compiló ni se ejecutó aquí. No verificado: un almacén de credenciales del sistema, que la biblioteca estándar no trae.

## ADR de ejemplo
- Ninguno todavía.
