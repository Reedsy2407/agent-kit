# ADR de ejemplo. La versión mínima la hace cumplir el servidor

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
La app habla con un servidor propio y las versiones instaladas no se actualizan a la vez. Algún cambio futuro no podrá ser compatible. Ficha: `kit/catalogo-m/versiones-compatibilidad-servidor.md`.

## Decisión
Desde la primera versión publicada, cada petición lleva el número de versión de la app. El contrato solo añade. El servidor tiene una versión mínima admitida; por debajo responde con un estado que la app reconoce y muestra como «actualiza», conservando lo que no se había enviado.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Añadir el mecanismo cuando haga falta | La versión que haya que retirar no lo tendrá | Romperla sin explicación |
| Confiar en las actualizaciones automáticas | No está comprobado a cuántos alcanzan ni en qué plazo | Versiones rotas sin aviso |
| Forzar con la función de la tienda y nada más | No está comprobado qué hace fuera de la tienda, y la regla seguiría sin estar en el servidor | Reglas que quizá no se cumplan |
| Mantener todas las versiones para siempre | Costo creciente en el servidor | Un contrato imposible de cambiar |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Varias versiones del contrato en paralelo | Un cliente que no puede actualizar y debe seguir |
| Actualización dentro de la app | Se quiere que la mayoría actualice antes |

## Consecuencias
Una pantalla y una prueba más desde el principio. Retirar algo del servidor exige mirar qué versiones siguen vivas.

## Señal para revisar
Muchas personas bloqueadas por la versión mínima al subirla.
