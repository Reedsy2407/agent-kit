# Catálogo de problemas del tipo M

Un catálogo de **problemas, no de soluciones**, para aplicaciones móviles instaladas en un teléfono, Android primero, con o sin servidor propio. Cada ficha dice cuándo el problema aplica y cuándo sobra, qué opciones hay (siempre incluida «no hacer nada»), cuánto cuesta cada una, cómo se comprueba, qué conviene evitar y en qué hechos se apoya. Se consulta con la skill `consultar-catalogo` (rama del tipo M), después de `evaluar-viabilidad` y durante `elegir-stack-proporcional` y la construcción. Nada de aquí se implementa «porque sí»: se adopta cuando sus señales ya están presentes y se registra en un ADR.

Formato fijo de cada ficha: Problema · Señales de que aplica · Señales de que sobra · Opciones · Cómo se comprueba · Cómo suele resolverse (abstracto) · Anti-patrones frecuentes · Hechos en que se apoya · Requisitos de referencia · ADR de ejemplo.

Las afirmaciones sobre Android, las herramientas y la tienda **no se repiten aquí**: viven en [los hechos de plataforma](../PLATAFORMA-ANDROID.md), cada una con su fuente y su fecha, y las fichas las citan por identificador. Una cita marcada «No verificado» señala algo que no se pudo confirmar: se contrasta o se mide antes de apoyarse en ello. Los hechos envejecen: antes de adoptar una opción se vuelve a leer la fuente y, si cambió, se corrige en el ADR del proyecto, no en el catálogo. No hay notas por stack: las fichas valen para cualquiera de las alternativas de la guía, y lo propio de una se cita cuando hay un hecho.

Los requisitos de referencia (R1 a R7) están en la [guía](../GUIA-DECISION.md).

## Sistema y segundo plano
- [Trabajo en segundo plano: detectar la interrupción, recuperarse y decirlo](servicio-primer-plano-interrupciones.md) — R1
- [Permisos mínimos y en contexto, con la app útil si se niegan](permisos-minimos-en-contexto.md) — R6
- [Batería, rendimiento y tamaño](bateria-rendimiento-tamano.md) — R1

## Datos, privacidad y confianza
- [Ubicación y privacidad: lo mínimo, sin atar la zona a una persona](ubicacion-privacidad.md) — R6 y R2
- [Almacenamiento local y secretos en el cliente](almacenamiento-local-secretos.md) — R6
- [Cuenta y registro sin SMS, y comprobación de la instalación](cuenta-registro-integridad.md) — R4
- [Observabilidad sin datos personales: fallos y métricas](observabilidad-sin-datos-personales.md) — R6

## Red y servidor
- [Tiempo real y mensajería push: lo que prometen y lo que no](tiempo-real-mensajeria-push.md) — R2
- [Sin red y sincronización: último estado conocido, con caducidad](sin-red-ultimo-estado.md) — R4
- [Actualizaciones y compatibilidad con el servidor](versiones-compatibilidad-servidor.md) — R3 y R4
- [Acceso, suscripción y modo «solo consumo»](acceso-suscripcion-solo-consumo.md) — R4

## Personas y tienda
- [Contenido de usuarios: denunciar, bloquear y sancionar desde el servidor](contenido-usuarios-moderacion.md) — R3
- [Accesibilidad y uso en marcha](accesibilidad-uso-en-marcha.md) — R7
- [Publicación en la tienda: cuenta, pruebas, ficha, declaraciones y requisitos de versión](publicacion-tienda.md) — R5

## Construcción
- [Arquitectura de la app: capas, flujo en un sentido y estado de la interfaz](arquitectura-app.md)
- [Pruebas: locales, de interfaz y lo que exige un equipo real](pruebas-equipo-real.md) — R1, R2 y R7

## Antes de nada
La viabilidad de la idea (accesos, términos, cobros, permisos, contenido, privacidad, plazos de publicación) no es una ficha del catálogo: es la puerta cero, la skill `evaluar-viabilidad`.

## Ejemplos de ADR
Decisiones breves y abstractas en `../ejemplos-adr-m/` (en el proyecto: `kit/ejemplos-adr-m/`). Son forma, no texto para copiar.
