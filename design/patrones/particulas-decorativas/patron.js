/* Partículas decorativas con apagado automático: no se crean con prefers-reduced-motion (y se retiran si cambia) y se
   pausan cuando la pestaña está oculta. Las posiciones se asignan por CSSOM (compatible con una CSP estricta). */
(() => {
  'use strict';
  const caja = document.querySelector('[data-particulas]');
  if (!caja) return;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)');
  const MAXIMO = 24;

  const crear = () => {
    if (caja.children.length || reducido.matches) return;
    const n = Math.min(Number(caja.dataset.particulas) || 12, MAXIMO);
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.style.setProperty('--x', `${Math.round(Math.random() * 96)}%`);
      p.style.setProperty('--y', `${Math.round(Math.random() * 96)}%`);
      p.style.setProperty('--d', `${(4 + Math.random() * 5).toFixed(1)}s`);
      p.style.setProperty('--r', `-${(Math.random() * 5).toFixed(1)}s`);
      caja.append(p);
    }
  };
  const alternar = () => (reducido.matches ? caja.replaceChildren() : crear());

  reducido.addEventListener('change', alternar);
  document.addEventListener('visibilitychange', () => caja.classList.toggle('pausada', document.hidden));
  caja.classList.toggle('pausada', document.hidden);
  alternar();
})();
