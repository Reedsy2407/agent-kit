# Guía de decisión — {{proyecto}} (tipo {{tipo}}: {{tipo_nombre}})

El tipo B no impone un stack. Enseña **cómo piensa un proyecto real**: primero si la idea es posible, después qué tecnología es proporcional, después qué problemas conocidos aparecen y qué cuestan, y solo entonces se construye. La tecnología se elige para este negocio y este tamaño; el agente cuestiona un encargo que lleve a una mala elección.

## El recorrido
1. **Viabilidad** (`evaluar-viabilidad`). Dependencias externas con evidencia de acceso. Salida: `DECISION-VIABILIDAD.md`. Con NO-GO, o REDISEÑO sin aprobar, se para y no se construye.
2. **Stack proporcional** (`elegir-stack-proporcional`). Al menos dos alternativas reales, una la más simple posible; criterios; checklist anti-sobreingeniería. Salida: ADRs con lo descartado.
3. **Especificación** (`especificar-funcionalidad`). Por cada funcionalidad, antes del prompt del módulo: criterios de aceptación `CA-n` comprobables, fuera de alcance y como máximo tres preguntas abiertas, enlazando `DECISION-VIABILIDAD.md` para las dependencias externas. Salida: `docs/specs/<nombre>.md` (plantilla `kit/plantillas/ESPECIFICACION.md`), contrastada con las rebanadas del plan antes de construir.
4. **Catálogo** (`consultar-catalogo`). Cuando aparece un problema (consistencia, errores, concurrencia, dinero…), se lee su ficha: señales de que aplica y de que sobra, opciones incluida «no hacer nada», costo y comprobación. Si existe `kit/casos-privados/`, se consulta para ver cómo se resolvió un caso parecido (sin copiar nada a lo versionado).
5. **ADRs** (`kit/plantillas/ADR.md`). Cada decisión grande queda escrita con alternativas descartadas, lo que no se construye todavía y la señal para revisarla. `kit/ejemplos-adr/` trae ejemplos breves.
6. **Construcción por rebanadas verticales**, con el proceso del núcleo (`kit/PROCESO-MODULOS-Y-REVISION.md`): una rebanada cruza todas sus capas, lleva sus pruebas y se despliega. **La primera rebanada ya se despliega** (ficha `despliegue-desde-semana-uno`).

## Cuándo preguntar al humano
- **Solo dudas técnicas** y solo cuando la proporcionalidad no las resuelve: una pregunta, con tu recomendación.
- **Las dudas de negocio no se preguntan por adelantado**: el negocio se organiza antes de empezar. Si una duda de negocio aparece después, se pregunta una vez y se sigue con lo que no dependa de ella.
- Un encargo que implica una elección peor o desproporcionada se cuestiona con una alternativa y su costo (protocolo de `elegir-stack-proporcional`); sin nadie presente, se toma la opción más simple, se anota en el ADR y se sigue.
- Siguen valiendo las paradas legítimas del `CLAUDE.md` (seguridad, contratos, despliegue y cierre, decisión de negocio fuera del brief, paso manual del humano). Un NO-GO de viabilidad es una decisión de negocio fuera del brief.

## Qué no recortar nunca
Aunque el problema sea pequeño y el plazo corto, esto no se recorta:
- **Reglas de negocio** con sus pruebas (TDD en lo que decide dinero, estados y cumplimiento).
- **Concurrencia**: restricciones reales en la base (únicos, exclusión) y una prueba con dos actores compitiendo.
- **Seguridad**: autenticación y autorización probadas en la cadena completa, errores sin filtrar detalle interno, entradas validadas en el borde.
- **Secretos**: nunca en archivos, nunca con valor por defecto; si falta la variable, el servicio no arranca; escaneo de secretos antes de publicar.
- Un chequeo de salud y una forma de saber qué versión corre.
- Que ninguna pantalla se bloquee por un tercero y que lo declarado se etiquete como declarado.

Todo lo demás se construye cuando su señal aparece (checklist de `elegir-stack-proporcional`).

## Front del tipo B
El tipo B reutiliza lo que el kit ya trae para la interfaz, sin código nuevo:
- **Esqueleto del stack** (si existe: `java-spring`, `dotnet`, `node` o `python`): se instala al declarar `kit.preset` en la ficha; un servicio mínimo con salud, prueba, contenedor e integración continua, cuya verificación (con fecha y límites) está en el registro del kit. Sin base de datos ni mensajería: se añaden con un ADR cuando el catálogo lo justifique.
- **Tokens** (`design/styles.css`), **presets** (`design/presets/`, el perfil de expresión del tipo B parte de «sobrio») y **patrones** (`design/patrones/`), con las reglas de `design/DESIGN-BRIEF.md`.
- La **biblioteca de pruebas de front** (`tests/front/`) corre contra una dirección ya desplegada con `--url`: `node tests/front/run.mjs --config tests/front/front.config.json --url <dirección https>` (o `origen.url` en la configuración). Copia `tests/front/front.config.ejemplo.json` a `tests/front/front.config.json`, ajusta las páginas y la dirección.
- La ficha (`kit/FICHA-INFRA.json`) ya declara `kit.front` apuntando a esa configuración: el sello de pre-merge corre las pruebas de front en cuanto el archivo existe. Más detalle en `kit/FRONT-TIPO-B.md`.
