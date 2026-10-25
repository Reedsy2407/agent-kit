# Despliegue y configuración por ambiente (ningún secreto con valor por defecto)

## Problema
El mismo sistema se despliega en varios ambientes, a veces para varios inquilinos. Hay que cambiar valores por ambiente sin reconstruir la imagen, sin dispersar la configuración y sin que un secreto caiga a un valor predecible cuando falta una variable.

## Señales de que aplica
- Más de un ambiente (local, pruebas, real).
- Configuración que cambia por ambiente o por inquilino.
- Secretos que llegan al servicio.

## Señales de que sobra
- Un solo ambiente, un solo archivo de configuración y ningún secreto: la configuración por variables de entorno ya es suficiente.
- Un sistema de banderas de funcionalidad completo cuando un booleano por variable resuelve.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: valores en el código | Ninguno; secretos expuestos, reconstrucciones | Nunca |
| Configuración por variables de entorno con un único archivo base | Bajo | Siempre |
| **Secretos sin valor por defecto: si falta la variable, el servicio no arranca** | Muy bajo | Siempre |
| Una misma imagen para todos los ambientes, con la configuración inyectada desde fuera | Bajo | Siempre que se use contenedor |
| Archivo de inquilinos montado y validado al arrancar | Medio | Varios inquilinos |
| Banderas como booleanos por variable, cada una con fecha de retiro | Bajo | Cambios de comportamiento graduales |
| Escaneo de secretos como paso del pipeline | Bajo | Siempre |

## Cómo se comprueba
- Una prueba de arranque que falla cuando falta un secreto obligatorio (y no cae a un valor).
- Una prueba o comprobación del pipeline de que cada ambiente tiene todas las variables obligatorias.
- Un escáner de secretos sobre el árbol y el historial antes de publicar.
- Una prueba de que el valor de un ambiente de pruebas no puede quedar como valor por defecto del ambiente real.
- Una validación al arrancar de la configuración de inquilinos: cada inquilino tiene esquema y no hay identificadores repetidos.

## Cómo suele resolverse
Una solución habitual usa una misma imagen para todos los ambientes y un archivo de configuración base donde cada valor sale del entorno (con valor de reserva solo si no es secreto), con perfiles por ambiente casi vacíos. La descripción de los inquilinos se monta desde fuera y se valida al arrancar, las banderas son variables booleanas y los secretos no tienen valor por defecto.

## Anti-patrones frecuentes
- **Un valor con forma de credencial como valor por defecto** en un archivo versionado (por ejemplo una clave de cifrado predecible que se activa si la variable falta). Corrección: los secretos no llevan valor de reserva, y se escanean en el pipeline.
- Un archivo de inquilinos opcional que, ausente, deja arrancar el servicio con el esquema por defecto.
- Valores de un ambiente de pruebas escritos en el archivo base, de modo que el ambiente real solo funciona si alguien define la variable.
- Perfiles por ambiente que acumulan direcciones e identificadores en lugar de un único archivo base. Corrección: dejar esa regla por escrito.
- Banderas sin ciclo de vida: nadie sabe cuándo retirarlas.
- Un perfil de desarrollo que permite todo y llega al ambiente real.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** `@ConfigurationProperties` validadas con `@Validated` y restricciones de Jakarta (`@NotNull`, `@Pattern`); las variables de entorno se enlazan solas (`APP_ENTORNO` a `app.entorno`); en `application.yml`, los secretos como `${VARIABLE}` sin valor por defecto. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): sin `APP_ENTORNO` la aplicación no arranca (validación del registro `AjustesApp`) y sale con código 1, tanto en local como en contenedor (Spring Boot 4.1.2). Verificado el 2026-10-23 ([Spring Boot](https://docs.spring.io/spring-boot/reference/features/external-config.html)): el enlace relajado de variables de entorno a propiedades. No verificado: qué ocurre con un `${VARIABLE}` sin valor en `application.yml` (no te apoyes en ello: valida con `@ConfigurationProperties`).
- **.NET:** Patrón de opciones con validación al inicio (`AddOptions<T>().Validate(...).ValidateOnStart()`, `ValidateDataAnnotations`) y variables de entorno como fuente de configuración; secretos con el gestor del proveedor. Verificado el 2026-10-23 ([.NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/options)): `ValidateOnStart` y `ValidateDataAnnotations`. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): sin `APP_ENTORNO` el servicio no arranca y sale con código 1 (.NET 10, en contenedor).
- **Node:** Validar las variables al arrancar y terminar con error si faltan; nunca `process.env.X || 'valor'` en secretos. Verificado el 2026-10-23 ([Node.js](https://nodejs.org/docs/latest-v24.x/api/process.html)): los valores de `process.env` son cadenas (asignar otro tipo se convierte y está en desuso) y `process.loadEnvFile` existe. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): el esqueleto node valida su configuración al arrancar y sale con código 1 si falta `APP_ENTORNO`, con la biblioteca estándar (sin dependencia de validación). No verificado: biblioteca de validación preferida.
- **Python:** Configuración tipada (`pydantic-settings`, `BaseSettings`) que lee variables de entorno y falla con `ValidationError` si falta un valor obligatorio. Verificado el 2026-10-23 ([pydantic-settings](https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/)): la lectura de variables de entorno y el error por campo obligatorio ausente. Comprobado ejecutando el esqueleto el 2026-10-23 (`types/B/esqueletos/VERIFICACION.md`): el esqueleto python usa un objeto de configuración propio (sin esa dependencia) que sale con código 1 si falta `APP_ENTORNO`.

## ADR de ejemplo
- Ninguno todavía.
