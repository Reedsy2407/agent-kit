---
name: consultar-catalogo
description: Consulta el catálogo de problemas de sistemas con servicios (kit/catalogo/) cuando aparezca un problema técnico concreto, y los casos privados (kit/casos-privados/, si existen) para ver cómo se resolvió uno parecido. Úsala antes de decidir cómo resolver consistencia, errores, dependencias externas, concurrencia, dinero, integraciones, autenticación, migraciones, pruebas, observabilidad o despliegue.
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

## Lo que no hace esta skill
No impone un patrón por estar en el catálogo, no decide por el humano lo que es de negocio y no sustituye la prueba: toda decisión adoptada lleva su comprobación (la ficha dice cuál).
