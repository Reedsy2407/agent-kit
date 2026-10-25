---
name: cierre-de-modulo
description: Prepara el cierre de un módulo o etapa: cuenta los commits, corre el sello de pre-merge, pide el veredicto del revisor interno y redacta el informe único. Úsala al terminar la última rebanada, antes de pedir o ejecutar el merge.
disable-model-invocation: true
---

Cierre de módulo, en este orden. Si un paso falla, corrige o reporta; no mergees.

1. **Cuenta los commits** y guárdalos para el informe:
   - de la rama: `git rev-list --count <rama_base>..HEAD` (tope de la rama en `.claude/kit.json`);
   - de cada módulo tocado: `git rev-list --count <rama_base> -- <carpeta>`.
   Si algún tope no alcanza, avisa al humano antes de pasarlo; no lo ajustes en silencio.
2. **Sin commits de solo registro** dentro de la etapa. Si los hay, júntalos por rebanada (`git reset --soft <rama_base>` y recommitea).
3. **Sello de pre-merge:** `node .claude/hooks/premerge-check.mjs`. Lanza el comando con `timeout` y en segundo plano si tarda; da una línea de estado cada ~2 minutos. Anota qué escaneo de secretos corrió (gitleaks, el propio o «SIN ESCANEO DE SECRETOS») y si el sello avisó de un correo personal en la autoría.
4. **Revisor interno:** invoca al subagente `code-reviewer` sobre el diff completo (`git diff <rama_base>..HEAD`) y espera su `VEREDICTO`. Con `FAIL`, corrige y vuelve a invocarlo.
5. **Si hay interfaz:** pasa por la skill `revision-visual` y cita `frontend-design` e `impeccable` (o di que no estaban instaladas).
6. **Informe único y corto:**
   - qué quedó (rebanadas hechas);
   - commits de la rama y de cada módulo tocado;
   - resultado de las pruebas (con las cifras reales) y de gitleaks;
   - veredicto del revisor;
   - desvíos del alcance y decisiones tomadas por tu cuenta;
   - evidencias para la revisión del humano (rutas de capturas, informes).
7. **Merge:** solo si el prompt trae el bloque «MERGE AUTORIZADO» y se cumplen todas sus condiciones. Si no, entrega el informe y detente: la revisión del módulo completo es del humano.
