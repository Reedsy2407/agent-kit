# Plan de reversa — {{proyecto}}

Fecha: {{fecha}}. Cómo volver a la versión anterior **sin perder datos**. Se prueba antes de necesitarlo: una reversa que nunca se ensayó es una esperanza.

## Cuándo se usa
- Una comprobación de salud falla justo después de un despliegue.
- Un error afecta a usuarios y la corrección rápida no es obvia.
No se usa para esconder un fallo que sigue en los datos: revertir el código no revierte lo ya escrito.

## Tipo A (sitio estático): volver a desplegar el commit anterior
No hay datos ni migraciones; la reversa es segura y reversible.
1. Identifica el último commit bueno: `git log --oneline` (el que desplegó la versión sana).
2. Cambia a ese commit en un directorio limpio o en una rama temporal (sin tocar la rama base): `git switch --detach <commit>`.
3. Genera lo publicable y vuelve a desplegar con el comando de despliegue de la ficha (los mismos pasos de la skill `publicar`).
4. Comprueba con `node scripts/salud.mjs <dirección pública>`.
5. Anota en `ops/INCIDENTE.md` qué se revirtió y por qué; el arreglo real va por la vía normal (rama, pruebas, sello).

## Tipo B (sistema con servicios)
Antes de tocar nada, responde estas tres preguntas y anótalas:
1. **¿El despliegue malo incluía una migración de datos?** Si no: reversa de código, igual que en el tipo A (redespliega la versión anterior). Si sí: sigue.
2. **¿La migración es compatible hacia atrás?** Una migración que solo añade (columnas nuevas opcionales, tablas nuevas) permite que la versión anterior siga funcionando. Una que borra, renombra o transforma, no.
3. **¿Hay un respaldo reciente y verificado (restaurado alguna vez en una copia)?** Sin eso, no se hace ningún cambio de datos.

Camino:
- *Compatible:* redespliega la versión anterior del código; deja la migración como está; planifica la corrección hacia delante.
- *No compatible:* **se detiene y se pide autorización explícita**. Restaurar datos o deshacer una migración es irreversible: primero el respaldo (o rama/instantánea de la base) del estado actual, después la acción, con el humano presente.
- Los trabajos en segundo plano y las colas se pausan antes de revertir si pueden reprocesar con la versión equivocada.

Comprueba después: salud, una ruta real de negocio, y que no hay filas a medias.

## Lo que se ensaya
Fecha del último ensayo: ______. Resultado: ______. Tiempo que tardó: ______.

## Lo que nunca se hace
Forzar la rama base, reescribir historia para «deshacer», borrar la base de datos para empezar de cero, ni revertir sin haber anotado el estado actual.
