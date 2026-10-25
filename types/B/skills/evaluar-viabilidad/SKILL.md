---
name: evaluar-viabilidad
description: Puerta cero antes de diseñar un sistema con servicios. Lista las dependencias externas de la idea (datos, APIs, accesos, convenios, licencias, costos, legalidad), exige evidencia de acceso para cada una crítica y emite un veredicto GO, GO-CONDICIONADO, REDISEÑO o NO-GO en DECISION-VIABILIDAD.md. Úsala al empezar un proyecto o cuando una idea gane una dependencia externa nueva, antes de elegir stack o escribir código.
---

Antes de diseñar, comprueba que el mundo permite construir la idea. Esta skill no pregunta por el negocio (ya está organizado): pregunta si **los accesos que el negocio necesita existen de verdad**. Una idea que depende de un dato que nadie puede obtener es una idea que se descarta o se rediseña **antes** de escribir una línea, no después.

Salida obligatoria: `DECISION-VIABILIDAD.md` (parte de `kit/plantillas/DECISION-VIABILIDAD.md`).

## 1. Inventario de dependencias externas
Recorre el brief y lista **todo lo que el sistema necesita y no controla**:

| Tipo | Ejemplos de lo que se pregunta |
|---|---|
| Datos | ¿Quién los tiene? ¿A qué nivel de detalle (agregado, por cliente, por registro)? ¿Con qué frecuencia cambian? |
| APIs y servicios | ¿Existe un endpoint documentado? ¿Es estable? ¿Cuotas, latencia, disponibilidad? |
| Accesos y credenciales | ¿Hace falta una cuenta, una aprobación, un contrato? ¿Quién la pide y cuánto tarda? |
| Convenios | ¿Hace falta un acuerdo con una entidad? ¿Quién lo firma? |
| Licencias y términos de uso | ¿Se permite este uso, esta redistribución, este volumen? |
| Costos | ¿Plan gratuito suficiente? ¿Qué pasa al superar la cuota? ¿Hace falta tarjeta? |
| Legalidad y datos personales | ¿Se pueden tratar estos datos? ¿Con qué base? ¿Dónde pueden almacenarse? |
| Plataforma | ¿Los servicios gratuitos se duermen? ¿Hay límites de correo, de conexiones, de almacenamiento? |

Clasifica cada una: **crítica** (sin ella el valor del negocio no existe), **importante** (sin ella el valor baja pero existe) o **accesoria**.

## 2. Evidencia de acceso (no suposiciones)
Para cada dependencia **crítica** hace falta evidencia anotada, con fecha:

- **Sondeo real** del endpoint o del dato: una petición de solo lectura, con tiempo máximo y sin credenciales ajenas, y qué devolvió (forma de la respuesta, nivel de detalle, unidad, año o frescura). Sin secretos en lo que anotes.
- **Términos de uso leídos**: qué permiten y qué no (uso, cuota, redistribución, automatización).
- **Credencial obtenida** (que existe, nunca su valor) o **camino concreto** para obtenerla: pasos, responsable, plazo y costo.

No es evidencia: «debería haber una API», documentación sin sondeo, lo que hace otra empresa, una captura antigua, un ejemplo de un foro, «seguro nos lo dan».

Un sondeo respeta los límites de siempre: una petición, `timeout`, solo lectura, nada detrás de la cuenta de otra persona, nada que esquive un control de acceso. Si para saber hay que saltarse una barrera, la respuesta es «sin acceso verificado».

**Sondeo automatizado.** Para las dependencias técnicas, el proyecto trae `scripts/sondeo-acceso.mjs`: lee `ops/dependencias.json` (url, método GET o HEAD, qué se espera, si requiere credencial; nunca credenciales) y escribe un **borrador** de evidencias para `DECISION-VIABILIDAD.md` con estado HTTP, latencia, tipo de contenido, forma de la respuesta, si exige autenticación y si responde desde la red de quien lo ejecuta. Solo corre si la ficha lo permite (`ops.sondeoAcceso.permitida: true`; pídeselo al humano una vez) y con `timeout`. **NO verifica términos de uso ni legalidad**: eso se lee a mano; un sondeo correcto no es un GO.

Pregúntate también por el **nivel de detalle**: un dato agregado por zona no sustituye a un dato por cliente. Si el valor del negocio exige el segundo, el primero no cuenta como acceso.

