# Publicación en la tienda: cuenta, pruebas, ficha, declaraciones y requisitos de versión

## Problema
El producto está listo y no se puede publicar: falta verificar la identidad, un periodo de prueba con personas, una política de privacidad, una declaración de un permiso, subir la versión de destino o una ficha de la tienda que cumpla sus reglas. Cada uno tiene plazos que no dependen de ti. Aparece desde el primer día, aunque se note al final.

## Señales de que aplica
- La app se repartirá por una tienda, o a personas fuera de quien la construye.
- Usa permisos sensibles, servicios en primer plano, cuentas, cobros o contenido de usuarios.
- Alguien ha puesto una fecha de lanzamiento.

## Señales de que sobra
- Herramienta personal instalada a mano en el equipo propio.
- Todavía no hay viabilidad: la puerta va antes que la lista de publicación.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: instalar a mano en pocos equipos | Ninguno; no escala ni actualiza solo | Prueba inicial con personas cercanas |
| Reparto cerrado fuera de la tienda | Bajo-medio: firma, actualizaciones y confianza a tu cargo | Grupo conocido que acepta instalar así |
| Pistas de prueba de la tienda antes de producción | Medio: cuenta, declaraciones y personas inscritas | Se quiere publicar |
| Producción con lista de publicación completa | Alto la primera vez | El producto y sus declaraciones están listos |

## Cómo se comprueba
- Una lista con responsable, evidencia y fecha por punto: cuenta, identidad, destino, tamaño de página, firma, paquete, política, formulario de datos, permisos, servicios, clasificación y acceso para quien revisa.
- La dirección de la política abre desde fuera y la misma información está dentro de la app.
- El paquete firmado se genera sin claves en el control de versiones.
- La eliminación de cuenta probada desde la app y desde la web.
- Probadores inscritos, con la fecha de inicio anotada, y el informe previo al lanzamiento leído.
- La ficha de la tienda completa: nombre, descripciones, correo de contacto, icono, imagen destacada y capturas de la versión que se sube, dentro de sus límites, sin marcas ajenas ni enlaces o llamadas a otro pago; como criterio conservador, tampoco testimonios, clasificaciones, premios ni precios en ningún elemento.
- Cada declaración coincide con lo que hace la versión que se sube.

## Cómo suele resolverse
La cuenta, la identidad y el periodo de prueba se arrancan cuando existe la primera rebanada instalable, no cuando el producto está acabado. La ficha se escribe con textos y capturas propios que describen lo que esa versión hace. La lista de publicación vive en el proyecto y se relee la política vigente antes de cada entrega con cambios sensibles. Quien revisa recibe instrucciones y una cuenta de prueba. La cuenta, la cuota, las claves y cada publicación son pasos del humano.

## Anti-patrones frecuentes
- Descubrir el periodo de prueba obligatorio la semana del lanzamiento.
- Rellenar el formulario de datos sin mirar las bibliotecas.
- Una ficha con capturas o textos que imitan a otra app, o que prometen lo que la versión no hace.
- Repetir palabras clave en el nombre o la descripción para subir en las búsquedas.
- Declarar un permiso con un motivo que la app no cumple.
- Guardar la clave de firma en el proyecto.
- Prometer una fecha sin contar la revisión.
- Dejar el destino atrasado hasta que la tienda rechaza la actualización.

## Hechos en que se apoya
- [P-PUB-1], [P-PUB-2], [P-PUB-3]: cuenta, prueba cerrada y plazos de revisión.
- [P-PUB-4], [P-PUB-5]: formato del paquete y firma.
- [P-PUB-6], [P-PUB-7]: destino mínimo y tamaño de página de memoria.
- [P-PUB-8]: verificación de identidad de desarrolladores.
- [P-PUB-10]: declaraciones de contenido y acceso para la revisión.
- [P-PUB-11], [P-PUB-12]: qué exige la ficha de la tienda, qué no admite y qué solo se recomienda.
- [P-MAR-1], [P-MAR-2]: ni suplantar a otros ni infringir sus derechos.
- [P-PAG-2]: la ficha tampoco conduce a otro pago.
- [P-PRI-1], [P-PRI-2], [P-PRI-4], [P-PRI-5]: política, formulario y eliminación.
- [P-UBI-5], [P-UBI-8]: declaraciones de ubicación y de servicios en primer plano.
- [P-PRU-2]: informe previo al lanzamiento.
- [P-ACT-1]: número de versión.
- No verificado [P-PUB-9]: desde cuándo el requisito del tamaño de página frena a una app nueva.
- No verificado [P-MAR-3]: hasta dónde se puede imitar el estilo de otra app.

## Requisitos de referencia
R5 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
Sin ejemplo: usa `kit/plantillas/ADR.md` para el canal de reparto elegido.
