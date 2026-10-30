---
name: evaluar-viabilidad
description: Puerta cero antes de diseñar un sistema con servicios o una herramienta de sistemas (tipo C, con puerta de uso responsable). Lista las dependencias externas de la idea (datos, APIs, accesos, convenios, licencias, costos, legalidad), exige evidencia de acceso para cada una crítica y emite un veredicto GO, GO-CONDICIONADO, REDISEÑO o NO-GO en DECISION-VIABILIDAD.md. Úsala al empezar un proyecto o cuando una idea gane una dependencia externa nueva, antes de elegir stack o escribir código.
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
3. Solo con GO o GO-CONDICIONADO sigues con `elegir-stack-proporcional` (en el tipo C, solo con GO: ver la sección 7).

## 7. Rama del tipo C (herramientas y software de sistemas)
**Solo aplica a proyectos del tipo C (herramientas y software de sistemas), que se instala con esqueletos de Go, Python y Rust y con su propio catálogo.** Aplica cuando el entregable es un binario o paquete instalable: una CLI, un daemon, una librería, un proxy, un servidor de protocolo o un gestor de procesos. Haz primero las secciones 1 a 6 para lo externo (acceso con evidencia, plan B) y añade esto. Los veredictos del tipo C son tres: **GO**, **REDISEÑO** y **NO-GO**; no hay GO-CONDICIONADO, porque un permiso o una autorización pendientes no se «verifican después». Salida: `DECISION-VIABILIDAD.md` más la sección del tipo C de `kit/plantillas/VIABILIDAD-TIPO-C.md`.

### 7.1 Puerta de uso responsable (va antes que todo lo demás)
Responde por escrito: ¿cuál es la **función principal**?, ¿**quién** lo usa?, ¿**sobre qué sistemas** tiene autorización quien lo usa?
- **Atacar, escanear o explotar sistemas de terceros sin un uso defensivo claro: NO-GO, sin excepciones.** No se evalúan los demás ejes, no se propone «reformularlo» y no se escribe nada de la herramienta. No existe un tipo D que la acoja: lo ofensivo queda fuera del kit.
- **Defensiva o de doble uso:** se construye bajo el tipo C solo si el documento declara (a) quién la usa, (b) sobre qué sistemas tiene autorización —propios, de su organización o con autorización escrita— y (c) qué puede hacer a sistemas ajenos si alguien la apunta mal. Valores por defecto seguros: **lista explícita de objetivos permitidos** (vacía por defecto: sin objetivo declarado no actúa), **registro de actividad** y **modo de solo lectura** si existe (y entonces es el predeterminado). Falta alguna declaración o algún valor por defecto → REDISEÑO.
- Ni los documentos de esta evaluación ni el catálogo, los ejemplos o los ADR describen técnicas de ataque ni cargas útiles: se habla de la función, del permiso y del efecto, no del cómo.

