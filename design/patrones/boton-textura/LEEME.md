# Botón con textura de líneas

Botón primario con una textura de líneas muy fina y un brillo suave al pasar el puntero.

- La textura y el brillo salen de los tokens del preset (`--textura-lineas`, `--glow-box`): con `sobrio.css` desaparecen sin tocar el componente.
- El texto va en `--paper` sobre `--brand` (contraste anotado en `styles.css`); la prueba de contraste mide además el peor caso de la textura (alfa máximo de la configuración).
- Altura de `--control` (56 px) y nunca menos de `--touch` (44 px). El foco de 3 px es el global de `styles.css`.

Adaptar: cambia el color solo en `styles.css`. No añadas degradados ni más capas: una sola textura, una sola acción primaria por pantalla.
