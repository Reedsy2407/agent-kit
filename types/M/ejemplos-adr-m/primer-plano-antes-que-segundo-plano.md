# ADR de ejemplo. Primer plano antes que segundo plano

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Una función usa la ubicación. Pedirla también en segundo plano la haría más cómoda, pero exige una declaración en la tienda, un permiso que se activa aparte y mucha más confianza de la persona. Fichas: `kit/catalogo-m/permisos-minimos-en-contexto.md` y `kit/catalogo-m/ubicacion-privacidad.md`.

## Decisión
La primera versión pide solo la ubicación con la app en uso, en su forma aproximada, en el momento de usar la función. Si la persona la niega, la función se usa eligiendo la zona a mano. El segundo plano no se pide.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Pedir segundo plano al instalar | La función central se cumple sin él | Declaración, revisión y negativas |
| Pedir la precisa desde el principio | La aproximada basta para la función | Más dato del necesario que proteger |
| Exigir el permiso para abrir la app | El resto de la app no lo necesita | Personas que se van en la primera pantalla |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Ubicación en segundo plano | Una función central que no se cumple con la app visible ni con un servicio que la persona inicia |

## Consecuencias
Menos permisos que declarar y probar. Hay un camino sin permiso que mantener en cada pantalla que usa la ubicación.

## Señal para revisar
La función elegida a mano resulta inservible para la mayoría, o aparece una necesidad central que solo el segundo plano cubre.
