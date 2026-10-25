# Datos declarados frente a verificados

## Problema
No todo dato se puede comprobar. A veces la única fuente es la declaración de una persona, y a veces la verificación depende de un tercero que puede no responder. Si el sistema mezcla ambos, presenta como cierto lo que solo se dijo, y un documento emitido (un certificado, un informe) repite sin saberlo un dato sin comprobar.

## Señales de que aplica
- Una cifra o un nombre se escribe a mano porque no hay fuente consultable.
- La verificación depende de un tercero y puede fallar.
- Un documento o exportación presenta el dato a un tercero que confía en él.
- La viabilidad (`evaluar-viabilidad`) concluyó que el dato verificado no es accesible y se rediseñó con dato declarado.

## Señales de que sobra
- Todos los datos vienen de una fuente propia y confiable.
- El dato es solo informativo y nadie decide con él.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: un campo que no dice su origen | Ninguno; falsa confianza | Nunca si alguien decide con el dato |
| **Etiquetar el origen** («declarado», «con comprobante referenciado», «verificado») en pantalla, documentos y exportaciones | Bajo | Siempre que haya datos declarados |
| Estados independientes: actividad y verificación son campos distintos | Bajo-medio | Entidades con ambas dimensiones |
| Impedir acciones sensibles sobre lo no verificado (por ejemplo, emitir un documento) | Bajo | Cuando el documento da fe |
| Camino de verificación posterior que reemplaza el dato declarado | Medio | Cuando el tercero vuelve a estar disponible |
| Guardar quién declaró y cuándo | Bajo | Siempre |
| Rechazar el respaldo manual si el tercero sí responde | Bajo | Para que nadie se salte la verificación |

## Cómo se comprueba
- Una prueba de que pantallas, documentos y exportaciones muestran la etiqueta de origen.
- Una prueba de que lo no verificado no puede dar lugar a la acción sensible.
- Una prueba de que, si el tercero responde, el respaldo manual se rechaza.
- Una prueba de que verificar reemplaza el dato escrito a mano y deja registro.
- Una revisión de que ninguna etiqueta oculta el origen en una exportación (hojas de cálculo, documentos).

## Cómo suele resolverse
Un caso público (esg-trazabilidad) no podía obtener de la fuente oficial una cifra por empresa, así que el operador la declara y el personal la registra a mano con su período y su autor. Pantallas, documentos y exportaciones la rotulan siempre como declarada y aclaran que no es una cifra oficial ni está verificada. Puede ir acompañada de una referencia escrita al comprobante (solo texto: nadie la contrasta). Cuando el servicio que verifica a una empresa no responde, se permite registrarla como no verificada con un nombre escrito a mano, pero no recibe documentos hasta verificarse, y el servidor vuelve a consultar antes de aceptar el respaldo para que nadie lo use como atajo. Actividad y verificación son dos campos independientes.

## Anti-patrones frecuentes
- Un solo campo de estado que mezcla actividad y verificación.
- Presentar una cifra declarada con el mismo estilo que una verificada.
- Aceptar el dato manual en el mismo camino que el verificado (el cliente puede forzar el atajo).
- Documentos emitidos con datos sin comprobar y sin advertirlo.
- Una exportación que pierde la etiqueta de origen.
- No guardar quién declaró ni cuándo.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** dos enumeraciones en la entidad y un servicio que consulta antes de aceptar el respaldo. No verificado.
- **.NET:** dos propiedades con tipos de enumeración y una regla de dominio en el método de emisión. No verificado.
- **Node:** dos campos y una guarda en la función de emisión. No verificado.
- **Python:** dos campos de enumeración y una validación al emitir. No verificado.

## ADR de ejemplo
- [Dato declarado y etiquetado como tal](../ejemplos-adr/dato-declarado-etiquetado.md)
- [Estados independientes: actividad y verificación](../ejemplos-adr/estados-independientes.md)
- [Alta marcada como no verificada cuando el tercero no responde](../ejemplos-adr/respaldo-no-verificado.md)
