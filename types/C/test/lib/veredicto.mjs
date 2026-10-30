// Referencia ejecutable de la tabla de veredictos del tipo C (skill evaluar-viabilidad, sección 7). Solo sirve a las
// pruebas: la skill es la fuente de verdad y el criterio sigue siendo del agente; esto fija que los ejemplos y la tabla no se contradigan.

/** Devuelve { veredicto: 'GO' | 'REDISEÑO' | 'NO-GO', motivos: string[] } para un caso con la forma de ejemplos-viabilidad/*.json. */
export function veredictoTipoC(caso) {
  const { puerta, ejes } = caso;
  // Puerta de uso responsable: va antes que cualquier otro eje y no admite excepciones.
  if (puerta.funcionPrincipal === 'atacar-escanear-explotar-terceros' && !puerta.usoDefensivoClaro) {
    return { veredicto: 'NO-GO', motivos: ['función principal ofensiva sin uso defensivo claro'] };
  }
  const motivos = [];
  const d = puerta.porDefecto ?? {};
  if (!puerta.usuario) motivos.push('no declara quién la usa');
  if (!puerta.autorizacion) motivos.push('no declara la autorización sobre los sistemas');
  if (!puerta.efectoEnAjenos) motivos.push('no declara qué puede hacer a sistemas ajenos');
  if (!d.listaObjetivos) motivos.push('sin lista explícita de objetivos permitidos');
  if (!d.registro) motivos.push('sin registro de actividad');
  if (d.soloLecturaExiste && !d.soloLectura) motivos.push('existe modo de solo lectura y no es el predeterminado');

  const p = ejes.privilegios;
  if (p.nivel === 'excesivo' && !p.acotado) {
    if (!p.alternativaMenor) return { veredicto: 'NO-GO', motivos: [...motivos, 'privilegio total imprescindible, sin acotar y sin alternativa'] };
    motivos.push('privilegios excesivos con una alternativa menor');
  }
  if (!ejes.amenazasEntrada.modeloEscrito) motivos.push('sin modelo de amenazas de la entrada');
  if (!ejes.distribucion.integridad) motivos.push('sin canal para verificar la integridad');
  if (!ejes.externo.evidencia) motivos.push('lo externo sin evidencia de acceso');
  if (!ejes.mantenimiento.responsable) motivos.push('sin responsable de mantenimiento');
  return { veredicto: motivos.length ? 'REDISEÑO' : 'GO', motivos };
}
