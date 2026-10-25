# Salud mínima — {{proyecto}}

Fecha: {{fecha}}. Lo mínimo que debe cumplirse para decir «está sano». Lo comprueba `node scripts/salud.mjs <dirección pública>` con `ops/salud.config.json`; lo que el script no puede ver, lo mira una persona.

## Lista
- [ ] **Responde:** la ruta principal devuelve el estado esperado.
- [ ] **Rápido:** la mediana de varias muestras está por debajo del tope acordado (no una sola medida).
- [ ] **Cabeceras de seguridad:** las esperadas están presentes (`x-content-type-options`, `referrer-policy`, `x-frame-options`, `permissions-policy`, `content-security-policy`) y la política de contenido no permite scripts en línea.
- [ ] **Enlaces críticos:** las rutas que el negocio necesita (inicio de sesión, pago, contacto, descarga) responden.
- [ ] **Una ruta real de negocio** hace lo que debe (no solo «la página carga»).
- [ ] **El error es honesto:** una ruta inexistente devuelve 404 con la página de error, no 200 ni un fallo interno.
- [ ] **Sin texto que no debe estar:** nada de datos personales ni de marcas ajenas en lo público.
- [ ] **Dependencias externas:** si una cae, el sistema degrada (último dato bueno, dato declarado etiquetado, «no disponible») y no se bloquea.
- [ ] **Datos (tipo B):** el último respaldo existe, tiene fecha reciente y se restauró alguna vez en una copia.
- [ ] **Cuotas y vencimientos:** nada a punto de agotarse (cuota, certificado, dominio, secreto con fecha).

## Tiempos de referencia
Mediana aceptable: ______ ms. Tope por ruta: ______. Disponibilidad esperada: ______.

## Cuándo se comprueba
Después de cada despliegue, y con la frecuencia que decida el responsable. Si falla algo, se abre `ops/incidentes/` y se sigue el runbook.
