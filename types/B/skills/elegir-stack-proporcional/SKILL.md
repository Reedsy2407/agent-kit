---
name: elegir-stack-proporcional
description: Elige la tecnología y la arquitectura de un sistema con servicios (o, en el tipo C, el lenguaje de una herramienta entre Go, Rust y Python; en el tipo M, cómo construir una app móvil) en proporción al problema, con al menos dos alternativas reales (una la más simple posible), criterios explícitos y un ADR con lo descartado. Incluye el protocolo de cuestionar un encargo que lleve a una mala elección. Úsala tras un veredicto de viabilidad favorable y antes de escribir código, y cada vez que una decisión técnica grande aparezca.
---

El kit no impone un stack. La tecnología se elige para **este** negocio y **este** tamaño de problema: Java sin framework si basta, .NET sin bandeja de salida si hay algo mejor, un solo proceso y una sola base si eso cumple. Lo que ya se hizo en otros sistemas es **material de consulta** (`kit/catalogo/`), no un molde.

Requisito: `DECISION-VIABILIDAD.md` con GO o GO-CONDICIONADO. Si no existe, empieza por `evaluar-viabilidad`.

## 1. Mide el problema
Anota, con una frase cada uno:

| Criterio | Pregunta |
|---|---|
| Tamaño y vida esperada | ¿Cuántos usuarios y datos hoy y en el plazo que importa? ¿Es una demostración, un piloto o algo que vivirá años? |
| Equipo | ¿Quién lo construye y lo mantiene? ¿Qué sabe ya? ¿Cuánto cuesta aprender algo nuevo? |
| Costo de operar | ¿Cuánto dinero y cuánta atención cuesta tenerlo en pie? ¿Quién lo vigila? |
| Consistencia exigida | ¿Hay dinero, cumplimiento o decisiones irreversibles? ¿O es informativo y tolera atraso? |
| Plazo | ¿Para cuándo hace falta algo útil? ¿Se puede publicar pronto una rebanada? |
| Riesgo | ¿Seguridad, datos personales, regulación, dependencias críticas? |

## 2. Al menos dos alternativas reales
- **Siempre una es la más simple posible** que cumpla los criterios (por ejemplo: un solo servicio con una base de datos, sin intermediario de mensajes, sin capas extra).
- La otra (u otras) es la que el reflejo del stack sugeriría o la más ambiciosa que se considere.
- «Real» significa que una persona razonable podría elegirla. Una alternativa de paja no cuenta.
- Las alternativas incluyen el lenguaje y el framework (o ninguno), la base de datos, el estilo de comunicación entre partes y el modo de despliegue, no solo la arquitectura.
- Consulta `kit/catalogo/` (skill `consultar-catalogo`) para cada problema que aparezca: su ficha incluye siempre la opción «no hacer nada» y sus señales de que **sobra**.

## 3. Regla de proporcionalidad
> La complejidad se paga con una necesidad presente y demostrada, o con una señal medible que ya apareció. Nunca con «por si acaso».

Si la alternativa más simple cumple los criterios **hoy** y su camino de crecimiento existe (se puede añadir lo otro después sin reescribir), se elige y se anota la señal que haría subir de nivel. Si no cumple, se explica qué criterio concreto falla.

## 4. Checklist anti-sobreingeniería
Para cada pieza, di «no todavía» salvo que su señal ya esté presente. Anota en el ADR lo que **no** se construye y su señal.

| Qué NO construir todavía | Señal para construirlo |
|---|---|
| Varios servicios desplegables por separado | Equipos distintos que necesitan desplegar a ritmos distintos, o escalado muy desigual medido, o aislamiento de fallos demostrado |
| Intermediario de mensajes | Un consumidor que no puede ser síncrono, o varios procesos que deben reaccionar a un cambio sin acoplarse |
| Bandeja de salida transaccional | Hay eventos hacia otros procesos y perderlos o duplicarlos tiene costo real |
| Multi-inquilino | Un segundo cliente real con datos que no deben mezclarse |
| Caché | Una medición que muestra que la lectura es el cuello de botella |
| Buscador dedicado | Búsquedas que la base no resuelve (relevancia, sinónimos, volumen) |
| Orquestador de flujos o sagas | Procesos largos con compensaciones que ya no caben en una máquina de estados |
| Separar lectura y escritura, eventos como fuente de verdad | Necesidades de lectura y de escritura que chocan de forma medida |
| Puertas de enlace, balanceadores propios | Más de un servicio expuesto y una necesidad concreta de unificar |
| Abstraer al proveedor | Existe o es inminente un segundo proveedor |
| Capas y puertos para todo | El dominio tiene reglas que merecen aislarse de la infraestructura |
| Orquestadores de contenedores | Más de un servicio operado por un equipo con esa práctica |

