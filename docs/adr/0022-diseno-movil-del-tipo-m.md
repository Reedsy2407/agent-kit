# 0022. Diseño móvil del tipo M: estudiar el estilo del sector sin copiarlo

Estado: aceptada (2026-11-26). Complementa los ADR 0021 (tipo M como guía de decisión), 0011 (biblioteca de front, que sigue siendo web) y 0004 (nada de terceros).

## Contexto
El tipo M no tenía paso de diseño. El del kit es web: brief con anchos de página, tokens en CSS, maquetas en HTML, capturas con navegador y pruebas de estilos calculados. Nada de eso sirve tal cual para una app, y entregar el diseño al humano (buscar apps, hacer capturas, escribir el brief) es justo el trabajo que se quiere evitar. En muchos rubros ya hay apps parecidas de las que partir, con un límite: la marca y la obra ajenas. Y una pantalla de teléfono usada al volante necesita reglas que la guía oficial solo escribe para pantallas de coche.

## Decisión
- **Principio, en cualquier tipo y sector:** si en el rubro hay productos parecidos, se estudia e imita su estilo (navegación, jerarquía, densidad, tamaño de controles, tono, estados vacíos y de error) y no se copia marca, logotipos, textos, iconos propios, ilustraciones ni pantallas concretas. Se enuncia en la guía del tipo M, en su brief y en `design/DESIGN-BRIEF.md`. En el diseño web solo se añade el texto: no cambia ninguna regla, skill ni prueba.
- **Se reutiliza el método, no el contenido web:** referencias sin copiar, varias direcciones, elección del humano, brief como fuente de verdad y revisión antes del cierre.
- **Dos skills del tipo M** (`types/M/skills/`), que el modelo puede invocar solo: `estudiar-referencia-movil` y `explorar-direcciones-movil`. Dos plantillas: el brief de diseño móvil y la lista de revisión visual móvil. Se instalan en `.claude/skills/` y `kit/plantillas/`; el proyecto escribe `design/DESIGN-BRIEF.md`, la ruta que el núcleo ya lee.
- **La web es la fuente principal.** El agente la recorre con las herramientas de la sesión: no pide trabajo al humano, no necesita equipo ni cuentas en las apps estudiadas, cubre varias apps y deja fuentes con fecha que otro puede volver a abrir. Su sesgo es la promoción; por eso la skill exige buscar estados de error, sin red, bloqueo y uso real, dos fuentes por app cuando se pueda, y marcar «fuente única» y «No visto».
- **Las imágenes no se guardan.** Se miran en la sesión y solo se escribe texto. Motivos: son obra de terceros; un repositorio con capturas ajenas puede acabar publicado; tenerlas delante invita a calcar; y describir en palabras obliga a extraer la decisión. Nada se descarga al equipo sin permiso previo.
- **Las capturas del humano son opcionales** (`referencias/`, que el instalador añade al `.gitignore`) y, si existen, tienen prioridad.
- **La validación es la elección:** el estudio no se detiene a pedir aprobación; el humano valida al escoger entre tres o más direcciones descritas, con tokens como idea y sin código.
- **Regla de conducción:** `[P-CON-5]` pasa a ser la decisión del kit (aplicar al teléfono en marcha las medidas de la guía de pantallas de coche y el criterio de pocas acciones, `[P-CON-7]`). Lo que decía esa fila y sigue sin comprobarse (si algo obliga a una app de teléfono y si las medidas valen en un teléfono montado) pasa a `[P-CON-8]`, «No verificado». Corrige la referencia que hace el ADR 0021 a `[P-CON-5]`.
- **Hechos en una sola fuente:** accesibilidad (`[P-ACC-*]`) y marca (`[P-MAR-*]`) entran en `types/M/PLATAFORMA-ANDROID.md`; skills y plantillas citan identificadores.

## Alternativas descartadas
| Alternativa | Por qué se descarta |
|---|---|
| Instalar en el tipo M las skills de diseño web | Miden anchos de página, escriben CSS y fotografían en un navegador de escritorio |
| Maquetar las direcciones en Compose, XML o HTML | Elige stack antes de tiempo, cuesta mucho y una maqueta web no representa un teléfono; una descripción basta para elegir rumbo |
| Pedir al humano capturas de las apps como fuente obligatoria | Es el esfuerzo manual que se quiere evitar, y bloquea el diseño |
| Guardar las capturas halladas en el repositorio | Obra de terceros, peso y tentación de calcar |
| Guardarlas en una carpeta local ignorada por git | Sigue siendo descargar al equipo del humano. Si hace falta bajar una para verla, se pide permiso antes, queda fuera del repositorio y se borra después |
| Instalar las apps de referencia en un equipo o emulador | Pide cuentas, equipo y aceptar condiciones ajenas |
| Que el agente elija la dirección | Es una decisión del humano |
| Una skill de revisión visual móvil | Una lista cubre lo pedido sin otra pieza; se puede convertir en skill si se omite |
| Copiar el brief a `design/` al instalar | Quedaría vacío y versionado antes de que exista una dirección; se copia al elegir |
| Incorporar guías o herramientas de diseño de terceros | ADR 0004: solo tras auditarlas y como guías escritas; queda para otra etapa |
| Repetir las cifras en skills y plantillas | Las políticas y las guías cambian |

## Consecuencias
- Un proyecto M tiene recorrido de diseño sin que el humano busque nada; su trabajo previsto es elegir (y responder si se pide permiso para una descarga).
- La calidad del estudio depende de lo que haya publicado y de las herramientas de la sesión. Puede quedar «No visto» justo el estado que más importa; la nota de pantallas por confirmar en un teléfono real es opcional.
- `design/ESTUDIO-REFERENCIAS.md` y `design/DIRECCIONES.md` son texto versionado y nombran apps de otros: antes de publicar el repositorio de la app, el humano decide si se quedan.
- Son reglas de juicio: ningún hook impide copiar un diseño ni guardar una imagen, ni comprueba la lista de revisión. Las pruebas del kit comprueban que las reglas estén escritas y fijan, una por una, las frases sobre imágenes de las skills instaladas: una nueva o cambiada hace fallar la prueba hasta que alguien la revise. No interpretan lo que una frase ordena.
- Si imitar un estilo reconocible está permitido por la ley de cada país no se comprobó (`[P-MAR-3]`).
- Las medidas de coche pueden resultar grandes o insuficientes en un teléfono; solo un equipo real lo dirá (`[P-CON-8]`).
- El `CLAUDE.md` del núcleo sigue nombrando `design/styles.css`, `revision-visual` y herramientas web; la guía del tipo M dice qué vale en su lugar. Adaptar el núcleo por tipo sigue pendiente.
- Un proyecto M ya instalado recibe los archivos nuevos al reinstalar, pero su guía y sus hechos antiguos no se sobrescriben sin `--forzar` de esas rutas.

## Sin hacer
Esqueleto Android (M2), catálogo del tipo M (M3), pruebas automáticas de interfaz móvil y cualquier uso de estas skills en una app real.
