# 0021. Tipo M como guía de decisión: aplicaciones móviles, Android primero

Estado: aceptada (2026-11-26). Complementa los ADR 0006 (tipos con manifiestos), 0013 (tipo B como guía de decisión) y 0018 (tipo C como guía de decisión).

## Contexto
Los tipos A, B y C no cubren una aplicación instalada en un teléfono. Sus riesgos son otros: el sistema decide cuándo puede correr (segundo plano, ahorro de energía, cierre de procesos), los permisos sensibles se justifican ante el usuario y ante la tienda, publicar depende de una cuenta, de pruebas previas, de revisiones y de reglas de cobro y de contenido, y los datos personales viven en el bolsillo de la persona. Varios de esos puntos pueden invalidar una idea antes de escribir código, y las políticas cambian varias veces al año.

## Decisión
- **El tipo M es una guía de decisión, como el B y el C.** No impone lenguaje, framework ni arquitectura. Reutiliza `evaluar-viabilidad` y `elegir-stack-proporcional`, que ganan una rama del tipo M (secciones 8 y 9), más `types/M/GUIA-DECISION.md` y una plantilla de viabilidad (`types/M/plantillas/VIABILIDAD-TIPO-M.md`).
- **Alcance: Android.** iOS queda fuera: ningún hecho ni regla del tipo M lo cubre. Un proyecto puede marcarlo como necesario por decisión del humano, con su evidencia aparte.
- **Viabilidad del tipo M: GO, REDISEÑO o NO-GO**, sobre ocho ejes: datos externos o en tiempo real (accesibles, estables y permitidos), términos de integraciones de terceros, cobros y suscripciones, permisos sensibles y sus declaraciones, contenido generado por usuarios, privacidad desde el diseño, funcionamiento sin conexión, y cuenta de desarrollador, plazos y costo. Como en el tipo C y a diferencia del B, no hay GO-CONDICIONADO: un acceso, un permiso o una regla de la tienda sin confirmar no se verifican después.
- **Stack del tipo M:** al menos dos alternativas entre Kotlin con Compose, React Native con Expo, Flutter y un envoltorio web (Capacitor o PWA), la más simple que cumpla primero, con criterio de equipo pequeño y presupuesto cero, y cuestionando el encargo que lleve a una mala elección.
- **Una fuente para los hechos de plataforma:** `types/M/PLATAFORMA-ANDROID.md` (se instala como `kit/PLATAFORMA-ANDROID.md`). Cada fila tiene identificador y dos estados: «Verificado el AAAA-MM-DD» con la dirección oficial, o «No verificado». La guía y las skills citan identificadores y no repiten cifras, fechas ni plazos; una prueba vigila las formas habituales de escribirlos.
- **Requisitos de referencia R1 a R7** en la guía (ubicación en primer plano, tiempo real sin conocer la posición de cada usuario, contenido de usuarios, acceso decidido por el servidor en una app solo de consumo, publicación, privacidad y uso al volante), abstractos y sin datos de negocio. La comprobación final de las etapas M2 y M3 se hace contra esa lista.
- **Uso al volante:** el kit adopta para las pantallas de teléfono usadas en marcha las medidas de la guía oficial de pantallas de coche. Es una decisión de diseño del kit, no una obligación comprobada (`[P-CON-5]` queda «No verificado»).
- **Sello:** la ficha llega con `kit.preset` y `kit.checks` vacíos. El tipo M acepta solo el preset `java-gradle`, que sigue sin verificar y el sello lo avisa; los presets verificados sobre esqueletos de servidor no se ofrecen porque no verifican una app.
- **Instalación:** `--tipo M` instala el núcleo, las dos skills de decisión, la guía, los hechos de plataforma, las plantillas, el sondeo de acceso, y líneas de `.gitignore` para las claves de firma y la configuración local; la ficha deniega su lectura. No instala catálogo, esqueletos, biblioteca de front ni `design/`.
- **Referencia pública de buenas prácticas:** el repositorio Now in Android de Google (<https://github.com/android/nowinandroid>, licencia Apache 2.0; README leído el 2026-11-26): arquitectura según la guía oficial, modularización y pruebas sin bibliotecas de simulacros. Se cita; no se copia código (ADR 0004). La dirección vive aquí y no en lo que se instala.

## Qué no entra todavía
- **M2:** esqueleto Android ejecutable y preset verificado. Falta: el esqueleto con pruebas; decidir cómo llega el envoltorio de Gradle (incluye un binario que el kit no distribuye; la salida propuesta es que lo genere quien adopte el esqueleto); una máquina con JDK, SDK de Android y Gradle; ejecutar el comando y registrarlo; un equipo real para segundo plano, tiempo real y uso al volante; una integración continua de ejemplo ejecutada de verdad.
- **M3:** catálogo de problemas del tipo M y su rama en `consultar-catalogo`.
- iOS, pantallas de coche, relojes, televisores y una biblioteca de pruebas de interfaz para móvil.

## Alternativas descartadas
| Alternativa | Por qué se descarta |
|---|---|
| Meter las apps móviles en el tipo B | Sus puertas son otras (sistema operativo, tienda, permisos, conducción); quedarían escondidas entre las de un servicio |
| Entregar un esqueleto Kotlin desde la primera etapa | Elegiría el stack por reflejo, el fallo que el tipo B evitó, y no se podría verificar sin las herramientas |
| Repetir cifras y plazos en la guía y en las skills | Las políticas cambian; con tres copias, dos quedan mentidas |
| Skills nuevas solo para el tipo M | Duplicarían reglas ya escritas (evidencia de acceso, proporcionalidad, cuestionar el encargo) |
| Dejar al tipo M los presets del tipo B | Un proyecto vería como verificado un preset que nunca se ejecutó sobre una app |
| GO-CONDICIONADO como en el tipo B | Una regla de la tienda o un permiso sin confirmar es justo lo que la puerta quiere detener |

## Consecuencias
- Un proyecto de app puede terminar el primer día con NO-GO o REDISEÑO. Es el resultado buscado.
- Los hechos de plataforma envejecen. Llevan fecha y hay que volver a leer la fuente antes de apoyarse en ellos; varios tienen cambios anunciados para 2027.
- La verificación se hizo leyendo las páginas a través de una herramienta que las extrae y resume: las filas resumen lo que devolvió, con citas breves o paráfrasis, y conviene contrastar en un navegador lo que decida el diseño. No es asesoría legal.
- Las filas de tiempo real describen Firebase Cloud Messaging, sin imponerlo. Un hallazgo condiciona el diseño: con las credenciales del proyecto se listan los temas de un equipo, así que un tema por zona no oculta la zona, y los temas no sirven como control de acceso. Queda sin comprobar lo que el proveedor ve o conserva de esas suscripciones.
- La puerta y los requisitos son reglas de juicio: ningún hook comprueba que una app cumpla R1 a R7. Las pruebas del kit comprueban que estén escritos, citados y con estado.
- El `CLAUDE.md` del núcleo y el documento de proceso hablan de `design/` y de anchos de página web, que en el tipo M no aplican; la guía lo dice. Adaptar el núcleo por tipo queda pendiente.
- La guarda de escritura no reconoce los almacenes de claves de Android (`.jks`, `.keystore`) como archivos sensibles; el tipo M los ignora en git y deniega su lectura. Ampliar la guarda queda pendiente.

## Sin hacer
Lo de «Qué no entra todavía», más las filas «No verificado» de `types/M/PLATAFORMA-ANDROID.md`.
