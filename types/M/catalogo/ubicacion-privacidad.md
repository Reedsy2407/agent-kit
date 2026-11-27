# Ubicación y privacidad: lo mínimo, sin atar la zona a una persona

## Problema
La app usa dónde está alguien para ofrecer algo, y cada posición que sale del equipo, o que queda escrita, puede decir dónde vive, trabaja o se mueve. Aparece al mostrar cosas cercanas, al registrar un recorrido, al avisar por zonas o cuando una biblioteca recoge la posición por su cuenta.

## Señales de que aplica
- Alguna función necesita la posición, aunque sea aproximada.
- El servidor recibe zonas, coordenadas o identificadores que permiten deducirlas.
- Hay registros, informes de fallos o analítica en la misma app.

## Señales de que sobra
- La función se resuelve con una zona que la persona elige a mano y cambia cuando quiere.
- La app no usa la ubicación y ninguna biblioteca la pide.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: no usar la ubicación | Ninguno; la persona busca o elige a mano | La función no mejora de verdad con ella |
| Comparar en el equipo: el servidor entrega un ámbito amplio y la app filtra | Medio: más datos de bajada y lógica en el cliente | El servidor no necesita saber dónde está nadie |
| Enviar una zona grande sin identidad | Medio: decidir y declarar el tamaño mínimo | El volumen impide entregarlo todo |
| Enviar posiciones ligadas a la cuenta | Alto: base legal, conservación, borrado y declaraciones | La función es ese registro y la persona lo pide |

## Cómo se comprueba
- Un inventario: qué dato, para qué, dónde, cuánto tiempo y quién lo recibe, incluidas las bibliotecas, y que coincida con la política y con el formulario de la tienda.
- Una prueba que falla si una petición, un registro o un informe de fallos lleva coordenadas.
- Un recorrido con ubicación aproximada y con el permiso negado: la app sirve o explica qué falta.
- Revisión del servidor: no puede unir una persona con una zona con los identificadores que recibe, ni quien tiene las credenciales de la mensajería.
- Una prueba de borrado: al eliminar la cuenta desaparecen las posiciones guardadas.

## Cómo suele resolverse
Se pide aproximada antes que precisa y primer plano antes que segundo. Lo que puede decidirse en el equipo se decide ahí. Cuando el servidor necesita una zona, recibe la más grande que sirva, sin identificador de persona ni de equipo en la misma petición y sin guardarla junto a la dirección de red. Si la petición tiene que identificar a la persona, el ámbito que pide es igual para todos. Las coordenadas no entran en registros ni en informes, y se borran en el plazo que se declaró.

## Anti-patrones frecuentes
- Mandar la posición «por si luego sirve».
- Anonimizar cambiando el nombre por un identificador estable: sigue siendo la misma persona.
- Repartir avisos con un grupo por zona y creer que así el servidor o el proveedor no la saben.
- Dejar coordenadas en el registro de depuración que luego llega a la versión publicada.
- Declarar en la tienda menos de lo que envían las bibliotecas.

## Hechos en que se apoya
- [P-UBI-1], [P-UBI-3], [P-UBI-4]: aproximada frente a precisa y límites del segundo plano.
- [P-UBI-5], [P-UBI-6], [P-UBI-7]: condiciones de la tienda para usar la ubicación.
- [P-UBI-9]: cambio anunciado sobre cómo se pide la ubicación precisa.
- [P-RT-7], [P-RT-9], [P-RT-19]: qué se puede saber de un equipo a través de la mensajería.
- [P-PRI-3], [P-PRI-4]: aviso destacado y formulario de datos, bibliotecas incluidas.
- [P-PRI-6]: lo guardado puede salir del equipo por copias y transferencias.
- No verificado [P-RT-5]: cuánto delata la dirección de red; se asume el peor caso.
- No verificado [P-RT-11]: qué ve el proveedor de mensajería de las suscripciones por zona.

## Requisitos de referencia
R6 y R2 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
- [Un ámbito único de avisos](../ejemplos-adr-m/ambito-unico-de-avisos.md)
