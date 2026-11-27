# Guía de decisión — tipo M: aplicaciones móviles (Android primero)

El tipo M cubre lo que se entrega como **aplicación instalada en un teléfono**, publicada en una tienda o repartida a un grupo cerrado, con o sin servidor propio. Igual que los tipos B y C, es una guía de decisión y no una plantilla: no impone lenguaje, framework ni arquitectura; ayuda a decidir si conviene construirla, con qué y con qué límites. Estado: **disponible como guía**. Trae esta guía, los hechos de plataforma con fuente y fecha (`kit/PLATAFORMA-ANDROID.md`), las ramas del tipo M de `evaluar-viabilidad` y `elegir-stack-proporcional`, el diseño de la interfaz (dos skills, el brief móvil y la lista de revisión visual) y un esqueleto Android mínimo en Kotlin con Compose, que es **una** de las salidas posibles y no la obligatoria (ver «Esqueleto Android»), y un catálogo de problemas (`kit/catalogo-m/`, ver «Catálogo de problemas»).

Las afirmaciones sobre Android, las herramientas y la tienda viven solo en `kit/PLATAFORMA-ANDROID.md`; aquí se citan por su identificador (`[P-…]`). Una fila «No verificado» no se da por cierta.

## Qué lo distingue
Un servicio (tipo B) corre donde quien lo opera manda. Una app corre en un equipo ajeno, con un sistema que la puede detener, y se publica a través de una tienda que pone condiciones:
- **El sistema decide cuándo corres:** segundo plano, ahorro de energía y cierre de procesos limitan lo que la app puede hacer, y eso condiciona la idea antes que el diseño.
- **Permisos:** cada uno se justifica ante el usuario y, los sensibles, ante la tienda.
- **La tienda es una dependencia crítica:** cuenta, revisión, pruebas previas, declaraciones y reglas de cobro pueden retrasar o impedir la publicación.
- **Datos personales en el bolsillo:** lo que la app recoge se decide al diseñar, no al publicar.
- **Versiones que no controlas:** un paquete instalado sigue ahí; el servidor tiene que convivir con versiones anteriores.
- **Red intermitente:** qué funciona sin conexión es una decisión, no un accidente.

## Qué queda fuera
- **iOS.** El alcance del tipo M es Android. Nada de esta guía ni de sus hechos de plataforma cubre iOS: si un proyecto lo marca como necesario (un usuario real que no pueda usar Android, no un «por si acaso»), es decisión del humano, se anota en el ADR y toda su evidencia se reúne aparte, desde cero.
- Esqueletos o presets de las otras alternativas (React Native, Flutter y envoltorio web).
- Pantallas de coche (Android Auto y Automotive OS), relojes y televisores. La guía de conducción se usa como referencia para el teléfono, no para construir apps de coche.
- La biblioteca de front web con sus tokens, presets, patrones, skills y pruebas: no se instalan. El diseño del tipo M tiene su propio recorrido (ver «Diseño de la interfaz»). Donde el `CLAUDE.md` del proyecto o las skills del núcleo (`prompt-de-modulo`, `cierre-de-modulo`) hablen de `design/styles.css`, `design/TOOLING.md`, `revision-visual` o anchos de página web, en el tipo M valen `design/DESIGN-BRIEF.md` (el que el proyecto escribe desde la plantilla móvil) y la lista de revisión visual móvil.