Y lo que **nunca** se recorta aunque el problema sea pequeño está en `kit/GUIA-DECISION.md` («qué no recortar nunca»).

## 5. Salida: un ADR
Usa `kit/plantillas/ADR.md`. Debe incluir contexto con los criterios medidos, la decisión, **cada alternativa descartada con el motivo y su costo**, lo que no se construye todavía con su señal, las consecuencias y la señal para revisar la decisión. Un ADR por decisión grande (lenguaje y framework, base de datos, comunicación, despliegue). `kit/ejemplos-adr/` trae ejemplos breves.

## 6. Protocolo de cuestionar el encargo
No sigues instrucciones a ciegas. Si lo que te piden lleva a una elección **peor o desproporcionada** (sobredimensionada, subdimensionada, insegura, costosa de operar o que contradice el brief), lo dices:

1. **Qué dices:** en pocas líneas: qué piden, qué problema ves, una **alternativa** y **su costo** (tiempo, dinero, riesgo) frente a lo pedido.
2. **Con humano presente:** preguntas **una sola vez**, con tu recomendación. Si insiste, haces lo que pide y lo anotas en el ADR como decisión del humano, con el riesgo señalado. La excepción es lo que cruza «qué no recortar nunca» (seguridad, secretos, reglas de negocio, concurrencia): ahí no se cede en silencio; es una parada legítima.
3. **Sin supervisión** (módulo autónomo, nadie contesta): no te detienes. Eliges la opción **más simple que cumple**, la anotas en el ADR como «encargo cuestionado: qué se pidió, qué se hizo y por qué», y sigues. El humano lo revisa al cierre.
4. **Solo dudas técnicas.** No preguntas por el negocio: ya está organizado. Una duda de negocio que aparezca después sí se pregunta, una vez, y se sigue con lo que no dependa de ella.

Cuestionar no es rediseñar: no cambias el alcance del negocio por tu cuenta. Cuestionas la **elección técnica** y dejas constancia.

## 7. Cierre
Resumen en pocas líneas: la decisión, la alternativa más simple y por qué ganó o perdió, lo que no se construye y sus señales. Después sigue `kit/GUIA-DECISION.md`: catálogo → ADRs → rebanadas verticales, desplegando desde la primera rebanada. Si el stack elegido tiene esqueleto (Java/Spring con Maven, .NET, Node o Python), el humano declara `kit.preset` en la ficha y vuelve a correr el instalador (con `--dry-run` antes): el esqueleto trae `/salud`, prueba, contenedor e integración continua ya comprobados; el sello deja de avisar de preset sin verificar.

## 8. Rama del tipo C (herramientas y software de sistemas)
**Solo aplica a proyectos del tipo C (herramientas y software de sistemas), que se instala con esqueletos de Go, Python y Rust y con su propio catálogo.** Requisito: `DECISION-VIABILIDAD.md` del tipo C con **GO** (`evaluar-viabilidad`, sección 7). Las secciones 1 a 7 siguen valiendo; esta rama cambia las alternativas y los criterios, porque el entregable es un binario o paquete instalable y no un servicio desplegado.

- **Mínimo dos alternativas entre Go, Rust y Python, con la más simple primero.** «Más simple» es la que menos cuesta construir, mantener y distribuir *para este problema y este equipo*, no la que se escribe más rápido: se razona en el ADR. Una alternativa de paja no cuenta.
- **Criterios** (una frase con evidencia por cada uno, para cada alternativa):

