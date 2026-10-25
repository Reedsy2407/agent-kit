# 0007. Sello de pre-merge por hash de árbol

Estado: aceptada (2026-10-19)

## Contexto
La regla «sin lint, tests y build locales en verde no se empuja» se incumplió (el merge de M6c llegó a `main` con errores de lint). Un hook no puede ejecutar el verify entero dentro de `PreToolUse`: tarda minutos y el agente debe verlo correr. Y entre rama y `main` cambian los hashes de commit pero no el contenido.

## Decisión
- `premerge-check.mjs` ejecuta las comprobaciones que la ficha asigna a las rutas tocadas (más gitleaks si hay binario) y, si todo pasa, escribe un sello en `.git/kit-premerge.json` con el **hash del árbol** (`HEAD^{tree}`).
- El hook `guard-merge` exige un sello vigente para empujar la rama base, hacer `git merge --squash` de una rama y `gh pr merge`: compara el árbol que se va a integrar con el del sello.
- Como el árbol de la rama y el de `main` tras el squash coinciden, un solo sello vale para el merge y el push posterior.
- El sello vive en `.git/`, fuera del árbol de trabajo y de lo versionado.

## Consecuencias
- Cualquier cambio posterior al sello lo invalida; basta repetir la comprobación.
- El sello es una guarda contra el olvido, no contra un agente decidido a falsificarlo: el control de fondo sigue siendo el revisor y la revisión humana del cierre.
- Esta es la excepción al «falla abierto» del ADR 0002: si el hook de merge no puede decidir, bloquea.
