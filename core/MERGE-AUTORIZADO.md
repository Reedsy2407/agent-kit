# Bloque «MERGE AUTORIZADO / DEPLOY AUTORIZADO»

**Cualquier prompt de una etapa que deba terminar en `{{rama_base}}` lleva el bloque, también los ajustes pequeños**: el cierre (revisor interno sobre el árbol final y sello) y el merge van en el mismo prompt. Si el prompt no trae el bloque, la terminal se detiene en la rama y entrega el informe. Un prompt que no debe mergear lo dice explícitamente («SIN MERGE: te detienes en la rama»).

Va al final del prompt de la etapa, con esta forma fija. El merge y el despliegue se autorizan aquí, sin esperar la revisión previa del diff; el revisor externo revisa el diff después y, si encuentra algo, se corrige con un commit nuevo o un revert. Sin este bloque, el constructor no mergea.

```
MERGE AUTORIZADO
Si se cumplen TODAS estas condiciones, haz `git merge --squash <rama>` a {{rama_base}} en un solo commit
(`feat(<scope>): <descripción>`) y empuja:
1. Las pruebas, el lint y el build locales de cada módulo tocado están en verde.
2. El sello de pre-merge está vigente (`node .claude/hooks/premerge-check.mjs`); escaneo de secretos limpio con gitleaks o con `escaneo-secretos.mjs`; si el sello dice «SIN ESCANEO DE SECRETOS», dilo en el informe.
3. El revisor interno (`code-reviewer`) dio PASS.
4. No hubo desvíos del alcance.
5. Límites de commits respetados: <rama ≤ {{max_rama}}; módulos ≤ {{max_modulo}}>.
Orden de integración: <ramas o módulos, en orden>.

DEPLOY AUTORIZADO
<Si aplica: qué se despliega, con qué comando permitido por la ficha, y cómo se verifica (un solo bucle acotado). Solo con lo que ya está en {{rama_base}}. Si no aplica: «No hay despliegue en esta etapa».>

SI ALGO FALLA
Reporta en una línea con el motivo y no mergees. Solo te detienes por una variable o un secreto que solo el humano puede crear, o un paso que depende del humano.

QUÉ REPORTAR AL CERRAR
Commits de la rama (`git rev-list --count {{rama_base}}..HEAD`), commits de cada módulo tocado, resultado de pruebas, gitleaks, veredicto del revisor, decisiones por tu cuenta.
```
