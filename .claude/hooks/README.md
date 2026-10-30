# Hooks del kit

Node sin dependencias. Cada hook lee el JSON de `PreToolUse` por stdin; sale con **2** para bloquear (el motivo va por stderr a Claude), con **0** para dejar pasar y con **1** ante un error interno (no bloquea; solo `guard-merge` y `guard-reviewer` bloquean si no pueden decidir). Se registran en `.claude/settings.local.json` (lo genera `infra/generate-settings.mjs`); su configuración está en `.claude/kit.json`.

| Hook | Herramienta | Qué bloquea y por qué |
|---|---|---|
| `guard-shell.mjs` | Bash | Lo que cuelga o satura la terminal: `cat` sin archivo o con heredoc, editores y paginadores, `read`, intérpretes sin script, heredocs a intérpretes, `tail -f`/`--tail`/`watch`, servidores en primer plano, bucles infinitos y carga de CPU, matar procesos por nombre, `rm` con `..`, push forzado, `docker prune`, escrituras fuera del proyecto, y ejecutores largos (`mvn`, `gradle`, `dotnet test`, `python -m pytest`, `go test`, `cargo test`, `ruff check`, `python -m unittest`, `npm test`, `ng build`, las pruebas y herramientas de front…) sin `timeout`. Una shell quedó 1 h 24 min colgada por un `cat > x`. |
| `guard-write.mjs` | Write, Edit | Escrituras fuera del proyecto y de la carpeta temporal, sobre `.claude/hooks`, `kit.json` y `settings*.json` (las reglas no las edita quien debe cumplirlas), archivos de secretos (`.env`, `.pem`, claves; las plantillas `.env.example`, `.env.ejemplo` y `.env.plantilla` sí se pueden escribir) y contenido con forma de secreto. Secretos nunca en archivos. |
| `guard-commit.mjs` | Bash | `git commit` sin Conventional Commits, con coautor o firma de la herramienta, sin `-m` (abre editor), con una rama que ya llegó al tope de commits, de solo registro dentro de una etapa, o sobre un módulo que llegó a su tope de vida. |
| `guard-merge.mjs` | Bash | `git rebase` y `pull --rebase`, `git merge` sin `--squash`, `gh pr merge` sin `--squash`, borrar la rama base, y integrar o empujar la rama base sin sello de pre-merge vigente (ADR 0007). |
| `guard-reviewer.mjs` | Bash del subagente | Todo lo que no sea git de lectura o ejecutar pruebas: un revisor que corrige deja de ser independiente. |
| `premerge-check.mjs` | (script) | No es un hook: corre las comprobaciones de la ficha (exige al menos una: un sello sin pruebas no prueba nada), gitleaks si hay binario o, si no, `escaneo-secretos.mjs`, corre las pruebas de front de la ficha (`kit.front`) si existe su configuración, avisa de correos personales en el historial y deja el sello de pre-merge. Si no hubo ningún escaneo de secretos, el sello dice «SIN ESCANEO DE SECRETOS». |
| `escaneo-secretos.mjs` | (script) | No es un hook: busca patrones de claves y tokens en el árbol y en el historial (los mismos de `guard-write`), sin dependencias y sin mostrar el valor. Es el respaldo de gitleaks (ADR 0010). |

`lib/autoria.mjs` revisa los correos de autor y committer del historial (ADR 0010). `lib/common.mjs` reúne lo común (lectura de stdin, configuración, análisis de comandos). Las pruebas están en `test/` y no se instalan.

Límite conocido: son guardas contra el olvido y el descuido, no una frontera contra un agente decidido; un comando puede escribirse de una forma que el análisis no reconozca (por ejemplo dentro de `bash -c "…"`). Por eso el revisor y la revisión humana del cierre siguen siendo parte del proceso.