## El recorrido
1. **Viabilidad** (`evaluar-viabilidad`, sección 8). Ocho ejes con evidencia: datos externos o en tiempo real, términos de integraciones de terceros, cobros y suscripciones, permisos sensibles, contenido de usuarios, privacidad, funcionamiento sin conexión, y cuenta, plazos y costo de publicación. Veredicto **GO**, **REDISEÑO** o **NO-GO** en `DECISION-VIABILIDAD.md` y la plantilla `VIABILIDAD-TIPO-M.md` (`kit/plantillas/`). Con NO-GO, o REDISEÑO sin aprobar, se para y no se construye.
2. **Stack proporcional** (`elegir-stack-proporcional`, sección 9). Al menos dos alternativas entre Kotlin con Compose, React Native con Expo, Flutter y un envoltorio web (Capacitor o PWA), la más simple que cumpla primero, con criterios de equipo pequeño y presupuesto cero. Si hay servidor propio, sus decisiones usan las secciones 1 a 7. ADR con lo descartado (`kit/plantillas/ADR.md`). Que solo una alternativa tenga esqueleto no inclina la elección: decide el humano.
3. **Diseño de la interfaz** (ver su sección): estudiar las apps del sector (`estudiar-referencia-movil`), proponer direcciones (`explorar-direcciones-movil`), entre las que elige el humano, y escribir el brief. Va tras el stack y **antes del esqueleto** y de la primera pantalla.
4. **Especificación** (`especificar-funcionalidad`): criterios `CA-n` antes del prompt del módulo; los de segundo plano, permisos y estados de acceso dicen cómo se comprueban en un equipo real.
5. **Construcción por rebanadas verticales** con el proceso del núcleo. La primera rebanada ya se instala en un equipo real; la que arriesga más (segundo plano, tiempo real) va pronto, no al final. Cuando aparece un problema concreto, se consulta el catálogo.
6. **Vía de publicación desde temprano:** cuenta, política de privacidad y prueba cerrada tienen plazos propios [P-PUB-2] [P-PUB-3]; se empiezan antes de que el producto esté terminado.
7. **Cierre** con el informe del revisor y el sello.

## Diseño de la interfaz
**Principio:** si en el rubro ya hay apps parecidas, lo ideal es estudiar e imitar su **estilo** —navegación, jerarquía, densidad, tamaño de los controles, tono, estados vacíos y de error— y **no copiar** marca, logotipos, textos, iconos propios, ilustraciones ni pantallas concretas. La voz propia sigue siendo la del proyecto. La tienda prohíbe suplantar a otros e infringir sus derechos [P-MAR-1] [P-MAR-2]; hasta dónde se puede imitar un estilo no está comprobado [P-MAR-3].

Se reutiliza el método del diseño web del kit (referencias sin copiar, varias direcciones, elección del humano, revisión antes del cierre), no su contenido. El esfuerzo manual previsto del humano es **elegir**; lo demás lo hace el agente.
1. **Estudiar** (`estudiar-referencia-movil`): apps de referencia del sector, con la web como fuente principal; salida en texto, con fuente y fecha, en `design/ESTUDIO-REFERENCIAS.md`. No se guardan imágenes. Las capturas propias del humano en `referencias/` son opcionales, tienen prioridad y quedan fuera de git.
2. **Explorar** (`explorar-direcciones-movil`): varias direcciones descritas, con los tokens como idea y sin código; **elige el humano**.
3. **Escribir el brief** desde `kit/plantillas/BRIEF-DISENO-MOVIL.md` en `design/DESIGN-BRIEF.md`: pantallas clave, estados, tokens como idea, regla de conducción, accesibilidad y lo abierto.
4. **Revisar** cada pantalla construida con `kit/plantillas/REVISION-VISUAL-MOVIL.md`.

El diseño no elige el stack ni la marca: si una dirección pide algo que el stack elegido no da, se dice y decide el humano. Lo que se usa en marcha sigue R7 y la regla de conducción del kit [P-CON-5]. Si la app no tiene interfaz propia que diseñar, el paso se salta y se anota.

## Arquitectura
No se impone ninguna. Punto de partida proporcional: separar interfaz y datos, con una fuente de verdad por dato [P-ARQ-1]; capa de dominio y módulos solo cuando hagan falta [P-ARQ-4]; pruebas con dobles falsos antes que con simulacros [P-ARQ-2]. Referencia pública de buenas prácticas: **Now in Android** de Google [P-ARQ-5]. Está pensada para enseñar mucho más de lo que una app pequeña necesita: se toma el criterio, no la cantidad de piezas, y no se copia código.

