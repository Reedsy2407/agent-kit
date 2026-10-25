# Proceso de trabajo con agentes: la unidad de revisión es el módulo

Documento genérico de {{proyecto}}. Las reglas que deben cumplirse siempre las hacen cumplir los hooks y los permisos (`.claude/`); este documento explica el proceso y el porqué.

## 1. Definiciones
- **Módulo:** una unidad de entrega completa. Ejemplos: un servicio entero (modelo, API, pruebas), la aplicación de interfaz entera, o el sitio completo.
- **Rebanada vertical:** una tarea dentro del módulo que cruza todas sus capas (por ejemplo, una pantalla de punta a punta). Las rebanadas no son módulos y no tienen revisión humana propia.
- **Etapa:** un trabajo con rama propia que puede tocar varios módulos.
- **Constructor:** el agente con acceso de escritura. **Revisor interno:** el subagente `code-reviewer`, de solo lectura y sin el contexto del constructor. **Revisor externo:** el humano con un segundo Claude; revisa una sola vez, al cerrar.

## 2. Reglas
1. El constructor ejecuta el módulo completo de corrido, rebanada por rebanada, sin esperar aprobación entre ellas.
2. Antes de cada commit, el revisor interno revisa el diff (seguridad, accesibilidad, desvíos de la especificación o del brief, errores de lógica). El constructor corrige lo que encuentre y solo reporta lo que no pudo corregir.
3. Las verificaciones mecánicas son obligatorias en cada rebanada y no dependen de ningún humano: pruebas, accesibilidad automática y, en interfaces, ausencia de scroll horizontal en 360, 768 y 1280 px.
4. Un commit por rebanada, con las tareas y la documentación dentro; sin commits de solo registro. En la rama base entra un commit por etapa (`git merge --squash`).
5. **Paradas permitidas** (lista cerrada): seguridad y autenticación; contratos de API o de evento fuera de la especificación; despliegue y cierre; decisiones de negocio fuera del brief; un paso manual de infraestructura que solo la persona puede hacer. Los pasos manuales se piden todos juntos al arrancar.
6. Al cerrar, el constructor entrega un único informe (skill `cierre-de-modulo`).
7. La revisión externa es una sola, rigurosa, leyendo el código real y las capturas reales, nunca un resumen. Cierra con un prompt autocontenido de correcciones, si hacen falta.

## 3. La deriva a evitar
Es fácil convertir cada rebanada en una puerta de revisión humana: pasa cuando las primeras rebanadas tienen defectos visibles y el revisor externo empieza a corregirlos uno a uno. Es útil para las primeras (fijan el sistema de diseño o los patrones); una vez validados, se vuelve a la regla: la revisión externa es del módulo. Señal de alerta: la persona está pegando resultados de cada rebanada y recibiendo un prompt nuevo cada vez. Se corrige el prompt del módulo, no se añade otro paso.

## 4. Automatización máxima
- Las únicas paradas son las de la lista cerrada; ningún prompt añade paradas «por prudencia».
- El prompt del módulo trae escritas las autorizaciones permanentes. Si los permisos bloquean algo, el constructor sigue con lo demás, deja ese cambio listo y pide la autorización una sola vez, con el informe.
- El revisor externo nunca convierte en pregunta algo que el humano ya decidió o que ya está autorizado. Una parada real se dice en una línea: «Hay que parar: X, porque Y».
- Las decisiones de negocio que bloquean el trabajo sí se plantean; lo que se prohíbe es inventar paradas o repetir lo decidido.

## 5. Merge y despliegue
Se autorizan dentro del prompt de la etapa, con el bloque final de `kit/MERGE-AUTORIZADO.md`, sin esperar la revisión previa del diff. El revisor externo revisa el diff después; si encuentra algo, se corrige con un commit nuevo o un revert. Sin el bloque, no se mergea. Antes del merge, el sello de pre-merge (`node .claude/hooks/premerge-check.mjs`) debe estar vigente.

### Autoría y privacidad antes del primer push
Antes de empujar un proyecto nuevo por primera vez, el sello revisa el correo de autor y de committer de todo el historial: debe ser el correo «noreply» del proveedor de repositorios o un correo público que el humano indique en la ficha (`kit.autoria.correosPermitidos`). Si hay un correo personal, el sello avisa y el constructor lo dice en el informe. Reescribir la autoría antes de publicar es una excepción puntual: solo con autorización explícita del humano y con una rama de respaldo local que nunca se sube.

## 6. Límite de commits (dos niveles)
- Por módulo: máximo {{max_modulo}} commits en toda su vida. Por etapa: máximo {{max_rama}} commits en la rama y exactamente 1 en `{{rama_base}}`.
- Antes de pedir el cierre se cuenta: `git rev-list --count {{rama_base}}..HEAD` y, por módulo, `git rev-list --count {{rama_base}} -- <carpeta>`. El informe lo dice. Si un límite no alcanza, se avisa antes de pasarlo.

## 7. Varias terminales en paralelo (solo si hace falta)
Con una sola terminal no se necesitan PRs, worktrees ni zonas. Con varias:
1. Cada terminal es dueña de una zona de carpetas; los archivos compartidos (CI, configuración de despliegue, lista de tareas) tienen un solo dueño.
2. Un worktree por terminal y módulo, nunca una carpeta compartida; se retira con `git worktree remove`, no borrando la carpeta.
3. Una rama por módulo; `git pull --ff-only` antes de cada push; ante un conflicto, parar y avisar.
4. Primero el núcleo común, luego los módulos en paralelo, y solo si no dependen entre sí. Contratos de API o de evento acordados antes del código.
5. Una terminal nueva por módulo con el `HANDOFF.md`, no contextos largos; lecciones en documentos, no en la conversación; sin vigilar el CI en bucles.
6. Cada decisión implementada actualiza su ADR en el mismo commit que el código.

## 8. Prompt base para el constructor
Ver `kit/PROMPT-MODULO.md` (estructura fija) y la skill `prompt-de-modulo`.