| Criterio | Pregunta |
|---|---|
| Binario único | ¿El usuario recibe un archivo que funciona sin instalar un intérprete ni dependencias? Si no, ¿cómo se empaqueta y cuánto cuesta que el usuario lo instale? |
| Rendimiento medido | ¿Hay una medición (un prototipo, una carga real) que muestre que la alternativa simple no alcanza? «Será lento» sin medir no es una razón. |
| Seguridad de memoria | ¿El programa procesa entrada no confiable o corre con privilegios? Cuanto mayor el radio de daño del eje de privilegios, más pesa este criterio. |
| Ecosistema | ¿Existen bibliotecas mantenidas y con licencia compatible para los protocolos y las plataformas que exige la viabilidad? |
| Curva de aprendizaje | ¿Quién lo mantiene y cuánto tarda en ser productivo? Una herramienta que solo entiende su autora es un riesgo de mantenimiento. |
| Costo de mantenimiento | ¿Cuánto cuestan las actualizaciones del lenguaje y de las dependencias, la compilación para cada plataforma y los parches de seguridad durante el horizonte declarado? |

- **ADR con lo descartado y por qué** (`kit/plantillas/ADR.md`; ejemplo en `kit/ejemplos-adr-c/` se instala con el tipo C; en el kit: `types/C/ejemplos-adr-c/`): cada alternativa descartada con su motivo y su costo, y la señal para revisar la decisión (por ejemplo, una medición de rendimiento que la simple no cumple).
- **Qué no construir todavía:**

| Qué NO construir todavía | Señal para construirlo |
|---|---|
| Actualizador propio | Los usuarios no pueden actualizar con su gestor de paquetes o a mano, y hay un canal de integridad definido |
| Sistema de extensiones | Una segunda persona distinta del autor necesita añadir comportamiento sin tocar el código |
| Proceso residente (daemon) | Hay estado o eventos que no caben en una ejecución bajo demanda |
| Interfaz de red | Un cliente remoto real que no puede usar la línea de órdenes |
| Soporte de una plataforma no verificada | Un usuario real en esa plataforma y pruebas ejecutándose en ella |
| Código inseguro o llamadas a código nativo ajeno | Una medición o una biblioteca imprescindible que no tiene alternativa segura, aislada en un módulo |
| Criptografía propia | Nunca: se usa una biblioteca revisada y mantenida |

Lo que **nunca** se recorta en el tipo C: validar la entrada en el borde, privilegios mínimos, los valores por defecto seguros de la puerta de uso responsable, secretos fuera de archivos y de argumentos, y registro de la actividad que cambia algo.

## 9. Rama del tipo M (aplicaciones móviles)
**Solo aplica a proyectos del tipo M (aplicaciones móviles, Android primero).** Requisito: `DECISION-VIABILIDAD.md` del tipo M con **GO** (`evaluar-viabilidad`, sección 8). Las secciones 1 a 7 siguen valiendo, también para el servidor propio si lo hay; esta rama cambia las alternativas y los criterios de la app. El catálogo del tipo M está en `kit/catalogo-m/` y se consulta con `consultar-catalogo` (rama del tipo M): donde las secciones anteriores o las plantillas remiten a `kit/catalogo/` y `kit/ejemplos-adr/`, en el tipo M son `kit/catalogo-m/` y `kit/ejemplos-adr-m/`. Solo una de las alternativas, Kotlin con Compose, tiene un esqueleto de partida (`kit/CONTRATO-ESQUELETOS.md`): **que exista no es una razón para elegirla** y no cuenta en la comparación como «más simple». Presenta las alternativas como siempre, elige con los criterios de abajo y deja que decida el humano. Los hechos de cada alternativa están en `kit/PLATAFORMA-ANDROID.md` (en el kit: `types/M/PLATAFORMA-ANDROID.md`); lo «No verificado» se contrasta antes de usarlo como razón.

- **Mínimo dos alternativas entre Kotlin con Compose, React Native con Expo, Flutter y un envoltorio web (Capacitor o PWA), con la más simple primero.** «Más simple» es la que **cumple la viabilidad** con menos piezas que construir y mantener *para este equipo*. Una alternativa que no cumple un requisito imprescindible no es la más simple: está descartada, y se dice por qué.
- **Criterio de equipo pequeño y presupuesto cero:** se prefiere lo que una o dos personas pueden depurar en un equipo real, con una sola base de código, con las menos piezas nativas y bibliotecas de terceros posibles y sin servicios de pago. Si se publica en la tienda, su cuota no cambia con el stack; repartir por otro canal es una alternativa que se decide en la viabilidad (eje h).

