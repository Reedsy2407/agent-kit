# ADR de ejemplo. Si el servicio que verifica no responde, el alta se registra como no verificada

Ejemplo breve y abstracto, tomado del caso público esg-trazabilidad. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
El nombre legal de una empresa se obtiene de una consulta a un registro oficial por su identificador fiscal. Ese proveedor puede no responder (caída, cuota agotada, red) y el personal tiene que poder registrar la empresa igual. Dependencia **importante** con plan B. Ficha: `kit/catalogo/declarado-vs-verificado.md`.

## Decisión
- Un camino de alta aparte recibe el nombre escrito a mano y guarda la empresa como **no verificada**.
- Antes de aceptarlo, el servidor vuelve a consultar al proveedor: si responde, rechaza el respaldo y hay que usar el registro normal. Nadie se salta la consulta solo porque lo diga.
- Una empresa no verificada no puede recibir documentos hasta que «verificar» funcione y reemplace los datos escritos a mano; si el proveedor sigue sin responder o dice que no existe, la empresa no cambia.
- La opción de «ningún proveedor» existe solo para desarrollo y pruebas, y el servicio se niega a arrancar con ella en el ambiente real.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Rechazar el alta mientras el proveedor no responda (la más simple) | Bloquea al personal por una caída ajena | Trabajo parado |
| Aceptar el nombre manual en el registro normal cuando la consulta falle | Mezcla dato verificado y escrito a mano en un solo camino; el cliente podría forzarlo | Datos de origen incierto |

## Consecuencias
Hay dos caminos de alta y el segundo queda marcado y sin documentos hasta verificarse. Una empresa puede quedar así si nadie la verifica; la pantalla lo muestra y ofrece la acción. Se comprueba con pruebas de rechazo del respaldo cuando el proveedor responde y de bloqueo de documentos mientras no esté verificada.

## Señal para revisar
Que el proveedor cambie sus condiciones o se necesite otro de respaldo.
