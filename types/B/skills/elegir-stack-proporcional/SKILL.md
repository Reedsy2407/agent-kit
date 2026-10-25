---
name: elegir-stack-proporcional
description: Elige la tecnología y la arquitectura de un sistema con servicios en proporción al problema, con al menos dos alternativas reales (una la más simple posible), criterios explícitos y un ADR con lo descartado. Incluye el protocolo de cuestionar un encargo que lleve a una mala elección. Úsala tras un veredicto de viabilidad favorable y antes de escribir código, y cada vez que una decisión técnica grande aparezca.
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
