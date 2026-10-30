# Guía de decisión — tipo C: herramientas y software de sistemas

El tipo C cubre lo que se entrega como **binario o paquete instalable**: CLIs, daemons, librerías, proxies, servidores de protocolos y gestores de procesos, en Go, Rust o Python. Igual que el tipo B, es una guía de decisión y no una plantilla: enseña a decidir si conviene construirlo, con qué lenguaje y con qué límites. Estado: **disponible**. Trae esta guía, los esqueletos ejecutables de Go, Python y Rust con un contrato común (`kit/CONTRATO-ESQUELETOS.md`; se instalan solo si la ficha declara `kit.preset` con `go`, `python` o `rust`) y un catálogo de dieciocho problemas (`kit/catalogo-c/`). Lo que no se pudo comprobar en la máquina de verificación está dicho en `types/C/esqueletos/VERIFICACION.md` y en los pendientes del HANDOFF.

## Qué lo distingue
Un servicio (tipo B) se despliega en un lugar que controla quien lo opera. Una herramienta (tipo C) se instala en máquinas ajenas, y de ahí salen sus problemas propios:
- **Instalación y actualización:** cómo llega, cómo sabe el usuario que lo recibido es lo publicado, cómo se actualiza y se retira.
- **Permisos:** corre con los privilegios de quien la lanza, a veces administrador. El radio de daño de un fallo es el del equipo del usuario, no el de un contenedor.
- **Multiplataforma:** lo que funciona en un sistema puede no funcionar en otro; solo cuenta lo que se ejecutó allí.
- **Entrada no confiable:** argumentos, archivos, red y variables de entorno llegan de quien sea. Se valida en el borde y se escucha solo en la interfaz local por defecto.
- **Mantenimiento:** un binario instalado vive más que el entusiasmo de quien lo escribió. Quién lo mantiene y por cuánto tiempo se decide antes de construir.

## Qué queda fuera, y por qué no hay tipo D
Quedan fuera las herramientas cuya función principal es atacar, escanear o explotar sistemas de terceros sin un uso defensivo claro. **No hay tipo D**: no existe un cauce aparte para lo ofensivo. Lo defensivo o de doble uso se construye bajo el tipo C, pero solo después de pasar la **puerta de uso responsable** (quién lo usa, sobre qué sistemas tiene autorización, qué puede hacer a sistemas ajenos; con lista de objetivos permitidos, registro de actividad y solo lectura por defecto). Ningún catálogo, ejemplo ni ADR del kit describe técnicas de ataque ni cargas útiles.

## El recorrido
1. **Viabilidad** (`evaluar-viabilidad`, sección 7). Primero la puerta de uso responsable; después plataformas, privilegios, modelo de amenazas de la entrada, distribución y actualización, acceso a lo externo y mantenimiento, cada eje con evidencia. Veredicto **GO**, **REDISEÑO** o **NO-GO** en `DECISION-VIABILIDAD.md` y la plantilla `VIABILIDAD-TIPO-C.md` (`kit/plantillas/`). Con NO-GO, o REDISEÑO sin aprobar, se para y no se construye. Ejemplos abstractos: `kit/ejemplos-viabilidad-c/` (en el kit: `types/C/ejemplos-viabilidad/`).
2. **Stack proporcional** (`elegir-stack-proporcional`, sección 8). Al menos dos alternativas entre Go, Rust y Python, la más simple primero; criterios de binario único, rendimiento medido, seguridad de memoria, ecosistema, curva de aprendizaje y costo de mantenimiento. ADR con lo descartado (`kit/ejemplos-adr-c/`; en el kit: `types/C/ejemplos-adr-c/`).
3. **Esqueleto** (opcional). Con el lenguaje elegido, el humano declara `kit.preset` en la ficha (`go`, `python` o `rust`) y vuelve a correr el instalador (con `--dry-run` antes): llega un CLI y un daemon mínimos, con pruebas, integración continua y publicación de ejemplo; el sello usa los comandos de ese preset. Cada esqueleto declara qué se verificó y qué no en `types/C/esqueletos/VERIFICACION.md`.
4. **Catálogo** (`consultar-catalogo`, rama del tipo C). Cuando aparece un problema (ciclo de vida, control y contrato, datos y entrada/salida, pruebas y extensión, seguridad por defecto, operación), se lee su ficha de `kit/catalogo-c/`: señales de que aplica y de que sobra, opciones incluida «no hacer nada», costo y comprobación, con notas por stack de Go, Python y Rust. Las fichas de seguridad son defensivas y no sustituyen la puerta de uso responsable. Cada decisión grande se registra en un ADR (`kit/plantillas/ADR.md`; ejemplos en `kit/ejemplos-adr-c/`).
5. **Especificación** (`especificar-funcionalidad`), prompt del módulo, construcción por rebanadas y cierre: igual que en el tipo B (`types/B/GUIA-DECISION.md`, pasos 3 y 6, que aquí son 5 y siguientes); el proceso de módulos vive en el núcleo.

## Qué no recortar nunca
- La puerta de uso responsable y sus valores por defecto seguros.
- Validar la entrada en el borde y pedir los privilegios mínimos.
- Secretos fuera de archivos y de argumentos de línea de órdenes.
- Un canal para verificar la integridad de lo que se distribuye.

## Cuándo preguntar al humano
Igual que en el tipo B: solo dudas técnicas y una vez, con recomendación. Decidir quién usará la herramienta y sobre qué sistemas tiene autorización no es una duda técnica que se resuelva con un valor por defecto: sin esa respuesta, la viabilidad es REDISEÑO.
