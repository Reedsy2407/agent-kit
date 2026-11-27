# Almacenamiento local y secretos en el cliente

## Problema
La app guarda cosas en un equipo que no controlas: una sesión, datos personales, una clave de un tercero. El equipo se pierde, se copia, se revende o lo manipula su dueño, y todo lo que viaja dentro del paquete lo puede leer cualquiera. Aparece al recordar el inicio de sesión, al trabajar sin red o al llamar a un servicio externo desde el teléfono.

## Señales de que aplica
- Hay una credencial, un testigo de sesión o datos de personas guardados en el equipo.
- El paquete incluye la clave de algún servicio.
- La app decide algo (acceso, precio, límite) con un valor que vive en el equipo.

## Señales de que sobra
- Solo se guardan preferencias sin valor para nadie más.
- No hay cuentas, claves ni datos personales, y borrar el almacenamiento no cambia nada importante.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: no guardar el dato | Ninguno; la persona lo vuelve a obtener | Se puede pedir al servidor cuando haga falta |
| Almacenamiento interno de la app, con copias y transferencias decididas a propósito | Bajo | Datos propios de la app que no son secretos de alto valor |
| Cifrar con una clave del almacén de claves del sistema | Medio: gestión de la clave y qué pasa si se pierde | Credenciales o datos sensibles que tienen que estar en el equipo |
| Mover el secreto al servidor propio, que llama al tercero | Medio: un servicio que operar | La clave de un tercero no puede ser pública |

## Cómo se comprueba
- Un inventario de lo que se guarda, dónde, si es secreto, si sale en copias y cómo se borra.
- Una búsqueda de secretos en el código, los recursos y el paquete compilado, en cada entrega.
- Una prueba de cierre de sesión y de borrado de cuenta: no queda nada de la persona en el equipo.
- Revisión de las reglas de copia y transferencia, y una restauración en un segundo teléfono si hay datos que deban o no deban viajar.
- Una prueba del servidor: manipular los valores guardados en la app no concede nada.

## Cómo suele resolverse
Se guarda lo mínimo. Lo propio de la app va a su almacenamiento interno y se decide, antes de la primera entrega, qué puede salir en copias o transferencias. Los testigos de sesión se pueden revocar desde el servidor y, si deben quedar en el equipo, se cifran con una clave del almacén del sistema. Una clave de un tercero que da dinero o datos no viaja en la app: la usa el servidor propio. Lo que sí tiene que viajar se trata como público y se limita en el proveedor.

## Anti-patrones frecuentes
- Poner una clave en un recurso, en una constante o en un archivo del paquete y llamarlo oculto.
- Cifrar con una clave que está en el mismo código.
- Adoptar una biblioteca de cifrado obsoleta porque aparece en ejemplos antiguos.
- Escribir testigos o datos personales en el registro.
- Dar por hecho que desactivar la copia de seguridad impide toda transferencia.
- Decidir el acceso con un valor local que la persona puede cambiar.

## Hechos en que se apoya
- [P-ALM-1]: qué protege el almacenamiento interno.
- [P-ALM-2]: qué protege el almacén de claves y qué no.
- [P-ALM-3]: biblioteca de cifrado obsoleta.
- [P-ALM-4]: los secretos escritos en la app se recuperan.
- [P-ALM-5]: el tráfico sin cifrar viene desactivado.
- [P-PRI-6]: copias de seguridad y transferencia entre equipos.
- [P-PUB-5]: las claves de firma y sus contraseñas se guardan en secreto y aparte.
- [P-PRI-5]: eliminar la cuenta borra también sus datos.
- No verificado [P-ALM-6]: cómo restringir una clave de un tercero que viaja en la app.

## Requisitos de referencia
R6 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
- [El acceso lo decide el servidor](../ejemplos-adr-m/acceso-decidido-en-el-servidor.md)
