# ADR de ejemplo. Las sanciones las hace cumplir el servidor

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Las personas publican aportes que otras ven. Hay denuncias, bloqueos y sanciones, y conviven versiones antiguas de la app. Ficha: `kit/catalogo-m/contenido-usuarios-moderacion.md`.

## Decisión
Toda medida se guarda y se hace cumplir en el servidor: quien está sancionado recibe el rechazo al publicar, y lo bloqueado no se entrega a quien bloqueó. La app muestra el estado y el motivo. Cada medida queda registrada con quién la tomó y admite reclamo. Quien modera y en cuánto tiempo lo define el humano; sin esa persona, la función de aportar no se publica.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Ocultar en la app | Una versión antigua o modificada lo ignora | La sanción no existe |
| Dar de baja de un grupo de avisos | No está comprobado que impida volver a suscribirse | Sanción que se salta |
| Sancionar solo de forma automática por número de denuncias | Permite callar a alguien en masa | Abuso de la propia moderación |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Filtros automáticos previos | El volumen supera a quien modera |

## Consecuencias
Más trabajo en el servidor y una cola que alguien atiende. Las pruebas usan dos cuentas y una denuncia de punta a punta.

## Señal para revisar
Denuncias sin atender en el plazo decidido, o reclamos que muestren medidas equivocadas.
