# Handoff — {{proyecto}} ({{fecha}})

Léelo primero; es corto a propósito, para arrancar una terminal nueva sin arrastrar un contexto largo. El revisor lo actualiza al cerrar cada módulo. Reglas: `CLAUDE.md`. Proceso: `kit/PROCESO-MODULOS-Y-REVISION.md`.

## Estado
- Proyecto: {{proyecto}} (tipo: {{tipo_nombre}}). Rama base: `{{rama_base}}`.
- Último módulo cerrado: _(ninguno todavía)_
- Módulo en curso: _(ninguno)_
- Desplegado en: _(rellenar: dirección pública y commit)_

## Tarea actual
_(una o dos líneas: qué módulo, qué rebanada, qué falta)_

## Roles
- Tú: la terminal constructora. Revisor interno: `code-reviewer`. Revisor externo: el humano y un segundo Claude. El humano decide negocio y dinero.

## Reglas que más se rompen
- Un commit por rebanada; en `{{rama_base}}` un solo commit por etapa (`git merge --squash`). Sin coautor ni firma de la herramienta en los mensajes.
- Merge y despliegue solo con el bloque «MERGE AUTORIZADO / DEPLOY AUTORIZADO» dentro del prompt.
- Nada que espere stdin, `timeout` en lo que pueda tardar, sin carga artificial de CPU, sin matar procesos por nombre.
- Temporales fuera del proyecto; sin secretos en archivos.
- No edites `.claude/settings.local.json` ni los hooks: propones y el humano aplica.

## Accesos permitidos y denegados
Ver `.claude/settings.local.json` (generado desde `kit/FICHA-INFRA.json`). Pasos manuales del humano: _(copiar de la ficha: inicios de sesión)_.

## Cuenta de pruebas
_(si existe: cómo se obtiene, qué alcance tiene; nunca la contraseña aquí)_

## No hagas
- No empieces trabajo nuevo sin que el humano lo pida.
- No añadas paradas que no estén en la lista cerrada del `CLAUDE.md`.
- _(añadir aquí lo que ya salió mal en este proyecto)_

## Siguiente
_(el paso que sigue, en una línea)_
