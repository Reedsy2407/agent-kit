# Chip copiable

Una dirección (correo, enlace corto) que se copia con un clic y lo confirma de forma accesible.

- **Sin JavaScript** es un enlace `mailto:` normal; con `patron.js` pasa a ser un `<button>` con nombre accesible «Copiar correo usuario@ejemplo.org».
- La confirmación vive en una región `role="status"` / `aria-live="polite"` que existe desde el principio; se vacía sola a los 4 s.
- Si `navigator.clipboard` no está disponible, usa un respaldo con `execCommand('copy')` y, si tampoco puede, lo dice.
- No hay estilos en línea: compatible con una CSP estricta (`style-src 'self'`).

Adaptar: cambia `data-copiar`, `data-etiqueta` y `data-aviso` (el idioma del aviso). Si el perfil ya muestra correo en otro sitio, no repitas el chip: un solo punto de contacto.
Cubre: objetivo táctil de 44 px, foco de 3 px y contraste AA, medidos por la biblioteca de `tests/front/`.
