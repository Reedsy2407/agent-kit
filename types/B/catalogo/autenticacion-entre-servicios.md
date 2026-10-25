# Autenticación y autorización entre servicios

## Problema
Hay que saber quién actúa y desde qué aplicación, y distinguir lo que hacen las personas de lo que hacen los procesos internos (tareas, eventos), sin que cada servicio improvise su validación y sin fiarse de cabeceras que cualquiera puede inventar.

## Señales de que aplica
- Hay más de un servicio, o un servicio expuesto a internet.
- Algunas llamadas las hacen procesos y no personas.
- Hay roles con poderes distintos, o integradores de confianza.

## Señales de que sobra
- Un solo servicio con una sola clase de usuario interno: autenticación de sesión estándar del framework y nada más.
- Una herramienta interna detrás de una red privada con acceso ya controlado.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: sin autenticación | Ninguno; todo expuesto | Nunca fuera de local |
| Confiar en cabeceras de identidad que inyecta una puerta de enlace | Bajo | **Solo** si nada llega a los servicios sin pasar por esa puerta |
| Token firmado, validado por firma y vencimiento en cada servicio, sin consultar a un servidor central | Medio | Servicios que pueden estar dormidos o caídos; sin revocación inmediata |
| Sesiones o validación central en cada llamada | Medio | Cuando revocar al instante importa más que la independencia |
| Identidad de sistema para tareas y credencial de servicio entre servicios | Medio | Llamadas de proceso a proceso |
| Delegar la autenticación a un proveedor de identidad | Bajo-medio | Usuarios externos y no hay motivo para custodiar contraseñas |

## Cómo se comprueba
- Pruebas de toda la cadena de seguridad (ruta protegida sin credencial, credencial vencida, firma inválida, rol insuficiente), no solo del componente que resuelve la identidad.
- Una prueba de que una cabecera falsificada no concede identidad cuando no hay puerta de enlace.
- Una prueba de la propagación de contexto en llamadas salientes y de que una llamada de sistema se distingue de la de persona.
- Autorización por valor verificado (pertenencia a una lista, rol firmado), no por la presencia de una cabecera.
- Una prueba de que el perfil de desarrollo que permite todo no se activa fuera de local.

## Cómo suele resolverse
Con una única entrada pública que comprueba el token del proveedor de identidad, los servicios internos toman la identidad de las cabeceras que esa entrada añade, sin sesión propia. El cliente HTTP reenvía el contexto en cada salto y los procesos sin petición de persona actúan con una identidad de sistema. Una variante, usada en un caso público (esg-trazabilidad), es un token firmado de vida corta que cada servicio comprueba por firma y vencimiento sin consultar al emisor, con la falta de revocación inmediata aceptada por escrito; las acciones administrativas sí consultan la base.

## Anti-patrones frecuentes
- **Confiar en cabeceras de identidad sin puerta de enlace que las garantice** en un servicio expuesto: cualquiera las falsifica.
- Sin defensa en profundidad: nadie comprueba credenciales dentro de la red interna y las llamadas entre servicios no llevan ninguna.
- Autorizar por la presencia de una cabecera y no por su valor.
- Un perfil de desarrollo que permite todo y que puede llegar a producción.
- Comparar secretos o firmas con una comparación no constante.
- Sesión sin vencimiento y sin límite de intentos en el acceso o en la recuperación de contraseña.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** Spring Security como servidor de recursos con validación de token por firma (`spring-security-oauth2-resource-server`, `JwtDecoder`; con Boot basta `spring.security.oauth2.resourceserver.jwt.issuer-uri`); un filtro de cabeceras solo detrás de una puerta de enlace. Verificado el 2026-10-23 ([Spring Security](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html)): el servidor de recursos JWT y sus nombres. No verificado: configuración exacta por versión de Boot.
- **.NET:** Autenticación con portador de token (`AddAuthentication("Bearer").AddJwtBearer()`) y políticas de autorización (`RequireAuthorization` con `RequireClaim`). Verificado el 2026-10-23 ([ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/jwt-authn)): el uso de `AddJwtBearer` y la autorización por reclamo, con el paquete `Microsoft.AspNetCore.Authentication.JwtBearer`. No verificado: opciones de validación por versión.
- **Node:** validación de token firmado en un middleware (biblioteca de JOSE o la del framework); límites de intentos. No verificado: biblioteca preferida.
- **Python:** dependencias de seguridad del framework (FastAPI) o Django con tokens; validación de firma con una biblioteca JOSE. No verificado.

## ADR de ejemplo
- [Sesión sin estado y sin revocación inmediata](../ejemplos-adr/sesion-sin-estado-sin-revocacion.md)
