# Entrada escalonada

Los hijos directos de `.escalona` entran en cascada: `opacity` y `transform`, nunca propiedades de layout.

- El retraso sale de `--stagger` del preset (0 ms en `sobrio`, 60 ms en `expresivo`) y de la posición del hijo; no hay `style=""` (compatible con una CSP estricta).
- Con `prefers-reduced-motion` no hay animación y el contenido se ve entero desde el primer cuadro (la biblioteca de pruebas lo comprueba).
- Úsala una vez por pantalla, en lo que se ve al cargar.
