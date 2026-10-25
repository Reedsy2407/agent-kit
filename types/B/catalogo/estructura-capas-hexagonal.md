# Estructura por capas o hexagonal (y cuándo no hace falta)

## Problema
Sin una frontera entre las reglas de negocio y todo lo demás (web, base de datos, mensajería, terceros), la lógica acaba repartida en controladores y consultas y no se puede probar sin levantar la infraestructura. Con demasiadas fronteras, cada cambio pequeño cruza una docena de archivos.

## Señales de que aplica
- Las reglas de negocio son reales y cambian (cálculos, estados, validaciones de dominio).
- Hay varias entradas (HTTP, mensajes, tareas) hacia el mismo caso de uso.
- Se quiere probar el dominio sin base de datos ni servidor.
- Un tercero (proveedor de correo, de pagos) podría cambiar.

## Señales de que sobra
- Operaciones de lectura y escritura sobre datos con pocas reglas (formularios, listados): capas finas bastan.
- Un servicio pequeño con un solo proveedor para cada cosa y sin segundo en el horizonte.
- Un equipo de una o dos personas que mantiene todo: la ceremonia cuesta más que el aislamiento.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: estructura plana del framework | Ninguno; la lógica se mezcla | Prototipo y utilidades |
| Tres capas simples (entrada, servicio, datos) | Bajo | Poca lógica de dominio |
| Módulos por dominio con las capas dentro de cada uno | Bajo-medio | Varias áreas de negocio en un mismo proceso |
| Hexagonal completa: puertos de entrada y salida, adaptadores, dominio puro | Medio | Dominio rico, varias entradas, terceros intercambiables |
| Hexagonal solo en los módulos con reglas, capas finas en el resto | Medio | Sistemas mixtos (la opción más proporcional) |
| Librería compartida entre servicios | Medio | Solo código realmente común (errores, identificadores); duplicar poco es más barato que acoplar |

## Cómo se comprueba
- Una prueba de arquitectura (por ejemplo, el dominio no importa de adaptadores ni del framework web) que falla en el build.
- Pruebas del dominio sin framework ni base de datos: se ejecutan en milisegundos.
- Pruebas de los casos de uso con dobles de los puertos.
- Revisión periódica: ¿hay puertos con una sola implementación que nadie va a reemplazar?

## Cómo suele resolverse
Una solución habitual separa cada contexto de negocio en entradas, salidas, casos de uso y dominio, con puertos hacia el exterior: la entrada traduce la petición a un comando, el caso de uso lo recibe y un servicio lo implementa. Lo común entre servicios se duplica poco en lugar de compartirse como una librería que los acople.

## Anti-patrones frecuentes
- Copiar la estructura completa de un sistema grande a uno pequeño.
- Una interfaz por cada clase aunque haya una sola implementación y ninguna razón para una segunda.
- El dominio dependiente de tipos del framework web (por llevar el estado HTTP en los errores) sin haberlo decidido.
- Una librería compartida que crece hasta ser un acoplamiento entre servicios.
- Capas que solo reenvían llamadas sin aportar nada.
- Mapeos entre tres representaciones del mismo dato en cada cruce.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** paquetes por contexto y dentro de ellos `adapter`, `port`, `domain`, `service`; comprobar con ArchUnit. No verificado: reglas concretas.
- **.NET:** proyectos o carpetas por contexto (dominio, aplicación, infraestructura); pruebas de arquitectura con una biblioteca específica. No verificado: biblioteca vigente.
- **Node:** carpetas por módulo con un dominio sin importaciones de infraestructura; la regla se puede comprobar con una prueba que lea las importaciones. No verificado.
- **Python:** paquetes por módulo y un dominio sin importar el framework; `import-linter` u otra herramienta. No verificado.

## ADR de ejemplo
- [Monolito modular antes que servicios separados](../ejemplos-adr/monolito-modular-primero.md)
