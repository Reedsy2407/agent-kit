---
name: consultar-catalogo
description: Consulta el catálogo de problemas de sistemas con servicios (kit/catalogo/) o, en el tipo C (herramientas y software de sistemas), el de kit/catalogo-c/, cuando aparezca un problema técnico concreto, y los casos privados (kit/casos-privados/, si existen) para ver cómo se resolvió uno parecido. Úsala antes de decidir cómo resolver consistencia, errores, dependencias externas, concurrencia, dinero, integraciones, autenticación, migraciones, pruebas, observabilidad o despliegue; en el tipo C, ciclo de vida, control local, contrato de un CLI, entrada no confiable, extensión, confinamiento, secretos, privilegios, registro, empaquetado o cambios reversibles.
---

El catálogo es de **problemas, no de soluciones**: cada ficha dice cuándo el problema aplica, cuándo sobra, qué opciones hay (siempre incluida «no hacer nada»), cuánto cuesta cada una y cómo se comprueba. No es una lista de cosas por implementar.

## Cómo se usa
1. Abre `kit/catalogo/INDEX.md` y localiza la ficha del problema que tienes delante. Si ninguna encaja, decide por proporcionalidad (`elegir-stack-proporcional`) y no fuerces una ficha.
2. Lee **primero** «Señales de que sobra». Si el proyecto está ahí, la opción es «no hacer nada todavía»; anótalo en el ADR con la señal que lo cambiaría.
3. Compara las opciones por su costo, no por su elegancia. Elige la más simple que cumpla y que tenga su comprobación definida.
4. Las **notas por stack** son orientativas. Lo marcado «no verificado» no se ha comprobado: verifica contra la documentación oficial vigente del stack elegido antes de apoyarte en ello, y corrige la nota en el ADR del proyecto, no en el catálogo.
5. Registra la decisión en un ADR (`kit/plantillas/ADR.md`), enlazando la ficha. Cada ficha apunta a un ADR de ejemplo en `kit/ejemplos-adr/` cuando existe.

## Casos privados
Si existe `kit/casos-privados/`, consúltalo para ver **cómo se resolvió un caso parecido**: sirve para entender las razones, los compromisos y lo que conviene evitar.

- Es material de consulta local. **Nunca copies su contenido** (ni frases, ni nombres, ni valores, ni estructura reconocible) a archivos versionados del proyecto: código, documentación, ADR, commits, informes ni este catálogo.
- Lo que aprendas se expresa con tus palabras, en genérico: el patrón y la razón, sin atribuirlo a ningún sistema.
- No lo cites. Si una decisión necesita justificación, justifícala con el problema y los criterios del proyecto.
- Si no existe la carpeta, sigues sin ella; el catálogo basta.

## Rama del tipo C (herramientas y software de sistemas)
En un proyecto del tipo C el catálogo está en `kit/catalogo-c/` (índice: `kit/catalogo-c/INDEX.md`), con dieciocho fichas en seis grupos: ciclo de vida, control y contrato, datos y entrada/salida, pruebas y extensión, seguridad por defecto y operación. Se usa igual que arriba (primero «Señales de que sobra», opciones por costo, notas por stack, ADR con `kit/plantillas/ADR.md`) con estas diferencias:
- Donde arriba dice `kit/catalogo/` y `kit/ejemplos-adr/` (rutas del tipo B), en el tipo C son `kit/catalogo-c/` y `kit/ejemplos-adr-c/`.
- Las notas por stack son de **Go, Python y Rust**, con tres estados: «Verificado el AAAA-MM-DD» (con enlace a la fuente oficial), «Comprobado ejecutando el esqueleto» (registro en `types/C/esqueletos/VERIFICACION.md` del kit) y «No verificado». Verifica lo que no lo esté antes de apoyarte en ello.
- Los ADR de ejemplo están en `kit/ejemplos-adr-c/`.
- Las fichas de seguridad (entrada no confiable, confinamiento, secretos, privilegios, autenticación de APIs de control) son **defensivas**: describen límites, plazos y privilegios mínimos. El catálogo no describe técnicas de ataque ni cargas útiles y **no autoriza** construir una herramienta ofensiva: la puerta de uso responsable de `evaluar-viabilidad` (sección 7) manda sobre cualquier ficha.
- No hay `kit/casos-privados/` en el tipo C: el material de consulta del tipo C es local del kit y no se instala.
- Si ninguna ficha encaja, decide por proporcionalidad (`elegir-stack-proporcional`, sección 8) y no fuerces una ficha.

## Lo que no hace esta skill
No impone un patrón por estar en el catálogo, no decide por el humano lo que es de negocio y no sustituye la prueba: toda decisión adoptada lleva su comprobación (la ficha dice cuál).
