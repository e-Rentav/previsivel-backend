/**
 * Integração com Brevo API
 * Envia email transacional com template 136
 */

const BREVO_API_URL = 'https://api.brevo.com/v3';

/**
 * Envia email transacional via Brevo
 */
export async function sendBrevoEmail(body, apiKey) {
  const { identidade, qualificacao, entregavel_email } = body;

  // Determinar tipo de equity
  const tipoEquity = qualificacao.tem_rsu ? 'RSU' : 'Stock option';

  const payload = {
    templateId: parseInt(process.env.BREVO_TEMPLATE_ID || '136', 10),
    to: [
      {
        email: identidade.email,
        name: identidade.nome
      }
    ],
    replyTo: {
      email: 'guilherme@e-rentav.com',
      name: 'e-Rentav'
    },
    params: {
      NOME: identidade.nome,
      TIPO: tipoEquity,
      JANELA: qualificacao.janela_vesting || '',
      IMPOSTO_TOTAL: entregavel_email.kpis.imposto_total_brl,
      PATRIMONIO: entregavel_email.kpis.patrimonio_bruto_brl,
      EXPOSICAO_USD: entregavel_email.kpis.exposicao_usd,
      calendario: entregavel_email.calendario || []
    }
  };

  const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brevo API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result;
}
