// Prueba de humo del sitio publicado: solo lecturas (GET) con fetch, un bucle acotado y sin escribir nada.
// Uso: node scripts/humo.mjs <https://direccion-publica>
// Edita las listas de abajo para el proyecto. Sale con 1 y lista los fallos si algo no cumple.
const RUTAS_200 = ['/', '/en/'];
const RUTA_404 = '/__no-existe__';
const PDFS = []; // por ejemplo ['/assets/cv.pdf']
/* Texto que no debe aparecer en ninguna página: un teléfono, nombres que no se publican… (se añaden aquí, como expresiones). */
const PROHIBIDOS = [/\btel:/i, /(?:\+|\b00)\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3}[\s.-]?\d{3,4}\b/];
const CABECERAS = ['x-content-type-options', 'referrer-policy', 'x-frame-options', 'permissions-policy', 'content-security-policy'];

const base = (process.argv[2] ?? '').replace(/\/$/, '');
if (!/^https?:\/\/[^\s/]+$/.test(base)) {
  console.error('Uso: node scripts/humo.mjs <https://direccion-publica>');
  process.exit(2);
}

const fallos = [];
const pedir = (ruta) => fetch(base + ruta, { redirect: 'manual', signal: AbortSignal.timeout(15000) });

for (const ruta of RUTAS_200) {
  const r = await pedir(ruta);
  if (r.status !== 200) { fallos.push(`${ruta}: respondió ${r.status}, se esperaba 200`); continue; }
  const html = await r.text();
  for (const re of PROHIBIDOS) if (re.test(html)) fallos.push(`${ruta}: contiene texto prohibido (${re})`);
  if (ruta === '/') {
    for (const c of CABECERAS) if (!r.headers.get(c)) fallos.push(`/: falta la cabecera ${c}`);
    const csp = r.headers.get('content-security-policy') ?? '';
    const scripts = csp.split(';').map((s) => s.trim()).find((s) => s.startsWith('script-src')) ?? '';
    if (/'unsafe-inline'/.test(scripts)) fallos.push("/: la CSP permite 'unsafe-inline' en scripts");
  }
}

const r404 = await pedir(RUTA_404);
if (r404.status !== 404) fallos.push(`${RUTA_404}: respondió ${r404.status}, se esperaba 404`);
else {
  const html = await r404.text();
  const hoja = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/)?.[1] ?? html.match(/<link[^>]+href="([^"]+)"[^>]+rel="stylesheet"/)?.[1];
  if (!hoja) fallos.push('404: la página no enlaza una hoja de estilos');
  else if (!hoja.startsWith('/')) fallos.push(`404: la hoja de estilos (${hoja}) no usa una ruta absoluta desde la raíz`);
  else if ((await pedir(hoja)).status !== 200) fallos.push(`404: la hoja de estilos ${hoja} no carga`);
}

for (const pdf of PDFS) {
  const r = await pedir(pdf);
  const cuerpo = r.status === 200 ? Buffer.from(await r.arrayBuffer()) : Buffer.alloc(0);
  if (r.status !== 200 || cuerpo.subarray(0, 4).toString() !== '%PDF') fallos.push(`${pdf}: no es un PDF servido con 200`);
}

if (fallos.length) {
  console.error(`Humo: ${fallos.length} fallo(s)\n- ${fallos.join('\n- ')}`);
  process.exit(1);
}
console.log(`Humo correcto en ${base}`);
