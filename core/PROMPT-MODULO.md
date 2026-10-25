# Prompt de módulo — estructura fija

Se escribe para ser pegado tal cual en una terminal nueva. Orden obligatorio; las secciones sin contenido dicen «ninguno», no se omiten. Respuestas cortas, sin listas de opciones: una recomendación en vez de un repaso de alternativas.

```
OBJETIVO
<qué construye el módulo, en pocas líneas>
No se toca: <carpetas, módulos o decisiones fuera de alcance>

LEE PRIMERO
<documentos de referencia y el HANDOFF.md>

PASOS MANUALES DEL HUMANO
<todos juntos, al inicio: cuentas, inicios de sesión, tokens, puntos de restauración, variables del panel. Si no hay: «Ninguno».>

AUTORIZACIONES PERMANENTES
<lo que la terminal puede hacer sin volver a preguntar: migraciones del módulo, cambios de configuración de despliegue ligados al módulo, commits, especificaciones, documentación y tareas>

CRITERIOS DE CALIDAD
<criterios, no soluciones prescritas. Ante un problema de diseño: «usa tu mejor criterio y tus skills».>
<Si hay interfaz: usar solo tokens de design/styles.css; un valor nuevo se añade primero como token y al brief, con su contraste calculado; citar frontend-design e impeccable en el informe y pasar por revision-visual.>

LÍMITES DE COMMITS
Máximo {{max_rama}} en la rama de la etapa (un commit por rebanada vertical, sin commits de solo registro), sin coautor, mensajes en Conventional Commits. Al cerrar, `git merge --squash` a {{rama_base}} en un solo commit. Antes de pedir el merge: contar con `git rev-list --count {{rama_base}}..HEAD` y, por módulo tocado, `git rev-list --count {{rama_base}} -- <carpeta>`.

PARADAS LEGÍTIMAS
<solo las del módulo, una línea cada una, tomadas de la lista cerrada: seguridad/auth; contratos fuera de la especificación; despliegue y cierre; decisión de negocio fuera del brief; paso manual que solo el humano puede hacer>

INFORME DE CIERRE
<qué debe decir: rebanadas, commits de la rama y de cada módulo, resultados de pruebas, desvíos, decisiones tomadas por su cuenta, evidencias>

<bloque final de kit/MERGE-AUTORIZADO.md, si el humano autoriza el merge; si no, la línea «SIN MERGE: te detienes en la rama»>
```

## Prompts de ajuste pequeño
Un ajuste pequeño sigue la misma estructura (las secciones vacías dicen «ninguno») e **incluye el cierre y el merge en el mismo prompt**: revisor interno sobre el árbol final, sello y el bloque de `kit/MERGE-AUTORIZADO.md`. No se deja el merge para un segundo prompt. Si el humano no quiere el merge, el prompt lo dice con «SIN MERGE: te detienes en la rama»; sin el bloque y sin esa línea, la terminal igualmente se detiene en la rama.

## Autoverificación antes de entregarlo
- ¿Hay alguna parada que no esté en la lista cerrada?
- ¿Algún paso manual que se pide a mitad de camino y pudo pedirse al inicio?
- ¿Falta alguna autorización permanente?
- ¿Convierte en pregunta algo ya decidido?
- ¿Trae el bloque de merge (o «SIN MERGE») también si es un ajuste pequeño?

Si alguna respuesta es sí, se corrige el prompt antes de dárselo al humano.
