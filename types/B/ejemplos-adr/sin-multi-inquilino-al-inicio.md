# ADR de ejemplo. Sin multi-inquilino en la primera versión

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
El producto se valida con una sola organización. Los datos de futuras organizaciones no existen todavía. Operar varios esquemas multiplica migraciones, grupos de conexiones y pruebas. Ficha: `kit/catalogo/multi-inquilino.md` y `kit/catalogo/validacion-bordes.md`.

## Decisión
Un solo inquilino implícito. El diseño evita decisiones que lo impidan (identificadores no secuenciales, ninguna suposición de «una sola organización» en las reglas de negocio) y deja anotado el patrón que se usaría: esquema por organización con el inquilino desconocido como error.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Un solo inquilino implícito (la más simple) | Es la elegida | Migrar más tarde tiene costo, aceptado |
| Columna de inquilino en cada tabla | Riesgo de olvidar el filtro y costo en cada consulta, sin cliente que lo use | Consultas más lentas de escribir y probar |
| Esquema por inquilino desde el inicio | Migraciones y conexiones por esquema sin un segundo cliente real | Operación más compleja sin retorno |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Aislamiento por esquema | Un segundo cliente real con datos que no deben mezclarse |
| Alta de inquilinos sin desplegar | Más de unos pocos clientes |

## Consecuencias
Menos piezas que operar y probar. Cuando aparezca el segundo cliente habrá una migración planificada. Se comprueba con una prueba que documenta la suposición (un solo inquilino) para que el cambio no pase inadvertido.

## Señal para revisar
El segundo cliente real, o un requisito contractual de aislamiento.
