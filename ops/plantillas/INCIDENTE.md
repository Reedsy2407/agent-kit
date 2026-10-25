# Incidente — {{proyecto}}

Copia este archivo a `ops/incidentes/AAAA-MM-DD-titulo.md` (uno por incidente). Hechos, con hora, sin culpar a personas.

Fecha: {{fecha}}. Gravedad: baja / media / alta. Estado: abierto / mitigado / cerrado.

## Detección
Qué se vio, quién o qué lo detectó (comprobación de salud, un usuario, una alerta) y a qué hora. Cuánto pasó desde que empezó hasta que se vio.

## Mitigación
Qué se hizo para parar el daño, en orden y con hora. Lo más reversible primero. Quién autorizó lo irreversible, si lo hubo.

## Causa
Qué falló de verdad (no el síntoma) y por qué no se detectó antes. Si no se sabe aún, se dice «causa no confirmada» y qué falta para confirmarla.

## Aprendizaje
Qué cambia para que no se repita: una prueba nueva, una línea del runbook, una alerta, una regla del kit. Cada punto con responsable y fecha. Un aprendizaje sin acción asociada no cuenta.

## Impacto
Quiénes lo notaron, durante cuánto tiempo, si hubo datos perdidos o expuestos (en ese caso: `ROTACION-SECRETOS.md` y avisar a quien corresponda).
