# Cuenta y registro sin SMS, y comprobación de la instalación

## Problema
Hace falta saber que quien vuelve es la misma persona, o frenar que alguien cree cuentas en masa para repetir una prueba gratuita o saltarse una sanción, sin pagar mensajes de texto ni pedir permisos que la tienda restringe. Aparece con cuentas, periodos de prueba, sanciones o cualquier recurso que se pueda abusar repitiendo instalaciones.

## Señales de que aplica
- Algo central depende de reconocer a la persona entre equipos o reinstalaciones.
- Crear una cuenta nueva da algo de valor: una prueba, un cupo, una voz sin sanción.
- El servidor recibe peticiones que conviene distinguir de las de una app modificada o automatizada.

## Señales de que sobra
- La app funciona sin identificar a nadie y nada se gana repitiendo la instalación.
- Es un grupo cerrado de personas conocidas que se dan de alta a mano.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: sin cuentas | Ninguno; no hay datos entre equipos | Nada central lo exige |
| Identidad de un proveedor o llaves de acceso con Credential Manager (API de Jetpack) | Bajo-medio: verificación en el servidor y eliminación de cuenta | Hace falta cuenta y no se quiere gestionar contraseñas |
| Enlace o código por correo | Bajo-medio: entrega de correo y caducidad | Se acepta una dirección como identidad |
| Veredictos de integridad evaluados por el servidor, como una señal más | Medio: cupo, caídas, falsos rechazos | Hay abuso medido que las cuentas no frenan |
| Verificación por teléfono | Medio-alto: un servicio que verifique, de costo no comprobado; los permisos restringidos solo hacen falta si se leen SMS o llamadas, y hay API sin ellos | El número es parte del negocio y alguien asume su costo |

## Cómo se comprueba
- Pruebas del servidor: una credencial inválida, caducada o de otra app se rechaza.
- Una prueba de reinstalación y de cambio de equipo: la persona recupera su cuenta y no obtiene otra prueba gratuita con la misma.
- Una prueba con el veredicto de integridad ausente, negativo o repetido: la respuesta es la graduada que se decidió, nunca un cierre sin explicación.
- Antes de imponer nada, un periodo midiendo qué veredictos devuelven los usuarios reales.
- La eliminación de cuenta probada desde la app y desde la web.

## Cómo suele resolverse
Se empieza sin cuenta y se añade cuando algo la exige. La identidad la verifica el servidor, nunca la app. Los controles contra el abuso van de lo barato a lo caro: límites por cuenta y por ritmo en el servidor, después identidad de proveedor y, solo con abuso medido, veredictos de integridad que cambian lo que se permite en vez de bloquear sin más. No se usan identificadores de hardware para reconocer a nadie, y se acepta por escrito cuánto abuso queda posible.

## Anti-patrones frecuentes
- Reconocer a la persona por un identificador del equipo.
- Comprobar el veredicto de integridad dentro de la app.
- Bloquear a todo el que no tenga el veredicto más estricto.
- Pedir permisos de SMS o de llamadas para leer un código.
- Guardar el veredicto y reutilizarlo.
- Prometer que nadie podrá repetir la prueba gratuita.

## Hechos en que se apoya
- [P-CTA-1]: Credential Manager y sus mecanismos.
- [P-CTA-2]: permisos de SMS y de llamadas restringidos, alternativas sin permisos sensibles y cambio anunciado.
- [P-CTA-3], [P-CTA-4]: qué aporta la comprobación de integridad, su cupo y cómo usarla.
- [P-CTA-5]: qué identificadores usar y cuáles no.
- [P-PRI-5]: con cuentas, eliminación dentro de la app y en la web.
- [P-RT-9]: el identificador de instalación y su conservación.
- No verificado [P-CTA-6]: veredictos en equipos sin los servicios de Google y cuántas personas quedarían fuera.
- No verificado [P-CTA-7]: cuánto cuesta verificar un número de teléfono.

## Requisitos de referencia
R4 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
- [El acceso lo decide el servidor](../ejemplos-adr-m/acceso-decidido-en-el-servidor.md)
