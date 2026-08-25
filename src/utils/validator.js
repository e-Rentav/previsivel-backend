/**
 * Validador de estrutura de eventos
 */

/**
 * Valida estrutura do evento recebido
 */
export function validateEvent(body) {
  const errors = [];

  // Validação comum
  if (!body.evento) {
    errors.push('Campo "evento" obrigatório');
  }

  if (!body.timestamp) {
    errors.push('Campo "timestamp" obrigatório');
  }

  // Validação específica por tipo
  if (body.evento === 'step_previsivel') {
    if (typeof body.passo !== 'number') {
      errors.push('Campo "passo" deve ser número');
    }
    if (typeof body.degrau_atingido !== 'number') {
      errors.push('Campo "degrau_atingido" deve ser número');
    }
  } else if (body.evento === 'lead_previsivel') {
    // Validar identidade
    if (!body.identidade) {
      errors.push('Campo "identidade" obrigatório para lead');
    } else {
      if (!body.identidade.nome) {
        errors.push('Campo "identidade.nome" obrigatório');
      }
      if (!body.identidade.email) {
        errors.push('Campo "identidade.email" obrigatório');
      }
    }

    // Validar qualificação
    if (!body.qualificacao) {
      errors.push('Campo "qualificacao" obrigatório para lead');
    } else {
      if (typeof body.qualificacao.tem_rsu !== 'boolean') {
        errors.push('Campo "qualificacao.tem_rsu" deve ser boolean');
      }
      if (typeof body.qualificacao.tem_option !== 'boolean') {
        errors.push('Campo "qualificacao.tem_option" deve ser boolean');
      }
    }

    // Validar entregavel_email
    if (!body.entregavel_email) {
      errors.push('Campo "entregavel_email" obrigatório para lead');
    } else {
      if (!body.entregavel_email.kpis) {
        errors.push('Campo "entregavel_email.kpis" obrigatório');
      }
      if (!Array.isArray(body.entregavel_email.calendario)) {
        errors.push('Campo "entregavel_email.calendario" deve ser array');
      }
    }

    // Validar degrau_atingido
    if (typeof body.degrau_atingido !== 'number') {
      errors.push('Campo "degrau_atingido" deve ser número');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
