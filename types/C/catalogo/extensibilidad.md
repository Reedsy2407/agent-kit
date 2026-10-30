# Extensibilidad: plugins en proceso aparte, scripts embebidos o módulos compilados

## Problema
Una herramienta que otros quieren ampliar sin tocar su código debe decidir dónde vive el código ajeno. Dentro del proceso (módulos compilados o un intérprete embebido) es rápido y cómodo, pero el código ajeno comparte memoria, privilegios y fallos con la herramienta. Fuera (otro proceso que habla por un protocolo) es más lento y más trabajoso, pero un fallo o un abuso queda contenido. La extensibilidad abre la puerta a código que el autor no revisó.

## Señales de que aplica
- Quien usa la herramienta necesita añadirle comportamiento propio y no puede ni debe modificar el código fuente.
- Hay una segunda persona o equipo que mantendría las ampliaciones.
- Un conjunto de variaciones (formatos, destinos, reglas) crece más rápido que el núcleo.

## Señales de que sobra
- El autor es el único que amplía la herramienta: añadir la variación al código es más simple que un mecanismo de extensión.
- Las variaciones se resuelven con configuración (listas de reglas, plantillas) sin ejecutar código.
- No hay una interfaz estable que ofrecer: el mecanismo nacería ya roto con el primer cambio interno.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: cambios en el código y publicar versión nueva | Ninguno de mecanismo; cada cambio exige publicar | El autor es el único que amplía |
| Configuración con reglas declarativas, sin código | Bajo-medio | Variaciones simples |
| Ampliaciones como procesos aparte que hablan por entrada y salida estándar o por un canal local | Medio: protocolo, arranque, ciclo de vida | Código de terceros o de poca confianza |
| Intérprete de un lenguaje de scripts embebido con una interfaz recortada | Medio-alto | Lógica pequeña y frecuente que debe ser rápida |
| Módulos compilados cargados en el proceso | Alto: compatibilidad de compilación, plataformas, seguridad | Rara vez; solo con código de plena confianza y mismo equipo |

## Cómo se comprueba
- Una prueba de un complemento que falla, se cuelga o responde basura: la herramienta sigue en pie, lo informa y sigue sin él.
- Una prueba de la frontera: lo que el complemento puede pedir está limitado a la interfaz documentada.
- Una prueba de compatibilidad: un complemento de la versión anterior de la interfaz funciona, o se rechaza con un mensaje claro.
- Una prueba de descubrimiento: solo se cargan complementos de ubicaciones declaradas y no de la carpeta de trabajo.
- Una prueba de recursos: un complemento que consume sin freno está limitado (ver la ficha de código de terceros).
- Una prueba de que los datos que se pasan al complemento no incluyen secretos que no necesita.

## Cómo suele resolverse
Se parte de la opción más aislada que cubra la necesidad: reglas declarativas si bastan y, si hace falta código, complementos que corren como procesos aparte y se comunican por un protocolo pequeño, versionado y con mensajes acotados. El proceso principal arranca cada complemento con una lista de argumentos y un entorno mínimo, le da plazos y un modo de pararlo, y trata cada respuesta como entrada no confiable. La interfaz ofrecida es deliberadamente más pequeña que lo que la herramienta puede hacer por dentro. Se evita cargar código en el mismo proceso salvo que el código sea de plena confianza.

## Anti-patrones frecuentes
- Ofrecer como interfaz todo el interior de la herramienta.
- Cargar complementos desde la carpeta de trabajo o desde rutas que escribe cualquier usuario.
- Ejecutar el código de un complemento con los mismos privilegios y secretos que el proceso principal sin necesidad.
- Un complemento que puede bloquear al principal por no tener plazos.
- No versionar la interfaz: cada cambio rompe todos los complementos.
- Construir una orden de texto con datos del complemento y pasarla a un intérprete de órdenes.
- Anunciar un mecanismo de extensión sin ninguna ampliación real que lo use.

## Notas por stack
Verificación (2026-10-30): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/C/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Go:** el paquete `plugin` carga código compilado en el proceso. Verificado el 2026-10-30 ([plugin](https://pkg.go.dev/plugin)): solo se admite en Linux, FreeBSD y macOS; la fuente lista como inconvenientes menor portabilidad, mal soporte del detector de carreras, orden de inicialización difícil de razonar, riesgo de cargar bibliotecas peligrosas si falla el programa anfitrión, fallos probables si el programa y los complementos no se compilan con la misma cadena de herramientas, las mismas opciones y dependencias, y que un complemento no se puede descargar; recomienda considerar comunicación entre procesos (sockets, tuberías, llamadas remotas, memoria compartida o archivos) como alternativa. Para procesos aparte, véase `os/exec` en la ficha de supervisión de hijos.
- **Python:** complementos como procesos aparte con `subprocess`. Verificado el 2026-10-30 ([subprocess](https://docs.python.org/3/library/subprocess.html#security-considerations)): por defecto no se invoca ningún intérprete de órdenes y los metacaracteres se pasan sin riesgo al hijo; con `shell=True` quien llama debe entrecomillar todo correctamente; `env` sustituye al entorno heredado y `cwd` cambia el directorio de trabajo del hijo. No verificado: la carga de módulos propios del lenguaje como complementos (descubrimiento y puntos de entrada) y los intérpretes embebidos.
- **Rust:** complementos como procesos aparte con `std::process::Command`. Verificado el 2026-10-30 ([Command](https://doc.rust-lang.org/std/process/struct.Command.html)): los argumentos se pasan al programa tal cual, sin intérprete de órdenes, y los efectos de comillas, expansiones o comodines no existen; `env_clear` impide heredar el entorno; con argumentos no fiables hay que tener cuidado en Windows con `cmd.exe` y los archivos por lotes, que decodifican los argumentos de forma no estándar. No verificado: la carga de bibliotecas dinámicas desde Rust, que la biblioteca estándar no cubre.

## ADR de ejemplo
- [Complementos como procesos aparte, sin cargar código en el proceso](../ejemplos-adr-c/complementos-en-proceso-aparte.md)
