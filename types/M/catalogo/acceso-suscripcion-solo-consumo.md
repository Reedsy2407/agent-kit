# Acceso, suscripción y modo «solo consumo»

## Problema
Parte de la app depende de tener derecho a usarla: una prueba, un plan, un bloqueo. Si la app lo decide, se puede engañar; si además vende o señala dónde pagar fuera de la tienda, incumple sus reglas. Aparece en cuanto algo no es para todo el mundo.

## Señales de que aplica
- Hay una prueba gratuita, un plan de pago o una cuenta que se puede bloquear.
- El mismo acceso se compra o se gestiona fuera de la app.
- Algún dato solo debe llegar a quien tiene acceso.

## Señales de que sobra
- Todo es gratuito y para cualquiera.
- Todavía no hay decisión de negocio sobre cobrar: no se construye por adelantado.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: todo abierto | Ninguno | No hay nada que cobrar ni restringir |
| Solo consumo: el servidor decide el acceso y la app no vende ni conduce a otro pago | Medio: estados, textos revisados y caducidad sin red | El cobro vive fuera y la política lo permite |
| Cobro con la facturación de la tienda | Alto: integración, verificación en el servidor, cancelación y comisión | Se vende dentro de la app |
| Programas de facturación alternativa o enlaces externos | Alto: inscripción, comisiones y países concretos | El negocio los necesita y se revisó la política vigente |

## Cómo se comprueba
- Pruebas del servidor para cada estado (en prueba, activo, vencido, bloqueado) y para cada transición.
- Una prueba de reinstalación: la prueba gratuita sigue atada a la cuenta.
- La app con el reloj cambiado, o sin red más allá de la caducidad, no gana acceso.
- Una petición de un recurso reservado sin acceso recibe el rechazo del servidor, aunque la app esté sin actualizar.
- Revisión de todas las pantallas, mensajes y la ficha de la tienda en busca de precios, enlaces o botones de compra, releyendo la política.
- La pantalla de bloqueo permite llegar a la cuenta, la privacidad y la eliminación.

## Cómo suele resolverse
El servidor es la única fuente de verdad del acceso y comprueba cada petición de algo reservado. La app consulta, muestra el estado y guarda el último conocido con caducidad. En modo solo consumo, la pantalla de bloqueo dice qué pasa sin ofrecer compra ni enlaces, y lo reservado no viaja por canales a los que cualquiera puede suscribirse. Los datos de negocio (duración, planes, precios) los pone el humano: no se inventan.

## Anti-patrones frecuentes
- Una bandera local de «tiene plan» que desbloquea.
- Esconder botones y dejar el recurso abierto en el servidor.
- «Contrata en nuestra web» con un enlace, en un modo que no lo permite.
- Contar la prueba por instalación.
- Bloquear sin explicar ni dejar eliminar la cuenta.
- Copiar de otra app una forma de cobro sin leer la política.

## Hechos en que se apoya
- [P-PAG-1], [P-PAG-2]: facturación de la tienda y prohibición de conducir a otro pago.
- [P-PAG-3], [P-PAG-4]: qué es solo consumo y a qué se puede enlazar.
- [P-PAG-5]: programas alternativos para países concretos.
- [P-PAG-6]: lo que exige una suscripción.
- [P-PRI-5]: eliminación de cuenta.
- [P-RT-3]: cualquier app puede suscribirse a un grupo de mensajería, así que no controla el acceso.
- [P-RED-1]: el reloj de pared puede saltar; los intervalos se miden con el monótono.
- No verificado [P-RT-8]: si el servidor puede impedir que un equipo dado de baja vuelva a suscribirse.
- No verificado [P-PAG-7]: qué obligaciones de suscripción alcanzan a una app solo de consumo.

## Requisitos de referencia
R4 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
- [El acceso lo decide el servidor](../ejemplos-adr-m/acceso-decidido-en-el-servidor.md)
