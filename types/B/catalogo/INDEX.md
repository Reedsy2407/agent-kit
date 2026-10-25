# Catálogo de problemas

Un catálogo de **problemas, no de soluciones**. Cada ficha dice cuándo el problema aplica y cuándo sobra, qué opciones hay (siempre incluida «no hacer nada»), cuánto cuesta cada una y cómo se comprueba. Se consulta con la skill `consultar-catalogo`, después de `evaluar-viabilidad` y durante `elegir-stack-proporcional`. Nada de aquí se implementa «porque sí»: se adopta cuando sus señales ya están presentes y se registra en un ADR.

Formato fijo de cada ficha: Problema · Señales de que aplica · Señales de que sobra · Opciones · Cómo se comprueba · Cómo suele resolverse (abstracto) · Anti-patrones frecuentes · Notas por stack · ADR de ejemplo.

Las **notas por stack** son orientativas y llevan fecha: lo marcado «Verificado el AAAA-MM-DD» se contrastó con la fuente oficial enlazada en esa fecha (solo lo que ella dice); «Comprobado ejecutando el esqueleto» se probó con `types/B/esqueletos/` (registro en `VERIFICACION.md`); lo marcado «No verificado» no se pudo confirmar y debe verificarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptar una nota.

## Datos y mensajes
- [Consistencia entre un cambio de datos y la publicación de eventos](consistencia-datos-eventos.md)
- [Estado y ciclo de vida de entidades largas](estado-ciclo-vida.md)
- [Concurrencia y bloqueo](concurrencia-bloqueo.md)
- [Dinero, precios y redondeo](dinero-precios-redondeo.md)
- [Migraciones sin parar el servicio](migraciones-sin-parar.md)
- [Paginación y búsqueda](paginacion-busqueda.md)
- [Datos declarados frente a verificados](declarado-vs-verificado.md)

## Bordes y terceros
- [Errores y su traducción a respuestas](errores-respuestas.md)
- [Validación en los bordes (y inquilino desconocido como error)](validacion-bordes.md)
- [Dependencias externas caídas o lentas](dependencias-externas.md)
- [Integraciones salientes y webhooks](integraciones-salientes-webhooks.md)
- [Autenticación y autorización entre servicios](autenticacion-entre-servicios.md)

## Estructura y operación
- [Estructura por capas o hexagonal (y cuándo no hace falta)](estructura-capas-hexagonal.md)
- [Multi-inquilino (y por qué no en un MVP)](multi-inquilino.md)
- [Estilos de prueba y cobertura](pruebas-cobertura.md)
- [Observabilidad: registros, métricas y correlación](observabilidad-correlacion.md)
- [Despliegue y configuración por ambiente (ningún secreto con valor por defecto)](despliegue-configuracion.md)
- [Despliegue desde la semana uno](despliegue-desde-semana-uno.md)

## Antes de nada
La viabilidad de la idea (accesos, datos, convenios, costos) no es una ficha del catálogo: es la puerta cero, la skill `evaluar-viabilidad`.

## Ejemplos de ADR
Decisiones breves y abstractas en `../ejemplos-adr/` (en el proyecto: `kit/ejemplos-adr/`). Son forma, no texto para copiar.
