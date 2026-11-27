# ADR de ejemplo. El acceso lo decide el servidor

Ejemplo breve y abstracto. Úsalo como forma, no como texto.

Estado: aceptada

## Contexto
La app tiene una prueba gratuita y planes que se contratan fuera de ella. Debe funcionar un rato sin red sin que eso permita usarla sin derecho. Fichas: `kit/catalogo-m/acceso-suscripcion-solo-consumo.md`, `kit/catalogo-m/sin-red-ultimo-estado.md` y `kit/catalogo-m/cuenta-registro-integridad.md`.

## Decisión
El servidor guarda el estado de acceso ligado a la cuenta y lo comprueba en cada petición de algo reservado. La app guarda el último estado conocido con una caducidad que fija el servidor, medida con el reloj monótono; tras un reinicio sin red, lo reservado queda cerrado hasta volver a consultar. La app no vende ni enlaza a un pago.

## Alternativas descartadas
| Alternativa | Por qué se descarta | Costo que habría tenido |
|---|---|---|
| Decidir en la app con una bandera local | Se cambia desde el equipo | Acceso gratis para quien quiera |
| Medir la caducidad con la hora del equipo | Cambiar la hora la alarga | Prueba sin fin |
| Exigir red para todo | La app se usa donde falta cobertura | Inservible en el uso real |
| Contar la prueba por instalación | Reinstalar la reinicia | Prueba repetible |

## Lo que no se construye todavía
| Pieza | Señal |
|---|---|
| Veredictos de integridad | Abuso medido que las cuentas no frenan |
| Cobro dentro de la app | El negocio decide vender allí y se revisó la política |

## Consecuencias
Cada recurso reservado necesita su comprobación y su prueba en el servidor. Quien reinicia sin cobertura espera a tener red: se dice en la pantalla.

## Señal para revisar
Quejas de personas con derecho bloqueadas por falta de red, o abuso de la ventana sin conexión.
