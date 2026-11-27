# ADR de ejemplo. Un turno interrumpido se detecta y se dice

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
Una app registra un periodo de actividad que la persona inicia y termina. El sistema, el fabricante o la propia persona pueden cortar el seguimiento sin avisar, y un registro con huecos ocultos es peor que no tener registro. Fichas: `kit/catalogo-m/servicio-primer-plano-interrupciones.md` y `kit/catalogo-m/pruebas-equipo-real.md`.

## Decisión
El seguimiento corre en un servicio en primer plano que nace de una acción de la persona. Deja marcas de vida en el equipo. Al volver a ejecutarse, la app compara la última marca con el momento actual; un hueco mayor que el admitido se guarda como interrupción, se muestra con su duración y ofrece reanudar. No se rellena ni se estima el tramo perdido. La promesa al usuario es que sabrá cuándo faltó el seguimiento.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Prometer que el seguimiento nunca se corta | La persona puede detener la app y el sistema también | Confianza rota en el primer corte |
| Rellenar el hueco con la ruta más probable | Presenta como medido lo inventado | Decisiones tomadas sobre datos falsos |
| Pedir la exención de batería al instalar | Restringido por la tienda y no impide la detención | Rechazo en la revisión |
| Trabajo programado en vez de servicio | El sistema lo aplaza | Huecos por diseño |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Reanudación automática desde segundo plano | Una vía permitida por la plataforma y comprobada en los equipos de los usuarios |
| Aviso desde el servidor para reanudar | Interrupciones frecuentes que la persona no nota |

## Consecuencias
Cada corte queda a la vista. Hace falta un guion de pruebas en equipos reales con detención, reposo, reinicio y ahorro de batería del fabricante, y su registro.

## Señal para revisar
Una proporción de periodos interrumpidos que haga inútil la función en algún fabricante, o un cambio de las reglas de segundo plano.
