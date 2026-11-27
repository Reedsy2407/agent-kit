# Viabilidad del tipo M — {{proyecto}}

Fecha: {{fecha}}. Complementa `DECISION-VIABILIDAD.md` (skill `evaluar-viabilidad`, sección 8). Veredictos posibles: **GO / REDISEÑO / NO-GO**; la cuarta opción que ofrece la plantilla general no se usa en el tipo M. Sin secretos: de una credencial o de una clave solo se anota que existe.

Plataforma objetivo: Android. Si el proyecto marca iOS como necesario, dilo aquí con el usuario real que lo exige: es decisión del humano y su evidencia va aparte.

## Ejes
Un eje que no aplica se escribe «no aplica» con su razón; en blanco cuenta como sin evidencia. Cada hecho de plataforma citado lleva su identificador de `kit/PLATAFORMA-ANDROID.md` y la fecha en que se volvió a leer la fuente.

| Eje | Evidencia | Fecha | Estado (verificado / sin verificar / no aplica) |
|---|---|---|---|
| (a) Datos externos o en tiempo real: accesibles, estables y permitidos | | | |
| (b) Términos de uso de integraciones de terceros (mapas, rutas, mensajería…) | | | |
| (c) Cobros y suscripciones según las reglas de la tienda | | | |
| (d) Permisos sensibles (ubicación, segundo plano, cámara, notificaciones) y su declaración en la tienda | | | |
| (e) Contenido generado por usuarios: moderación, denuncia, bloqueo | | | |
| (f) Datos personales y privacidad desde el diseño | | | |
| (g) Funcionamiento sin conexión | | | |
| (h) Cuenta de desarrollador, plazos de revisión y costo | | | |

## Inventario de datos (eje f)
| Dato | Para qué | Dónde queda (equipo / servidor / tercero) | Cuánto tiempo | Cómo se borra |
|---|---|---|---|---|
| | | | | |

## Permisos (eje d)
| Permiso o servicio | Función que lo exige | Alternativa sin él | Declaración en la tienda | Qué pasa si se niega |
|---|---|---|---|---|
| | | | | |

## Plazos y costos (eje h)
| Paso | Quién lo hace | Plazo | Costo | Fecha de inicio |
|---|---|---|---|---|
| | | | | |

## Veredicto del tipo M
**GO / REDISEÑO / NO-GO** (deja uno) y la razón en una o dos frases. Si es REDISEÑO o NO-GO, el agente se detiene y no construye hasta que el humano decida.