### 7.2 Ejes de evidencia
| Eje | Pregunta | Evidencia que se anota |
|---|---|---|
| Plataformas objetivo | ¿En qué sistemas operativos y arquitecturas debe funcionar? | Por cada una, cómo se verifica que funciona (ejecución real de las pruebas en esa plataforma; compilar para ella no basta). Las que no se pueden verificar se declaran «sin verificar», con fecha. |
| Privilegios y radio de daño | ¿Qué permisos pide (administrador o root, capacidades del sistema, pertenencia a grupos, acceso al socket de control de un runtime de contenedores, captura global de teclado o de pantalla, puertos reservados)? ¿Qué pasaría si alguien tomara el control del proceso? | El mínimo necesario y por qué; el radio de daño en una frase («lee un directorio», «controla el equipo entero»). El acceso al socket de control de un runtime de contenedores, o pertenecer a un grupo equivalente a administrador, **es control total del equipo**: REDISEÑO salvo que se demuestre que no hay alternativa y se acote (usuario dedicado, modo sin privilegios del runtime, intermediario de solo lectura). |
| Modelo de amenazas de la entrada | ¿Qué recibe (argumentos, archivos, red, entrada estándar, variables de entorno, extensiones) y de quién (el propio usuario, la red local, internet)? | Qué se confía y qué no, qué se valida en el borde, límites de tamaño, de tiempo y de rutas; escucha solo en la interfaz local por defecto. Sin modelo escrito: REDISEÑO. |
| Distribución y actualización | ¿Cómo llega al usuario y cómo sabe este que lo recibido es lo publicado? ¿Cómo se actualiza y cómo se retira? | Canal de distribución, sumas o firmas publicadas por un canal distinto al del binario, cómo se actualiza (por el gestor del usuario o a mano; un actualizador propio es algo que «no se construye todavía») y qué hace el instalador con permisos elevados. Un script que se descarga y se ejecuta a ciegas no es una vía aceptable como única. |
| Acceso a lo externo | ¿Depende de servicios, protocolos, bibliotecas o datos de terceros? | La misma evidencia de las secciones 1 y 2: sondeo real, términos leídos, credencial o camino concreto. Una biblioteca sin licencia detectada no se copia ni se vendoriza. |
| Mantenimiento | ¿Quién lo mantiene y por cuánto tiempo? | Responsable con nombre o rol, horizonte («demostración de un mes», «tres años»), qué pasa cuando deja de mantenerse (aviso de fin de soporte, relevo) y quién atiende un parche de seguridad. Un binario que vive años sin dueño es un riesgo para quien lo instale. |

### 7.3 Veredicto del tipo C
| Veredicto | Cuándo |
|---|---|
| **GO** | La puerta de uso responsable superada, cada eje con evidencia y los privilegios mínimos justificados. |
| **REDISEÑO** | La puerta superada, pero falta una declaración o un valor por defecto seguro; o los privilegios son excesivos y existe una alternativa menor; o falta el modelo de amenazas, el canal de integridad o el responsable. Se rediseña con el humano antes de construir. |
| **NO-GO** | La función principal es ofensiva sin uso defensivo claro (sin excepciones); o el privilegio total es imprescindible, no se puede acotar y no hay alternativa que conserve el valor. |

En NO-GO, o en REDISEÑO sin aprobar, te detienes (sección 3). Ejemplos abstractos de los tres veredictos: `kit/ejemplos-viabilidad-c/` (se instala con el tipo C; en el kit: `types/C/ejemplos-viabilidad/`).

## Caso de estudio (público, abstracto): esg-trazabilidad
Idea: un certificado de cumplimiento ambiental para empresas, que cruzaba registros propios con una cifra por empresa publicada en una plataforma estatal de reporte.

Lo que se descubrió tarde: la cifra por empresa solo existe detrás de la cuenta de cada empresa en esa plataforma; no hay una interfaz pública para terceros que la dé, y una integración real exigiría un convenio con la entidad. Lo único público eran recuentos agregados por distrito, que describen la zona y no a la empresa.

Consecuencia: el producto se construyó igual, con la cifra **declarada a mano** por el operador y etiquetada así en pantallas, PDF y CSV. Funciona y es honesto, pero el valor cambió: de «dato verificado» a «dato declarado». Con la puerta cero, el sondeo de los endpoints públicos (agregados por distrito, no por empresa), la lectura de los términos y la pregunta por el convenio habrían dado **REDISEÑO o NO-GO el primer día**: decidir entonces, con el negocio ya organizado, si la idea valía con un dato declarado, si se negociaba el convenio antes de construir, o si se descartaba.

Qué quedó bien resuelto después y sirve de patrón: el último dato bueno guardado con su año, el alta marcada como «no verificada» cuando el tercero no responde, ningún bloqueo por el tercero y las etiquetas «declarado» en todas las salidas. Ejemplos en `kit/ejemplos-adr/`.
