# Revisión visual móvil — {{proyecto}}

Lista para pasar en cada pantalla o rebanada con interfaz, antes de pedir el cierre. La fuente de verdad es `design/DESIGN-BRIEF.md`. En el tipo M hace el papel de la revisión visual web. Cada punto termina en **Pasa**, **Falla** o **No comprobado**, con su evidencia en texto (qué se hizo, en qué equipo y qué se vio). Lo no comprobado se dice; el emulador no demuestra el sol, la mano ni el vehículo. Ningún hook comprueba esta lista.

- **Pantalla o rebanada:** _( )_
- **Fecha, equipo y versión de Android:** _( )_

| Punto | Qué se comprueba | Cómo | Resultado y evidencia |
|---|---|---|---|
| Contraste | Texto, iconos y controles llegan al mínimo [P-ACC-2], en claro y en oscuro y sobre el peor fondo | Medirlo con una herramienta, no a ojo | |
| Tamaños táctiles | Cada objetivo llega al mínimo [P-ACC-1]; en pantallas usadas en marcha, al de la regla de conducción [P-CON-5] [P-CON-1] | Inspector de la interfaz y prueba con el pulgar | |
| Estados | Carga, vacío, error, sin red y bloqueo existen, dicen qué hacer y el color no es la única señal | Provocar cada uno | |
| Orientación | Vertical, horizontal y pantalla grande sin cortes ni controles inalcanzables [P-ACC-6]; nada queda bajo las barras del sistema [P-ACC-7] | Girar el equipo y probar un tamaño grande | |
| Tamaño de letra del sistema | Con la letra al máximo nada se corta ni se solapa [P-ACC-3] | Cambiarlo en los ajustes del equipo | |
| Modo oscuro | Sigue la opción del sistema y no quedan colores o iconos fijos del tema claro [P-ACC-5] | Alternar el tema | |
| Lectura de un vistazo | Se entiende lo principal en el tiempo de [P-CON-3] y los textos respetan [P-CON-2] en pantallas en marcha | Mostrar la pantalla un instante a otra persona y preguntar | |
| Sin red | Qué se ve y qué se puede hacer sin conexión (una app «sin conexión primero» al menos lee [P-ARQ-3]); regla del kit: lo antiguo se ve como antiguo y al volver la red nada se duplica | Modo avión antes y durante el uso | |
| En marcha | La regla de conducción del kit, entera y punto por punto [P-CON-5] | Equipo montado como en el vehículo, de día y de noche; se prueba con el vehículo detenido | |
| Lector de pantalla | Cada elemento tiene su descripción y el orden se entiende [P-ACC-4] | Recorrer con el lector activado | |
| Parecido sin copia | Nada de marca, logotipos, textos, iconos, ilustraciones ni pantallas de otra app (regla del kit); sin suplantar ni infringir derechos [P-MAR-1] [P-MAR-2] | Comparar con la lista de lo que no se toma | |
| Brief | Coincide con la dirección vigente y no usa valores que no estén anotados en la tabla de tokens | Releer el brief | |

## Defectos
| Defecto | Gravedad | Corregido o abierto |
|---|---|---|
| | | |
