/* Chip copiable: convierte los enlaces con data-copiar en botones que copian el texto y avisan en una región en vivo.
   Sin dependencias y sin estilos en línea. Sin JavaScript queda el enlace mailto original. */
(() => {
  'use strict';

  const copiar = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      /* Respaldo para contextos sin la API del portapapeles. */
      const area = document.createElement('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.setAttribute('aria-hidden', 'true');
      area.style.setProperty('position', 'fixed');
      area.style.setProperty('opacity', '0');
      document.body.append(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      area.remove();
      return ok;
    }
  };

  for (const enlace of document.querySelectorAll('a[data-copiar]')) {
    const texto = enlace.dataset.copiar;
    const aviso = enlace.parentElement.querySelector('.chip-aviso');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = enlace.className;
    if (enlace.id) boton.id = enlace.id;
    boton.textContent = enlace.textContent;
    boton.setAttribute('aria-label', `${enlace.dataset.etiqueta || 'Copiar'} ${texto}`);
    let temporizador = 0;
    boton.addEventListener('click', async () => {
      const ok = await copiar(texto);
      if (!aviso) return;
      aviso.textContent = ok ? enlace.dataset.aviso || 'Copiado' : 'No se pudo copiar';
      clearTimeout(temporizador);
      temporizador = setTimeout(() => { aviso.textContent = ''; }, 4000);
    });
    enlace.replaceWith(boton);
  }
})();
