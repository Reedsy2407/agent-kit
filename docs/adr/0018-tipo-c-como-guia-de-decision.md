# 0018. Tipo C como guía de decisión: herramientas y software de sistemas

Estado: aceptada (2026-10-29). Complementa los ADR 0006 (tipos con manifiestos) y 0013 (tipo B como guía de decisión).

## Contexto
Los tipos A y B cubren un sitio estático y un sistema con servicios. Falta lo que se entrega como binario o paquete instalable: CLIs, daemons, librerías, proxies, servidores de protocolos y gestores de procesos. Sus riesgos no son los del tipo B: se instalan en máquinas ajenas, corren con los privilegios de quien las lanza, han de funcionar en varias plataformas, reciben entrada no confiable y viven más que su autoría. Además, en este dominio hay herramientas cuya función es atacar: el kit debe decir con claridad cuáles no construye.

## Decisión
- **El tipo C es una guía de decisión, como el B.** Reutiliza las skills `evaluar-viabilidad` y `elegir-stack-proporcional`, que ganan una rama del tipo C (secciones 7 y 8), más una plantilla complementaria (`types/C/plantillas/VIABILIDAD-TIPO-C.md`), una guía (`types/C/GUIA-DECISION.md`), un ADR de ejemplo y tres casos de viabilidad abstractos. No es una plantilla de proyecto.
- **Viabilidad del tipo C: GO, REDISEÑO o NO-GO**, con evidencia. Ejes añadidos: plataformas objetivo y cómo se verifica cada una; privilegios y radio de daño; modelo de amenazas de la entrada; distribución y actualización (incluida la integridad); acceso a lo externo, con la evidencia que el kit ya exige; mantenimiento (quién y por cuánto tiempo). No hay GO-CONDICIONADO: una autorización o un permiso pendientes no se «verifican después».
- **Puerta de uso responsable, antes que cualquier otro eje.** Función principal de atacar, escanear o explotar sistemas de terceros sin un uso defensivo claro: **NO-GO, sin excepciones**. Defensiva o de doble uso: se declara quién la usa, sobre qué sistemas tiene autorización y qué puede hacer a sistemas ajenos, con valores por defecto seguros (lista explícita de objetivos permitidos, vacía por defecto; registro de actividad; solo lectura si existe). Faltar a algo de eso es REDISEÑO.
- **No hay tipo D.** Se decidió que lo ofensivo queda fuera del kit y que lo defensivo se construye bajo el tipo C pasando esa puerta. Ningún catálogo, ejemplo ni ADR describe técnicas de ataque ni cargas útiles; una prueba lo vigila en lo que trae el tipo C.
- **Stack del tipo C:** mínimo dos alternativas entre Go, Rust y Python, la más simple primero (la que menos cuesta construir, mantener y distribuir para ese problema y ese equipo). Criterios: binario único, rendimiento medido y no supuesto, seguridad de memoria, ecosistema, curva de aprendizaje y costo de mantenimiento. ADR con lo descartado y por qué. «Qué no construir todavía» propio: actualizador, extensiones, proceso residente, interfaz de red, plataformas sin verificar, código inseguro y criptografía propia.
- **Privilegios como eje central.** Acceso al socket de control de un runtime de contenedores, o pertenencia a un grupo equivalente a administrador, equivale a control total del equipo: REDISEÑO salvo que se demuestre que no hay alternativa y se acote.
- **Estado «en construcción».** El manifiesto `types/C/manifest.json` lleva `estado: "en-construccion"`: el instalador lo avisa y no instala nada, y el generador de fichas no acepta aún el tipo C. Los esqueletos (Go y Rust) y el catálogo llegan en las etapas C2 a C5.
- **Pureza y material privado.** El material de consulta del tipo C (inventario de problemas y veredicto de seguridad por repositorio) vive solo en la carpeta local ignorada por git; nada de él se versiona ni se cita. Los nombres de los proyectos consultados y de sus autores se añaden a la lista local de términos prohibidos (`core/test/datos-privados.json`), de modo que las pruebas de pureza y el exportador a la copia pública se detienen si aparecen en un archivo versionado. Una prueba del exportador lo comprueba contra la lista local sin imprimir ningún término. Los repositorios consultados son pequeños y de un solo autor, con licencias heterogéneas o ausentes: sirven como inventario de problemas, no como ejemplos de solución, y no se copia nada de ellos.

## Alternativas descartadas
| Alternativa | Por qué se descarta |
|---|---|
| Un tipo D para lo ofensivo | Crea un cauce propio para lo que el kit no debe construir. Lo defensivo cabe bajo C con la puerta de uso responsable |
| Una plantilla de CLI por lenguaje desde el principio | Repite el fallo que el tipo B evitó: elegir el lenguaje por reflejo. Los esqueletos llegan después de la guía (C2 a C5) |
| Skills nuevas solo para el tipo C | Duplicarían reglas ya escritas (evidencia de acceso, proporcionalidad, cuestionar el encargo). Una rama dentro de cada skill mantiene una sola fuente de verdad |
| GO-CONDICIONADO para el tipo C | Una autorización o un permiso sin verificar es justo lo que la puerta quiere evitar |

## Consecuencias
- Un proyecto de herramienta puede terminar el primer día con NO-GO o REDISEÑO. Es el resultado buscado.
- Las skills de viabilidad y de stack, que viven en `types/B/skills/`, contienen la rama C; el manifiesto del tipo C las reutilizará cuando se active.
- La puerta es una regla de juicio del agente, no un hook: no puede inspeccionar la intención de un proyecto. Su límite está dicho aquí; la parte comprobable (ejemplos, ausencia de contenido de ataque en lo del tipo C, material privado fuera de git) está en pruebas.
- El material privado de consulta del tipo C se guarda en la misma carpeta local ignorada que el del tipo B; si se instala el tipo B en un proyecto con git, esa carpeta puede copiarse a su `kit/casos-privados/` (que el instalador solo permite si git la ignora).

## Sin hacer
Esqueletos de Go y de Rust, catálogo de problemas del tipo C, ficha de infraestructura, preset de sello por lenguaje e instalación del tipo C (etapas C2 a C5).
