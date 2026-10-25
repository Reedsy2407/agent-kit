# ADR de ejemplo. La sesión es un token firmado de vida corta, sin estado y sin revocación inmediata

Ejemplo breve y abstracto, tomado del caso público esg-trazabilidad. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Los servicios de un alojamiento gratuito se duermen tras un rato sin tráfico. Si cada llamada tuviera que consultar al servicio de autenticación para saber si un token vale, despertar un servicio exigiría despertar a todos y una caída de ese servicio tumbaría al resto. Todos los usuarios son personal interno. Ficha: `kit/catalogo/autenticacion-entre-servicios.md`.

## Decisión
- El servicio de autenticación emite un token firmado de vida corta que no se renueva.
- Los demás servicios lo validan solo por firma y vencimiento, sin llamar al emisor.
- **No hay revocación inmediata**: es una limitación conocida, escrita y aceptada por el humano.
- Las acciones administrativas son la excepción: consultan la base en cada una.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Sesiones en el servidor o consulta al emisor en cada llamada | Rompe con servicios que duermen | Acoplamiento y caídas en cascada |
| Token de refresco | Más superficie de ataque y más estado para un puñado de cuentas | Complejidad sin beneficio proporcional |
| Vida larga del token | Agranda la ventana de uno robado sin poder revocarlo | Riesgo de seguridad |

## Consecuencias
Tras cambiar una contraseña o desactivar una cuenta, un token ya emitido sigue valiendo hasta que vence; la interfaz lo avisa en esas pantallas. Si algún día se necesita revocación real, hace falta un estado compartido (lista de revocados o sesiones) y los servicios dejarían de validar sin consultar. Se comprueba con pruebas de firma inválida, token vencido y rol insuficiente en la cadena completa.

## Señal para revisar
Usuarios externos, datos más sensibles o un requisito de revocación inmediata.
