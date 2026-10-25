# agent-kit — instrucciones para desarrollar el kit

Este repo ES el kit (no un proyecto que lo use). Estado y siguiente paso: `HANDOFF.md`. Decisiones: `docs/adr/`.

- Node ESM sin dependencias; pruebas con `node --test` (ADR 0001). No añadas `package.json` de dependencias, binarios ni scripts de terceros (ADR 0004).
- Una fuente de verdad por regla: la regla vive en un hook (`core/hooks/`) o en el generador (`infra/`); las plantillas la nombran, no la repiten.
- Nada específico de un proveedor en `core/` (ni Render, Neon ni nombres de proyectos reales). Texto en español. Las plantillas públicas no mencionan el repositorio ni GitHub.
- Cada hook tiene su prueba y se explica en una línea (qué bloquea y por qué) en `core/hooks/README.md`.
- Commits: Conventional Commits con scope `kit`, sin `Co-Authored-By`; máximo 10 por rama de etapa y 1 en `main` (`git merge --squash`).
- Shell: nada que espere stdin, `timeout` en lo que pueda tardar, temporales fuera del proyecto, sin matar procesos por nombre.
- Secretos nunca en archivos.
