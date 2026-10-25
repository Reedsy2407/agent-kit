# Partículas decorativas

Puntos que flotan despacio en un margen, solo para dar vida. Es decoración: nada depende de ellas.

- `aria-hidden="true"` y `pointer-events: none`; animan solo `opacity` y `transform`, con ciclos de 4 a 9 s (nada parpadea).
- Se apagan solas: con `prefers-reduced-motion` no se crean (y se retiran si la preferencia cambia), se ocultan en pantallas estrechas y se pausan con la pestaña oculta.
- Brillo suave del token `--glow` (desaparece con `sobrio`). Máximo 24 partículas; 12 por defecto.
- El contraste del texto se mide contra el peor caso; por eso viven en un margen y no detrás del texto.
- No se pide un interruptor visible de efectos: el apagado automático es suficiente.

Adaptar: cambia el número (`data-particulas`), el ancho de la banda (`width`) o el lado (`left` / `right`). Si el género es otro, sustituye el punto por la forma que corresponda, manteniendo las reglas de arriba.
