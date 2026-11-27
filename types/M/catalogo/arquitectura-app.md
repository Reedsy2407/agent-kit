# Arquitectura de la app: capas, flujo en un sentido y estado de la interfaz

## Problema
La pantalla pide datos, guarda cosas y decide reglas, y al girar el equipo, volver de otra app o cambiar una fuente de datos, algo se pierde o se contradice. Aparece cuando la app deja de caber en la cabeza. El extremo contrario también es un problema: capas y módulos que nadie necesitaba.

## Señales de que aplica
- El mismo dato se muestra o se edita en más de un sitio.
- La persona pierde lo que escribía al girar, al cambiar de app o cuando el sistema cierra el proceso.
- No se puede probar una regla sin abrir una pantalla.

## Señales de que sobra
- Una o dos pantallas sin datos que sobrevivan: un solo archivo por pantalla basta.
- Se propone una capa o un módulo sin un problema presente que resuelva.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: la lógica en la pantalla | Ninguno al principio; difícil de probar y cambiar | Prototipo desechable |
| Interfaz y datos separados, con estado inmutable y eventos en un sentido | Bajo | Punto de partida de casi cualquier app |
| Además, capa de dominio para reglas compartidas | Medio | La misma regla se repite en varias pantallas |
| Varios módulos | Alto: compilación y fronteras que mantener | El tamaño del código o el equipo lo piden |

## Cómo se comprueba
- Una prueba local de cada regla, sin pantalla ni equipo.
- Una prueba de cada pantalla con su estado de carga, vacío, error y sin red, construidos como datos.
- Girar el equipo, cambiar de app y simular que el sistema mata el proceso en segundo plano: lo que la persona espera sigue ahí.
- Cambiar la fuente de datos por una falsa en las pruebas sin tocar la interfaz.
- Revisión de que cada dato tiene un solo dueño.

## Cómo suele resolverse
La capa de datos es la dueña de cada dato y lo expone como algo que se observa. Quien guarda el estado de una pantalla lo construye a partir de esos datos y de los eventos, como un valor inmutable que la interfaz pinta. Se decide, dato a dato, qué se pierde sin daño, qué se guarda como estado y qué va a disco. El dominio y los módulos llegan cuando una repetición o el tamaño los pide, con su decisión escrita. Como referencia sirve una app pública bien hecha, tomando el criterio y no la cantidad de piezas.

## Anti-patrones frecuentes
- Copiar la estructura de una app de referencia entera para tres pantallas.
- Guardar el mismo dato en la pantalla y en el almacenamiento y editar los dos.
- Una interfaz por cada clase «por si cambia».
- Dar por conservado lo que solo vive en memoria.
- Probar la lógica a través de la interfaz porque no hay otra puerta.
- Simulacros para todo cuando bastan dobles falsos.

## Hechos en que se apoya
- [P-ARQ-1]: capas mínimas, fuente de verdad y flujo en un sentido.
- [P-ARQ-2]: las recomendaciones tienen prioridad y se prefieren dobles falsos.
- [P-ARQ-4]: modularizar no siempre tiene sentido.
- [P-ARQ-5], [P-ARQ-8]: una app de referencia y cómo organiza sus datos.
- [P-ARQ-6]: estado de interfaz y flujo en un sentido.
- [P-ARQ-7]: qué sobrevive a cada cosa.

## Requisitos de referencia
Ninguno en particular: es una ficha general. Ver la [guía](../GUIA-DECISION.md).

## ADR de ejemplo
- [Un módulo y dos capas](../ejemplos-adr-m/un-modulo-y-dos-capas.md)
