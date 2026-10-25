---
name: operar
description: Opera un sistema ya publicado (tipos A y B) - comprueba su salud, sigue el runbook, vuelve a la versión anterior, rota secretos y responde a incidentes - solo con lo que la ficha permite y nada irreversible sin autorización explícita. Úsala cuando el humano pida revisar, reiniciar, revertir o rotar algo de un sistema en marcha, o cuando una comprobación de salud falle.
---

Operar es lo que pasa **después** de publicar. Esta skill no despliega (eso es `publicar` en el tipo A y el despliegue de la ficha en el tipo B): vigila, diagnostica y, si la ficha lo permite, corrige. Los documentos viven en `ops/` del proyecto (`RUNBOOK.md`, `PLAN-REVERSA.md`, `ROTACION-SECRETOS.md`, `INCIDENTE.md`, `SALUD-MINIMA.md`); si falta alguno, créalo desde la plantilla antes de necesitarlo, no durante el incidente.

## Reglas
1. **Ninguna acción de operación se ejecuta sin que la ficha la permita.** La ficha (`kit/FICHA-INFRA.json`, bloque `ops`) declara qué está permitido: `ops.salud` y `ops.sondeoAcceso` (los scripts) y `ops.acciones.<estado|arranque|parada|reversa|rotacion>` con sus comandos exactos. Lo que no está con `permitida: true` no se ejecuta: se pide al humano, una sola vez y con el comando exacto.
2. **Nada irreversible sin autorización explícita del humano en ese momento:** restaurar o borrar datos, rotar o revocar un secreto, volver atrás una migración, cambiar DNS, borrar un recurso, cualquier cosa que afecte a usuarios. Que la ficha lo permita solo evita el rechazo automático (la reversa y la rotación siempre preguntan); la autorización la da una persona, por escrito, para esa acción.
3. **Solo lectura primero.** Estado y salud antes que cualquier cambio. Los registros se leen con filtro, límite y `timeout`, nunca siguiendo el flujo.
4. **Los secretos no se escriben** en archivos, mensajes, informes ni comandos de ejemplo: se nombran («la clave X del servicio Y») y el valor lo pone una persona en el gestor del proveedor.
5. **Un cambio a la vez y se comprueba.** Después de cada acción, repite la salud mínima; si empeora, deshaz esa acción.

## Flujo
1. **Salud:** `node scripts/salud.mjs <dirección pública>` (con `timeout`). Compara con `ops/SALUD-MINIMA.md`. Sale 0 si todo está bien, 1 si algo falla y 2 si la ficha no lo permite o la configuración está mal.
2. **Diagnóstico:** el `RUNBOOK.md` dice dónde mirar (estado, registros, cuotas, último despliegue). Anota qué ves con hora; no cambies nada todavía.
3. **Mitigación:** la más reversible primero (reintentar, reiniciar, quitar tráfico, volver a la versión anterior con `PLAN-REVERSA.md`). Si la mitigación es irreversible, regla 2.
4. **Causa y aprendizaje:** al cerrar, rellena `ops/INCIDENTE.md` (detección, mitigación, causa, aprendizaje) con hechos, sin culpar a personas, y convierte el aprendizaje en una prueba, una alerta o una línea del runbook.

## Volver a la versión anterior
Lee `PLAN-REVERSA.md` del proyecto. En el **tipo A** es volver a desplegar el commit anterior (nada que migrar, nada que perder). En el **tipo B**, antes de revertir comprueba si el despliegue incluyó una migración de datos: si la hay, la reversa del código puede no ser segura sin reversar la migración, y eso es irreversible (regla 2). Con datos de por medio, primero el respaldo verificado, después la reversa.

## Rotar un secreto
Lee `ROTACION-SECRETOS.md`: qué rotar, en qué orden (crear el nuevo, desplegar el que lo usa, comprobar, revocar el viejo, nunca al revés), cómo comprobar que el viejo ya no funciona y qué hacer si se filtró (rotar de inmediato y revisar el historial). La rotación es siempre una acción del humano; tú preparas los pasos y verificas.

## Lo que esta skill no hace
No decide por el humano qué se sacrifica en un incidente, no esconde un fallo con un reintento ciego, no abre accesos nuevos y no sustituye la guardia de una persona.
