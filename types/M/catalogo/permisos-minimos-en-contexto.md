# Permisos mínimos y en contexto, con la app útil si se niegan

## Problema
La app necesita algo que el sistema protege y quien la usa puede decir que no, decirlo solo por esta vez, quitarlo después o perderlo sin hacer nada. Aparece en cuanto una función pide ubicación, cámara, notificaciones, contactos o cualquier dato sensible. Pedir de más, o pedir al arrancar, hace que la respuesta sea no y que la tienda pregunte por qué.

## Señales de que aplica
- El manifiesto declara, o una biblioteca añade, un permiso que se concede en ejecución.
- Alguna pantalla deja de funcionar si la respuesta es no.
- La tienda pide declarar o justificar alguno de esos permisos.

## Señales de que sobra
- La app no declara permisos y ninguna biblioteca los añade (se comprueba en el paquete compilado).
- Lo que se necesita se obtiene delegando en el sistema, que no exige pedir nada.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: no usar la función que pide el permiso | Ninguno; la función no existe | No es central y nadie la ha pedido |
| Delegar en el sistema (su cámara, su selector de fotos) | Bajo | Basta con un resultado puntual |
| Pedir la versión más limitada, en el momento de usarla, con explicación previa y camino sin permiso | Medio: estados de concedido, parcial y negado en cada pantalla | La función lo necesita de verdad |
| Pedir el alcance amplio (en segundo plano, preciso, permanente) | Alto: declaraciones, revisión de la tienda y desconfianza | La función central no existe sin él y está escrito por qué |

## Cómo se comprueba
- Una tabla por permiso: qué función lo pide, cuándo, qué se ve si se niega, si se concede a medias, si es solo por esta vez y si se retira desde los ajustes.
- Una prueba de cada pantalla con el permiso negado: se usa, o dice qué no está disponible, sin bloquear el resto ni insistir.
- Una prueba de denegación permanente: la app no cuenta con un diálogo que ya no aparecerá y dice qué no está disponible cuando la persona vuelve a pedir la función, sin empujarla a los ajustes para que cambie de opinión.
- Una prueba tras una larga inactividad o tras restablecer permisos: la app vuelve a comprobar antes de actuar.
- Revisión de los permisos del paquete final, incluidos los que añaden las bibliotecas, contra la tabla.

## Cómo suele resolverse
Cada permiso se pide cuando la persona toca la función que lo necesita, con una frase propia que dice qué dato y para qué. La respuesta se consulta cada vez que se va a usar, no se guarda como verdad. La negativa produce un estado diseñado, no un error: se muestra lo que sigue funcionando y lo que no, y se respeta la decisión. Los alcances amplios llegan después y por separado, solo si la función central los exige, y su declaración para la tienda se escribe antes de construirlos.

## Anti-patrones frecuentes
- Pedir todos los permisos en la primera pantalla.
- Cerrar o bloquear la app si se niega uno que no es central.
- Guardar «ya concedido» y fallar cuando el sistema lo retira.
- Repetir el diálogo o los avisos hasta que la persona ceda.
- Mandar a los ajustes para convencer a quien ya dijo que no.
- Añadir una biblioteca sin mirar qué permisos trae.
- Pedir ubicación precisa o en segundo plano porque quizá haga falta más adelante.

## Hechos en que se apoya
- [P-PER-3]: pedir en contexto y degradar con elegancia.
- [P-PER-2]: casos en los que se evita pedir permiso.
- [P-PER-5]: denegación permanente, cambios sin acción de la persona, cuándo explicar y cómo respetar la negativa.
- [P-PER-6]: conceder solo por esta vez y cuánto dura ese acceso.
- [P-UBI-10]: las geocercas arrastran el permiso de segundo plano.
- [P-PER-1], [P-PER-4]: las notificaciones piden permiso y la persona puede descartar las permanentes.
- [P-UBI-1], [P-UBI-3]: la ubicación puede quedarse en aproximada y la de segundo plano va aparte.
- [P-TRA-4]: la hibernación restablece permisos.
- [P-UBI-5]: la tienda exige declaración y aviso para la ubicación en segundo plano.
- [P-CTA-2]: permisos de SMS y de llamadas reservados.

## Requisitos de referencia
R6 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
- [Primer plano antes que segundo plano](../ejemplos-adr-m/primer-plano-antes-que-segundo-plano.md)
