# ADR de ejemplo. Un monolito modular antes que servicios separados

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Una persona construye y mantiene el sistema; el negocio tiene tres áreas con reglas propias; el plazo es corto y el costo de operar debe ser mínimo. La consistencia entre áreas importa (dinero y cumplimiento). Ficha: `kit/catalogo/estructura-capas-hexagonal.md`.

## Decisión
Un solo servicio desplegable con una base de datos, dividido en módulos por área (cada uno con su dominio y sus reglas). Las áreas se comunican por interfaces internas. Hexagonal completa solo en los módulos con reglas de negocio ricas; capas finas en el resto.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Un servicio, estructura plana del framework | La lógica de negocio se mezclaría con el transporte y costaría probarla | Pruebas lentas y reglas dispersas |
| Servicios separados por área | Un equipo de una persona operaría varios despliegues, redes y bases | Operación y consistencia distribuida sin ganancia |
| Hexagonal completa en todo | Ceremonia en módulos casi sin reglas | Más archivos que cambiar por cada ajuste |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Separar un módulo como servicio | Un equipo distinto que despliega a otro ritmo, o escala desigual medida |
| Intermediario de mensajes | Un consumidor externo |
| Librería compartida entre servicios | Existir más de un servicio |

## Consecuencias
Una sola unidad de despliegue, transacciones locales y pruebas rápidas. Las fronteras entre módulos se vigilan con una prueba de arquitectura en el build, para que separarlos después sea posible.

## Señal para revisar
Equipos que se pisan al desplegar, o un módulo con carga muy distinta al resto.
