# Validación en los bordes (y inquilino desconocido como error)

## Problema
Las peticiones traen cuerpos, cabeceras de contexto (usuario, aplicación, inquilino) y rutas que conviene validar antes de llegar al dominio. Con varios inquilinos, su identificador decide qué datos se leen: tratarlo sin cuidado produce respuestas vacías que parecen «no hay datos».

## Señales de que aplica
- Entradas externas (HTTP, mensajes, archivos) llegan a código con reglas de negocio.
- Se usa un contexto por petición (usuario, inquilino, idioma) que el resto del código da por hecho.
- Un cliente más nuevo o más viejo que el servidor debe seguir funcionando.

## Señales de que sobra
- Un solo punto de entrada controlado por el mismo equipo, sin inquilinos: la validación declarativa del cuerpo y poco más.
- Si no hay inquilinos, toda la mitad de esta ficha sobra.

## Opciones
| Opción | Costo | Cuándo |
|---|---|---|
| No hacer nada: confiar en el cliente | Ninguno; datos corruptos y fallos tardíos | Nunca para entradas externas |
| Validación declarativa del cuerpo en el borde (campos obligatorios, rangos, formatos) y respuesta con lista de violaciones por campo | Bajo | Siempre |
| Invariantes en el dominio (el objeto no se puede construir inválido) | Bajo-medio | Reglas de negocio que no deben depender del transporte |
| Interceptor de contexto que exige las cabeceras necesarias y las limpia al terminar | Bajo | Hay contexto por petición |
| Modo estricto de inquilino: desconocido o ausente es error explícito | Bajo | Hay varios inquilinos |

## Cómo se comprueba
- Pruebas de cada validación: campo ausente, fuera de rango, formato inválido, campo desconocido (se tolera y se ignora).
- Pruebas del interceptor: cabecera presente, ausente, inválida, inquilino tomado de la ruta y limpieza del contexto al terminar (que no se filtre entre peticiones).
- Prueba de inquilino desconocido: la respuesta es un error claro, nunca una lista vacía ni el esquema por defecto.
- Prueba de que un mensaje con campo extra o con versión nueva no rompe al consumidor.

## Cómo suele resolverse
Una solución habitual declara la validación en los objetos de entrada, responde con la lista de campos, tolera campos desconocidos para desplegar en cualquier orden, deja el contexto de la petición en un interceptor y expresa las invariantes del dominio con excepciones de negocio. Un modo estricto convierte el inquilino ausente o desconocido en un error explícito.

## Anti-patrones frecuentes
- **Un inquilino desconocido o ausente que acaba, sin avisar, en el esquema por defecto.** Da respuestas vacías y diagnósticos falsos. Corrección: error explícito; arrancar el validador en modo que impone.
- Leer la cabecera sin comprobar que existe (fallo interno en vez de petición incorrecta).
- Exigir cabeceras de contexto en unos servicios y en otros no.
- Valores de referencia del inquilino escritos como texto fijo en el código. Corrección: configuración.
- Limpieza del contexto olvidada, que filtra datos de una petición a la siguiente.
- Validar solo en la pantalla.

## Notas por stack
Verificación (2026-10-23): lo marcado «Verificado el» se contrastó con la fuente enlazada en esa fecha (solo lo que dice la fuente); lo marcado «Comprobado ejecutando el esqueleto» se probó con los esqueletos de `types/B/esqueletos/`; lo marcado «No verificado» no se pudo confirmar y debe contrastarse antes de apoyarse en ello. Las versiones cambian: repite la comprobación al adoptarlo.

- **Java/Spring:** Bean Validation de Jakarta (`@Valid`) en los objetos de transferencia (`LocalValidatorFactoryBean`) y un `HandlerInterceptor` registrado con `WebMvcConfigurer.addInterceptors` para el contexto (la documentación advierte que un interceptor no es una buena capa de seguridad); cuidado con los contextos en hilos (`ThreadLocal`) y con hilos virtuales o asíncronos. Verificado el 2026-10-23 ([Spring Framework](https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html), [Spring Framework](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/interceptors.html)): Bean Validation en Spring y el registro de interceptores. No verificado: propagación del contexto en tareas asíncronas e hilos virtuales.
- **.NET:** atributos de validación o FluentValidation y un middleware para el contexto; el contexto vive en el ámbito de la petición. No verificado: comparativa de bibliotecas.
- **Node:** Un esquema (Zod 4 con `parse`, Ajv como validador de JSON Schema, u otro) por ruta y un middleware que fija el contexto con `AsyncLocalStorage`. Verificado el 2026-10-23 ([Zod](https://zod.dev/), [Ajv](https://ajv.js.org/), [Node.js](https://nodejs.org/docs/latest-v24.x/api/async_context.html)): Zod, Ajv y `AsyncLocalStorage`. No verificado: rendimiento según la biblioteca.
- **Python:** Modelos de Pydantic (FastAPI; el manejador de `RequestValidationError` se puede sustituir) o formularios y serializadores (Django); el contexto en variables de contexto (`contextvars`). Verificado el 2026-10-23 ([FastAPI](https://fastapi.tiangolo.com/tutorial/handling-errors/), [Python](https://docs.python.org/3/library/contextvars.html)): el manejo de errores de validación de FastAPI y `contextvars`. No verificado: Django.

## ADR de ejemplo
- [Sin multi-inquilino en la primera versión](../ejemplos-adr/sin-multi-inquilino-al-inicio.md)