## Esqueleto Android (opcional)
Un punto de partida para **una** de las salidas, Kotlin con Compose: un módulo, una pantalla vacía, un tema con tokens que ceden ante `design/DESIGN-BRIEF.md`, una prueba local, una prueba de interfaz instrumentada de ejemplo e integración continua de ejemplo. No es una app ni resuelve ninguno de los requisitos de referencia. Qué cumple y qué no comprueba: `kit/CONTRATO-ESQUELETOS.md`.
- **Cuándo:** solo después de que el humano elija esa alternativa y de escribir el brief. Con cualquier otra, no se declara el preset.
- **Cómo:** (1) se declara `kit.preset` `java-gradle` en `kit/FICHA-INFRA.json` y, en Windows, también `kit.checks` (ver «Sello y pruebas»); (2) se vuelve a instalar desde la carpeta del kit, primero con `--dry-run`; (3) se regeneran los archivos de `.claude/` desde la ficha, también desde la carpeta del kit: `node infra/generate-settings.mjs --ficha <proyecto>/kit/FICHA-INFRA.json --destino <proyecto>`; (4) el humano revisa `settings.local.generado.json` y lo copia sobre `settings.local.json`. Sin el paso 3 el sello sigue sin comprobaciones, porque reinstalar no sobrescribe `.claude/kit.json`.
- **No pisa lo que ya existe:** en un proyecto con código propio añadiría archivos nuevos, así que se revisa el plan.
- **El envoltorio de Gradle lo genera quien lo adopta** [P-HER-3]: el esqueleto no lo trae. Su `README.md` dice cómo generarlo, cómo comprobar que es el oficial [P-HER-9] y cómo versionarlo; si el proyecto ya tenía uno, no se pisa y se lee con `--diff`.

## Catálogo de problemas
Fichas de **problemas, no de soluciones** (`kit/catalogo-m/INDEX.md`): cuándo aparece cada uno, cuándo sobra, qué opciones hay (siempre incluida «no hacer nada»), cómo se comprueba, qué evitar, en qué hechos de plataforma se apoya y qué requisito de referencia toca. Se consulta con `consultar-catalogo` al elegir el stack, al especificar y al construir; lo que se adopta queda en un ADR, con ejemplos en `kit/ejemplos-adr-m/`. No elige el stack, no pone datos de negocio y no demuestra que un requisito se cumpla.

## Requisitos de referencia
Capacidades que el tipo M debe saber resolver. El esqueleto no las implementa; el catálogo tiene fichas para cada una. Cada una dice qué hay que resolver, cómo se comprueba y en qué hechos se apoya.

### R1. Servicio en primer plano de ubicación que sobreviva a los cierres
Un turno activo que el usuario inicia y termina, con seguimiento mientras dura.
- **Resolver:** arranque desde una acción del usuario con la app visible; notificación del servicio, que el usuario puede no ver o descartar [P-PER-1] [P-PER-4], así que no prueba que el turno siga ni es el único modo de terminarlo; fin del servicio al acabar el turno. «Sobrevivir» no se puede prometer: el usuario puede detener la app sin aviso y volver a arrancar tiene restricciones. Se diseña para **detectar la interrupción, recuperarse en la siguiente oportunidad permitida y decirlo con claridad**, sin fingir que el turno siguió. Sin el permiso de ubicación en segundo plano, un mensaje push no permite recrear el seguimiento desde ahí; puede avisar para que el usuario lo reanude desde la notificación [P-RT-6].
- **Comprobar:** en equipos reales de los fabricantes de los usuarios, con pantalla apagada durante un turno completo, reposo forzado, detención por el usuario, cierre por falta de memoria, reinicio y ahorro de batería del fabricante; un registro por equipo con lo que pasó. El emulador solo no basta.
- **Plataforma:** [P-FGS-1] a [P-FGS-14], [P-UBI-2], [P-UBI-6], [P-UBI-7], [P-UBI-8], [P-PER-1], [P-PER-4], [P-RT-6].

### R2. Tiempo real sin que el servidor sepa dónde está cada usuario
Novedades con la app abierta y en segundo plano.
- **Resolver:** la posición se compara **en el equipo**; el servidor entrega por ámbitos amplios (o todo) y la app filtra.
  - **Un tema por zona no esconde la zona:** con las credenciales del proyecto se listan los temas de un equipo [P-RT-7], y lo que ve el proveedor no está comprobado [P-RT-11] [P-RT-9]. Punto de partida: un ámbito único y amplio. Si se usan temas por zona, el servidor propio no recibe identificadores de registro y se declara quién tiene las credenciales; si los necesita por otra razón (avisos a una persona, acceso, sanciones), los temas por zona no cumplen este requisito. La exportación de datos de entrega puede juntar equipo y tema [P-RT-19]: con temas por zona queda apagada.
  - Pedir datos de una zona entrega esa zona al servidor: se decide el tamaño mínimo aceptable, se declara y no se une a la identidad; si la petición identifica a la persona (R4), el ámbito es el mismo para todos. La dirección de red también puede delatar una ubicación aproximada [P-RT-5]: se declara y no se guarda junto a la zona.
  - Con la app abierta, conexión o consulta periódica; en segundo plano, mensajería push [P-RT-1]. La prioridad alta es solo para lo que muestra una notificación; lo demás puede esperar al fin del reposo [P-RT-2]. Los temas priorizan el volumen sobre la latencia [P-RT-3] y no hay plazo de entrega comprobado [P-RT-17]: se mide antes de prometerlo.
  - Cada mensaje lleva caducidad [P-RT-12] y lo que llega tarde se muestra como antiguo. La app vuelve a suscribirse si cambia su identificador [P-RT-13]. Antes de elegir la configuración de envío se revisa [P-RT-15] [P-RT-16].