| Criterio | Pregunta (una frase con evidencia por alternativa) |
|---|---|
| Requisitos de plataforma | ¿Hace falta seguir en segundo plano, un servicio en primer plano, sensores o integración fina? ¿La alternativa lo da de forma documentada o exige código nativo? |
| Equipo | ¿Qué lenguajes ya domina quien mantiene? ¿Cuántos tendrá que depurar a la vez? |
| Dependencias | ¿De qué bibliotecas de terceros depende lo central y quién las mantiene? |
| Presupuesto cero | ¿Compilar, probar y publicar funciona sin pagar servicios? [P-STK-11] |
| Publicación | ¿Produce el paquete y cumple los requisitos de la tienda (formato, versión de destino, código nativo) [P-PUB-4] [P-PUB-6] [P-PUB-7] [P-PUB-9]? |
| Pruebas y diagnóstico | ¿Se prueba la lógica sin equipo y el segundo plano en uno real? |
| Mantenimiento | ¿Cuánto cuesta seguir las versiones del sistema y del framework? |

| Alternativa | Puede ser la más simple cuando | Se cuestiona cuando | Hechos |
|---|---|---|---|
| Envoltorio web (PWA o Capacitor) | Ya hay una web, la app se usa abierta y no necesita segundo plano | Lo central necesita seguimiento o un servicio persistente en segundo plano, o la app sería la web sin función propia | [P-STK-7] a [P-STK-10] |
| Kotlin con Compose | Solo Android y lo central toca el sistema (segundo plano, permisos, servicios) | Nadie conoce Kotlin y lo central es contenido y formularios que otra alternativa cumple | [P-STK-1], [P-FGS-1] |
| React Native con Expo | El equipo domina JavaScript o TypeScript y los módulos disponibles cubren lo central | Lo central depende de código nativo que habría que escribir y nadie del equipo puede mantener, o de que la ubicación se reanude sola tras terminar la app | [P-STK-2] a [P-STK-4] |
| Flutter | El equipo domina Dart o quiere una interfaz propia, y lo central tiene bibliotecas mantenidas | Lo central depende de código nativo que habría que escribir y mantener además de Dart | [P-STK-5], [P-STK-6] |

Ninguna alternativa impide que el usuario detenga la app entera [P-FGS-8]: una promesa de seguir pase lo que pase no se resuelve eligiendo stack, se cuestiona.

- **Cuestiona el encargo** (protocolo de la sección 6) cuando lleve a una mala elección. Ejemplos: una PWA para algo que debe seguir en segundo plano; una base multiplataforma «por si algún día hay iOS» cuando iOS está fuera; reescribir en otro framework lo que el equipo ya domina; sumar un servicio de pago con presupuesto cero; varios servicios propios para una app pequeña; pedir ubicación en segundo plano cuando basta el primer plano.
- **ADR con lo descartado y por qué** (`kit/plantillas/ADR.md`): cada alternativa descartada con su motivo y su costo, y la señal para revisar la decisión.
- **Qué no construir todavía:**

| Qué NO construir todavía | Señal para construirlo |
|---|---|
| Versión para iOS | Un usuario real que no pueda usar Android y el humano la marque como alcance |
| Ubicación en segundo plano | Una función central que no se cumple con la app visible ni con un servicio que el usuario inicia |
| Muchos módulos y capa de dominio | El tamaño del código o un equipo mayor lo piden [P-ARQ-1] [P-ARQ-4] |
| Cuentas de usuario | Algo central no funciona sin identificar a la persona (traen eliminación de cuenta y datos que declarar) |
| Cobro dentro de la app | El negocio decide vender allí y se revisó la política de pagos |
| Contenido de usuarios | Hay quien lo modere y las funciones de denuncia y bloqueo van en la misma entrega |
| Infraestructura propia de mensajería | La mensajería de la plataforma no cumple una latencia medida |

Lo que **nunca** se recorta en el tipo M está en `kit/GUIA-DECISION.md` («qué no recortar nunca»). Elegir el stack no verifica nada: la ficha llega con `kit.checks` vacío. Solo si el humano eligió Kotlin con Compose y quiere partir del esqueleto, la ficha declara `kit.preset` `java-gradle`, se vuelve a instalar (primero con `--dry-run`) y se regenera `.claude/` desde la ficha, como dice «Esqueleto Android» en `kit/GUIA-DECISION.md` (sin eso el sello sigue sin comprobaciones); el preset está verificado **solo** sobre ese esqueleto y las versiones que registra el kit, y no demuestra nada sobre un proyecto propio. Con cualquier otra alternativa, escribe tus `kit.checks`.
