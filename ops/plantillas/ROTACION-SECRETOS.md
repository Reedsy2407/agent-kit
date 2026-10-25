# Rotación de secretos — {{proyecto}}

Fecha: {{fecha}}. **Este documento nunca contiene un valor secreto**: solo el nombre del secreto, dónde vive y quién lo cambia. La rotación la hace una persona en el gestor del proveedor; el agente prepara los pasos y verifica, nunca escribe ni lee el valor.

## Inventario
| Secreto (nombre) | Para qué sirve | Dónde vive | Quién lo usa | Frecuencia | Última rotación |
|---|---|---|---|---|---|
| | credencial de base de datos / clave de firma de sesiones / clave de un servicio externo / token de despliegue | gestor de secretos del proveedor o variable de entorno | servicio o persona | | |

## Orden de rotación (siempre este, nunca al revés)
1. **Crear el nuevo** secreto junto al viejo (si el servicio admite dos a la vez, mejor).
2. **Desplegar** el servicio que lo usa con el nuevo.
3. **Comprobar** que funciona: salud mínima y una operación real que dependa del secreto.
4. **Revocar el viejo** solo cuando el nuevo está en uso y comprobado.
5. **Comprobar la revocación:** una petición con el viejo debe ser rechazada (sin escribir el valor en ningún archivo ni registro).
6. **Anotar** fecha y motivo aquí y en `ops/INCIDENTE.md` si fue por una filtración.

Si dos servicios comparten un secreto, se separa en dos antes de rotar; un secreto compartido hace que cada rotación sea un riesgo para ambos.

## Qué rotar y cuándo
- **De inmediato:** si hubo o puede haber filtración (apareció en un archivo, un registro, un mensaje, un historial, una captura).
- **Por calendario:** según la tabla.
- **Cuando se va una persona** con acceso a ellos.
- **Las claves de firma de sesión o tokens:** rotarlas invalida sesiones; avisa y planifica el momento.

## Si se filtró
1. Rota primero (pasos 1 a 5), investiga después.
2. Quita el valor del lugar donde apareció; recuerda que quitarlo del archivo no lo quita del historial: el secreto sigue comprometido, por eso se rota.
3. Revisa los registros del proveedor por usos sospechosos desde la filtración.
4. Anota en `ops/INCIDENTE.md` qué pasó y cómo se evita (una prueba, una regla, una plantilla sin valores).

## Qué comprueba el kit
El escaneo de secretos del sello y el hook de escritura ayudan a que un valor no llegue a un archivo, pero no sustituyen la rotación cuando ya llegó.