- **Comprobar:** captura de las peticiones y de los registros del servidor sin coordenadas; latencia medida en un equipo real con la app abierta, en segundo plano y en reposo; reconexión tras perder la red sin duplicados; revisión de que el servidor propio no puede unir a una persona con una zona (identificadores que recibe, quién tiene las credenciales del proyecto y qué se exporta de la mensajería).
- **Plataforma:** [P-RT-1] a [P-RT-19], [P-FGS-3], [P-FGS-4], [P-FGS-12], [P-UBI-4].

### R3. Contenido generado por usuarios con denuncia, bloqueo y sanciones
- **Resolver:** aceptación de las condiciones antes de publicar; qué se prohíbe; denunciar contenido y usuarios y bloquear desde la app; sanciones que **decide y hace cumplir el servidor**; quién revisa, en cuánto tiempo y qué pasa si nadie puede hacerlo; registro de cada medida y vía de reclamo. Una sanción no se apoya en dar de baja de un tema [P-RT-7] [P-RT-8].
- **Comprobar:** pruebas con dos usuarios (lo bloqueado deja de verse; un sancionado recibe el rechazo del servidor aunque la app esté sin actualizar) y una denuncia de punta a punta hasta quien modera.
- **Plataforma:** [P-UGC-1] a [P-UGC-3], [P-RT-3], [P-RT-7], [P-RT-8].

### R4. Acceso decidido por el servidor en una app solo de consumo
Prueba gratuita, bloqueo y planes.
- **Resolver:** el servidor es la única fuente de verdad del acceso; la app consulta y muestra. Sin red, vale el último estado conocido con caducidad, sin confiar en el reloj del equipo. La prueba gratuita se ata a la cuenta y resiste una reinstalación. La app no vende ni conduce a otro pago: ninguna pantalla, mensaje ni ficha de la tienda lleva enlaces o botones de compra. La pantalla de bloqueo dice el estado y deja llegar a la cuenta, la privacidad y la eliminación. Lo reservado a quien tiene acceso no viaja por temas, a los que cualquier app puede suscribirse [P-RT-3] [P-RT-8]: el aviso va sin contenido y el detalle se pide al servidor, que comprueba el acceso. Como esa petición identifica la cuenta, el ámbito pedido es único e igual para todos: ni la zona de la persona ni la del aviso concreto, que también la delataría.
- **Comprobar:** pruebas del servidor para cada estado y cada transición; una app con el reloj cambiado o sin red más allá de la caducidad no gana acceso; revisión de todos los textos y enlaces antes de publicar, releyendo la política vigente.
- **Plataforma:** [P-PAG-1] a [P-PAG-7], [P-PRI-5], [P-RT-3], [P-RT-8].

### R5. Requisitos de publicación en la tienda
Seguridad de los datos, política de privacidad, eliminación de cuenta, prueba cerrada y formato de paquete.
- **Resolver:** lista de publicación con responsable y evidencia por punto, incluida la cuenta de desarrollador, la versión de Android de destino, la firma y las declaraciones de permisos y servicios. La cuenta, la identidad y los pagos son pasos manuales del humano.
- **Comprobar:** cada punto con su evidencia (dirección pública de la política, ruta de eliminación probada, paquete firmado generado sin claves en el repositorio, probadores inscritos y fecha de inicio de la prueba cerrada).
- **Plataforma:** [P-PUB-1] a [P-PUB-9], [P-PRI-1] a [P-PRI-5], [P-UBI-5], [P-UBI-8].

