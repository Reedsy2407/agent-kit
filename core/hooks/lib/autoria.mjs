// Comprobación de autoría antes del primer push: los correos de autor y committer del historial deben ser el
// correo «noreply» del proveedor de repositorios o uno público que el humano indique en la ficha (kit.autoria).
// Solo avisa: reescribir autoría es una excepción puntual que exige autorización explícita (ver el proceso).

const esNoreply = (correo) => /noreply/i.test(correo);

/** Devuelve los correos del historial (todas las ramas) que no son noreply ni están permitidos. */
export function revisarAutoria(git, permitidos = []) {
  const salida = git(['log', '--all', '--format=%ae%n%ce']);
  if (salida === null) return { ok: true, correos: [], personales: [], sinHistorial: true };
  const correos = [...new Set(salida.split('\n').map((c) => c.trim()).filter(Boolean))];
  const lista = permitidos.map((p) => p.toLowerCase());
  const permitido = (c) => esNoreply(c) || lista.some((p) => (p.startsWith('@') ? c.toLowerCase().endsWith(p) : c.toLowerCase() === p));
  const personales = correos.filter((c) => !permitido(c));
  return { ok: personales.length === 0, correos, personales };
}
