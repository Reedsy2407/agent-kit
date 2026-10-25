# 0004. Nada de binarios, hooks ni scripts de terceros

Estado: aceptada (2026-10-19)

## Contexto
En esg-trazabilidad se instalaron skills de diseño ajenas y se excluyeron a propósito su binario nativo, sus hooks y sus subagentes con `Bash`/`Write`: lo que no se puede auditar leyéndolo es superficie de ataque, y un hook de terceros se ejecuta en cada edición con los permisos del usuario.

## Decisión
- Todo hook, script e instalador del kit es propio, en Node sin dependencias, con una prueba y una línea que dice qué bloquea y por qué.
- Si se incorpora algo ajeno, solo son guías escritas (Markdown), copiadas desde un commit fijado, con su licencia y registradas en `design/TOOLING.md`: nunca binarios, hooks, `npx` ni instaladores.
- El kit no trae ninguna skill ajena en la etapa 1; solo registra cómo instalarlas con esa regla.

## Consecuencias
- Auditar el kit es leer unos pocos archivos pequeños.
- Capacidades que dependen de un binario (el detector de Impeccable, gitleaks) quedan fuera del kit; gitleaks es una comprobación opcional del sello de pre-merge: si no hay binario, se dice en el informe.
