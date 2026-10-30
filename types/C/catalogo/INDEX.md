# Catálogo de problemas del tipo C

Un catálogo de **problemas, no de soluciones**, para herramientas y software de sistemas (CLIs, daemons, librerías, proxies, servidores de protocolos, gestores de procesos) en Go, Python y Rust. Cada ficha dice cuándo el problema aplica y cuándo sobra, qué opciones hay (siempre incluida «no hacer nada»), cuánto cuesta cada una y cómo se comprueba. Se consulta con la skill `consultar-catalogo` (rama del tipo C), después de `evaluar-viabilidad` y durante `elegir-stack-proporcional`. Nada de aquí se implementa «porque sí»: se adopta cuando sus señales ya están presentes y se registra en un ADR.

Formato fijo de cada ficha: Problema · Señales de que aplica · Señales de que sobra · Opciones · Cómo se comprueba · Cómo suele resolverse (abstracto) · Anti-patrones frecuentes · Notas por stack · ADR de ejemplo.

Las **notas por stack** (Go, Python, Rust) son orientativas y llevan fecha: lo marcado «Verificado el AAAA-MM-DD» se contrastó con la fuente oficial enlazada en esa fecha (solo lo que ella dice); «Comprobado ejecutando el esqueleto» se probó con `types/C/esqueletos/` (registro en `types/C/esqueletos/VERIFICACION.md`); lo marcado «No verificado» no se pudo confirmar y debe verificarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptar una nota.

Las fichas de seguridad son **defensivas**: describen límites, plazos, privilegios mínimos y confinamiento; no describen técnicas de ataque ni cargas útiles. Antes de construir una herramienta de doble uso, pasa por la puerta de uso responsable de `evaluar-viabilidad`.

## Ciclo de vida
- [Recarga de configuración en caliente](recarga-configuracion-caliente.md)
- [Supervisión de procesos hijos con política de reinicio](supervision-procesos-hijos.md)
- [Apagado ordenado: drenar antes de salir](apagado-ordenado.md)

## Control y contrato
- [Control local de un daemon: canal y quién puede hablarle](control-local-daemon.md)
- [Contrato de un CLI: comandos, códigos de salida y salida para máquinas](contrato-cli.md)
- [Configuración validada al arrancar y protección de su archivo](configuracion-validada-arranque.md)

## Datos y entrada/salida
- [Modelo de concurrencia y contrapresión](concurrencia-contrapresion.md)
- [Persistencia en disco: formatos versionados, integridad y recuperación ante cortes](persistencia-en-disco.md)
- [Entrada no confiable en protocolos: límites, plazos y análisis defensivo](entrada-no-confiable-protocolos.md)

## Pruebas y extensión
- [Pruebas de propiedades y fuzzing para analizadores](pruebas-propiedades-fuzzing.md)
- [Extensibilidad: plugins en proceso aparte, scripts embebidos o módulos compilados](extensibilidad.md)
- [Ejecutar código de terceros con confinamiento y límites de recursos](codigo-de-terceros-confinamiento.md)

## Seguridad por defecto
- [Secretos en la máquina del usuario: qué protege el cifrado local y qué no](secretos-maquina-usuario.md)
- [Privilegios mínimos: instaladores, servicios del sistema y acceso al runtime de contenedores](privilegios-minimos.md)
- [Autenticación de APIs de control: token maestro frente a tokens con alcance](autenticacion-apis-control.md)

## Operación
- [Registro estructurado con rotación y sin datos sensibles](registro-estructurado-rotacion.md)
- [Empaquetado y releases multiplataforma: sumas de verificación y versionado](empaquetado-releases-multiplataforma.md)
- [Cambios reversibles: instantáneas y deshacer o rehacer en herramientas automáticas](cambios-reversibles.md)

## Antes de nada
La viabilidad de la idea (puerta de uso responsable, plataformas, privilegios, entrada, distribución, mantenimiento) no es una ficha del catálogo: es la puerta cero, la skill `evaluar-viabilidad`.

## Ejemplos de ADR
Decisiones breves y abstractas en `../ejemplos-adr-c/` (en el proyecto: `kit/ejemplos-adr-c/`). Son forma, no texto para copiar.