## 3. Criterio de descarte
| Veredicto | Cuándo |
|---|---|
| **GO** | Todas las críticas con acceso verificado y plan B para las importantes. |
| **GO-CONDICIONADO** | Críticas verificadas; falta evidencia de alguna importante, con plan B y una fecha para verificarla. |
| **REDISEÑO** | Una crítica sin acceso verificado, pero existe una alternativa que conserva el valor del negocio (otra fuente, otro alcance, dato declarado y etiquetado si el cliente lo acepta como valor). |
| **NO-GO** | Una crítica sin acceso verificado **y** sin alternativa que conserve el valor. |

Prueba de «conserva el valor»: ¿el cliente que iba a usar o pagar el producto lo seguiría usando con la alternativa? Si el valor prometido era un dato verificado y la alternativa es un dato escrito a mano, el valor cambió: eso lo decide el humano, no tú.

**En NO-GO, o en REDISEÑO sin aprobar, te detienes y no construyes nada.** Es una parada legítima (decisión de negocio fuera del brief): «Hay que parar: la dependencia X es crítica y no tiene acceso verificado, porque Y». Entrega el `DECISION-VIABILIDAD.md` con las alternativas y el costo de cada una. Un veredicto desfavorable temprano es el resultado útil de esta skill, no un fracaso.

## 4. Plan B por dependencia
Para cada dependencia crítica o importante, escribe qué pasa si **cae, se agota la cuota, cambia sus términos o desaparece**, qué se degrada y quién decide. Un plan B sin dueño no es un plan.

## 5. Degradar con elegancia
Cuando algo externo falle, el sistema sigue sirviendo. Escalera de degradación, de mejor a peor:

1. **Dato fresco** del tercero.
2. **Último dato bueno** guardado, con su fecha visible («datos de tal fecha»).
3. **Dato declarado** por una persona, **etiquetado como declarado** en pantallas, documentos y exportaciones, nunca presentado como verificado.
4. **«No disponible»** dicho con claridad y con el siguiente paso.

Reglas:
- **Ninguna pantalla se bloquea por un tercero.** Una caída externa nunca impide ver lo que ya se tiene ni registrar lo que no depende de ella.
- La consulta externa va **fuera** de la transacción, con tiempos cortos, y cada respuesta útil se guarda como último dato bueno.
- Lo que se congela en un documento al emitirlo **no se vuelve a consultar** al reexportar.
- Un dato escrito a mano y otro verificado son estados distintos (ver la ficha `declarado-vs-verificado` del catálogo); no se mezclan en un solo campo.
- Una escritura sin respuesta no se reintenta sola si puede duplicar un efecto: se dice «no se sabe si se aplicó» y cómo comprobarlo.
- Las pruebas usan respuestas grabadas; la integración continua nunca llama al servicio real.

## 6. Cierre
1. Rellena `DECISION-VIABILIDAD.md`: veredicto, dependencias con su evidencia y fecha, riesgos y plan B por dependencia.
2. La evidencia envejece: anota cuándo caduca y reverifica antes de construir si ha pasado tiempo, si cambia el alcance o si aparece una dependencia nueva.
3. Solo con GO o GO-CONDICIONADO sigues con `elegir-stack-proporcional`.

## Caso de estudio (público, abstracto): esg-trazabilidad
Idea: un certificado de cumplimiento ambiental para empresas, que cruzaba registros propios con una cifra por empresa publicada en una plataforma estatal de reporte.

Lo que se descubrió tarde: la cifra por empresa solo existe detrás de la cuenta de cada empresa en esa plataforma; no hay una interfaz pública para terceros que la dé, y una integración real exigiría un convenio con la entidad. Lo único público eran recuentos agregados por distrito, que describen la zona y no a la empresa.

Consecuencia: el producto se construyó igual, con la cifra **declarada a mano** por el operador y etiquetada así en pantallas, PDF y CSV. Funciona y es honesto, pero el valor cambió: de «dato verificado» a «dato declarado». Con la puerta cero, el sondeo de los endpoints públicos (agregados por distrito, no por empresa), la lectura de los términos y la pregunta por el convenio habrían dado **REDISEÑO o NO-GO el primer día**: decidir entonces, con el negocio ya organizado, si la idea valía con un dato declarado, si se negociaba el convenio antes de construir, o si se descartaba.

Qué quedó bien resuelto después y sirve de patrón: el último dato bueno guardado con su año, el alta marcada como «no verificada» cuando el tercero no responde, ningún bloqueo por el tercero y las etiquetas «declarado» en todas las salidas. Ejemplos en `kit/ejemplos-adr/`.
