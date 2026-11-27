# Pruebas: locales, de interfaz y lo que exige un equipo real

## Problema
Las pruebas pasan y la app falla en la mano de alguien. Lo que ocurre en segundo plano, con otra capa de fabricante, con sol, sin red o sobre un vehículo no se ve en la máquina de desarrollo. Aparece en cuanto una función depende del sistema o de cómo se usa.

## Señales de que aplica
- La función central depende de segundo plano, tiempo real, sensores o permisos.
- Los usuarios tienen equipos de varios fabricantes y versiones.
- Algo se da por hecho porque «en el emulador va».

## Señales de que sobra
- Lógica pura sin interfaz ni sistema: las pruebas locales bastan.
- Un cambio de texto no necesita repetir las pruebas en equipos.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: probar a mano lo que se toca | Ninguno; las regresiones aparecen tarde | Prototipo |
| Pruebas locales de reglas y estados, con dobles falsos | Bajo | Siempre |
| Además, pruebas instrumentadas de los recorridos clave | Medio: equipo o emulador, y tiempo | Las pantallas cambian y los recorridos importan |
| Guion de pruebas en equipos reales con registro por equipo | Medio, repetido en cada entrega sensible | Segundo plano, tiempo real o uso en marcha |
| Granja de equipos o servicio de pruebas | Alto | Muchos fabricantes y alguien que lea los resultados |

## Cómo se comprueba
- El comando de comprobaciones del proyecto corre las pruebas locales y falla si alguna falla; consta cuántas se ejecutaron.
- Las pruebas instrumentadas se ejecutan en un equipo o emulador y su resultado se registra aparte, porque las comprobaciones locales no las corren.
- Un registro por equipo real: modelo, versión, guion, lo observado y lo no comprobado.
- Cada requisito que dependa del equipo dice quién lo probó, cuándo y en cuál.
- Lo no probado aparece como «No comprobado» en el cierre, no como correcto.

## Cómo suele resolverse
Las reglas se separan para probarlas sin equipo. Se automatizan los pocos recorridos cuya rotura dolería. Lo que solo se ve en un equipo tiene un guion corto y repetible: cortar la red, apagar la pantalla durante un uso completo, forzar el reposo, detener la app, reiniciar, activar el ahorro de batería, agrandar la letra y, si aplica, montar el equipo como en el vehículo. El guion se pasa en los equipos que de verdad usan las personas.

## Anti-patrones frecuentes
- Contar como probado lo que solo se compiló.
- Dar por hecho el segundo plano a partir del emulador.
- Esperas por tiempo en vez de por condición.
- Perseguir cobertura en vez de los recorridos que importan.
- Un único equipo de pruebas, el del que construye.
- Callar en el cierre lo que no se pudo probar.

## Hechos en que se apoya
- [P-PRU-1]: pruebas locales frente a instrumentadas.
- [P-HER-1]: qué corre cada tarea de comprobación.
- [P-ARQ-2]: dobles falsos antes que simulacros.
- [P-FGS-14]: forzar la detención y el reposo.
- [P-ACC-8]: comprobaciones de accesibilidad.
- [P-PRU-2]: informe de la tienda al subir un paquete.
- [P-CON-5]: la regla de conducción que se prueba en el equipo montado.
- No verificado [P-FGS-11]: el comportamiento propio de cada fabricante.
- No verificado [P-RT-17]: plazos de entrega de los avisos; se miden.

## Requisitos de referencia
R1, R2 y R7 en la [guía](../GUIA-DECISION.md), «Requisitos de referencia».

## ADR de ejemplo
- [Un turno interrumpido se detecta y se dice](../ejemplos-adr-m/interrupcion-se-detecta-y-se-dice.md)