### R6. Ubicación mínima y privacidad desde el diseño
- **Resolver:** inventario de datos (qué, para qué, dónde, cuánto tiempo, quién lo recibe, incluidas las bibliotecas); aproximada antes que precisa y primer plano antes que segundo; lo que puede quedarse en el equipo se queda; sin coordenadas ni datos personales en registros, informes de fallos o analítica; la app sigue siendo útil, o lo explica, si el usuario concede menos de lo pedido.
- **Comprobar:** prueba que falle si una petición o un registro lleva coordenadas; recorrido con ubicación aproximada y con cada permiso negado; el inventario coincide con la política y con el formulario de la tienda.
- **Plataforma:** [P-UBI-1], [P-UBI-3], [P-UBI-5], [P-UBI-9], [P-PER-2], [P-PER-3], [P-PRI-3], [P-PRI-4].

### R7. Uso al volante
Objetivos táctiles grandes, texto corto y nada dinámico que distraiga.
- **Resolver:** en las pantallas que se usan en marcha se aplica entera la regla de conducción del kit, aunque la app sea de teléfono; su texto está en un solo sitio y parte de la guía de pantallas de coche [P-CON-1] a [P-CON-4] y [P-CON-7]. Es una decisión de diseño del kit [P-CON-5], no una obligación comprobada [P-CON-8].
- **Comprobar:** prueba de interfaz que mida el tamaño y la separación de los objetivos y la longitud de los textos; revisión en un equipo real montado como en el vehículo, con sol y de noche. Las normas de tránsito de cada país se consultan aparte [P-CON-6].
- **Plataforma:** [P-CON-1] a [P-CON-8].

## Sello y pruebas
La ficha (`kit/FICHA-INFRA.json`) llega con `kit.preset` y `kit.checks` **vacíos**: sin pruebas el sello de pre-merge se niega. Al elegir el stack, el proyecto escribe sus `kit.checks`. El único preset que el tipo M acepta es `java-gradle` (`./gradlew --no-daemon check` [P-HER-1]). Está **verificado solo sobre el esqueleto Android del kit**, en Windows y con las versiones, la fecha y los límites que registra el kit (`types/M/esqueletos/VERIFICACION.md`): no verifica tu proyecto, otras versiones ni otros sistemas. En Windows sin shell POSIX el sello usa `cmd`, que no entiende ese comando: se escribe `.\gradlew.bat --no-daemon check` en `kit.checks` (en el archivo, con la barra invertida duplicada) y se autoriza en `permisos.permitidos`. El `.\` hace falta cuando la sesión no busca programas en la carpeta actual. `check` no corre las pruebas instrumentadas [P-HER-1]: lo que dependa de un equipo se registra aparte.

Lo que falta todavía, aunque el sello salga:
1. Un equipo real para lo que ni la máquina ni el emulador demuestran (R1, R2, R7).
2. Ejecutar las pruebas instrumentadas, en un equipo o en un emulador: hoy solo se compilan.
3. Una variante de publicación: firma, paquete de la tienda [P-PUB-4] [P-PUB-5] y reducción de código.
4. El sello con el comando del preset sin cambios en macOS o Linux: allí no se ha ejecutado.
5. Pantallas de coche (Android Auto), si algún día entran en el alcance: nada las cubre.

Si el proyecto elige otra alternativa (React Native, Flutter o envoltorio web), no hay preset ni esqueleto: escribe sus `kit.checks` y los autoriza en `permisos.permitidos` de la ficha.

## Qué no recortar nunca
- Pedir los permisos mínimos, en contexto, con la app útil si se niegan.
- Secretos y claves de firma fuera del repositorio y de la app: lo que va dentro del paquete se considera público.
- Acceso, bloqueos y sanciones decididos en el servidor.
- Datos personales y ubicación: mínimos, declarados y borrables.
- Denunciar y bloquear si hay contenido de usuarios.
- La regla de conducción en toda pantalla que se use en marcha [P-CON-5].
- Que ninguna pantalla se bloquee por un tercero y que lo antiguo se muestre como antiguo.

## Cuándo preguntar al humano
Igual que en el tipo B: solo dudas técnicas y una vez, con recomendación. Los datos de negocio (duración de una prueba, planes, precios, reglas de sanción, países) no se inventan ni se dan por defecto: si faltan y bloquean, se piden. La cuenta de desarrollador, su cuota, la verificación de identidad, las claves de firma y cada publicación son pasos del humano.
