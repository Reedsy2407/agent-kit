# Privilegios mínimos: instaladores, servicios del sistema y acceso al runtime de contenedores

## Problema
Una herramienta que pide más permisos de los que necesita convierte cualquier fallo suyo, de su entorno o de lo que ejecuta en un fallo del equipo entero. Los puntos donde esto ocurre casi siempre son tres: el instalador (que corre elevado y toca el sistema), el servicio (que corre de forma permanente con una cuenta) y el acceso a componentes que equivalen a control total, como el canal de control de un runtime de contenedores. La pregunta de diseño es qué puede hacer la herramienta si alguien toma el control de su proceso.

## Señales de que aplica
- El instalador pide administrador o añade al usuario a grupos con poder sobre el sistema.
- La herramienta corre como servicio con una cuenta con permisos amplios.
- Necesita hablar con un componente cuyo control equivale a control del equipo.
- Se instala en equipos compartidos o de terceros.

## Señales de que sobra
- Es una herramienta de ejecución corta que corre con los permisos del usuario que la lanza y no pide nada más.
- Todo lo que hace cabe en el directorio del propio usuario.
- El sistema ya la ejecuta dentro de un entorno aislado y desechable.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: correr como administrador o con permisos amplios «por si acaso» | Ninguno de esfuerzo; radio de daño total | Nunca como política |
| Correr con los permisos del usuario y pedir elevación solo para el paso que la necesita | Bajo-medio | Instaladores |
| Cuenta de servicio dedicada, sin inicio de sesión y con acceso a lo mínimo | Medio | Servicios permanentes |
| Separar el proceso con permisos del que procesa entrada: uno pequeño y privilegiado, otro grande y sin privilegios | Alto | Cuando una parte necesita privilegios y otra analiza entrada externa |
| Evitar el privilegio: modo del componente que no lo exige, o un intermediario de solo lectura | Medio | Acceso a runtimes de contenedores y componentes equivalentes |
| Capacidades finas del sistema en lugar de administrador completo | Medio: depende de la plataforma | Un solo permiso especial (por ejemplo, abrir un puerto reservado) |

## Cómo se comprueba
- Una prueba que arranca la herramienta con un usuario sin privilegios y verifica que cumple su función, o que falla con un mensaje claro que dice qué permiso falta.
- Una prueba del instalador: no deja archivos escribibles por todos en lugares privilegiados, no añade grupos ni reglas permanentes sin decirlo, y se puede deshacer.
- Una prueba de qué puede alcanzar el proceso: lista de archivos, sockets y variables a su alcance, comparada con lo declarado.
- Una prueba de que, tras usar un permiso especial (abrir un puerto, leer un archivo protegido), el proceso lo abandona.
- Una prueba de que una entrada hostil no puede aprovechar los privilegios del proceso: si el análisis corre con ellos, está aislado.
- Una revisión escrita del radio de daño en una frase, que forma parte de la evaluación de viabilidad.

## Cómo suele resolverse
Se parte de ejecutar con los permisos del usuario y se enumera, paso a paso, qué necesita realmente más. Cada permiso extra se acota: se pide solo en el instante y la acción que lo requiere, o se encarga a un proceso pequeño aparte que no analiza entrada externa. Un servicio usa una cuenta propia sin inicio de sesión y con acceso solo a su carpeta. El acceso a un componente que equivale a control total se evita siempre que haya otra vía (un modo del componente sin privilegios, un intermediario que solo permite consultas, un usuario dedicado) y, si no la hay, se documenta como riesgo aceptado con el motivo. El instalador dice qué cambia y trae su desinstalación.

## Anti-patrones frecuentes
- Pedir administrador porque «así funciona en todas las máquinas».
- Añadir al usuario a un grupo con poder equivalente a administrador y no decirlo.
- Montar el canal de control de un runtime de contenedores dentro de otro contenedor o en un instalador sin acotarlo.
- Un servicio que corre como la cuenta más poderosa del sistema.
- Conservar el privilegio durante toda la vida del proceso cuando solo hacía falta al abrir un recurso.
- Un instalador que ejecuta un guion descargado sin verificarlo.
- Resolver programas por el directorio de trabajo cuando el proceso está elevado.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** `os/exec`. Verificado el 2026-10-30 ([os/exec](https://pkg.go.dev/os/exec)): desde Go 1.19, `LookPath` y `Command` no resuelven un programa a través del directorio actual y devuelven un error que cumple `errors.Is(err, ErrDot)`; `Command` no invoca un intérprete de órdenes. No verificado: la credencial de usuario y grupo del atributo de proceso del sistema, y el abandono de privilegios tras abrir un recurso.
- **Python:** `subprocess`. Verificado el 2026-10-30 ([subprocess](https://docs.python.org/3/library/subprocess.html)): `user`, `group` y `extra_groups` de `Popen` son solo para POSIX; fijar `user` no descarta los grupos suplementarios, por lo que hay que pasar también `extra_groups=()`; con `shell=False`, el valor por defecto, no se invoca un intérprete de órdenes. No verificado: el abandono de privilegios del propio proceso y los equivalentes en Windows.
- **Rust:** `std::process::Command` y su extensión de Unix. Verificado el 2026-10-30 ([Command](https://doc.rust-lang.org/std/process/struct.Command.html)): en Unix `uid` y `gid` fijan el usuario y el grupo del hijo y, si fallan, la creación falla; los argumentos se pasan sin intérprete de órdenes. No verificado: el abandono de privilegios del propio proceso y las capacidades finas del sistema.

## ADR de ejemplo
- [Usuario dedicado y sin acceso al canal de control del runtime de contenedores](../ejemplos-adr-c/usuario-dedicado-sin-acceso-total.md)
