/**
 * Integração com Amazon SES (v2)
 * Envia email transacional do Previsível
 */

import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { renderPrevisivelEmailHtml, EMAIL_SUBJECT } from './email-template.js';

const sesClient = new SESv2Client({
  region: process.env.SES_REGION || 'us-east-2'
});

/**
 * Envia email transacional via Amazon SES
 */
export async function sendPrevisivelEmail(body) {
  const { identidade, qualificacao, entregavel_email } = body;

  // Determinar tipo de equity
  const tipoEquity = qualificacao.tem_rsu ? 'RSU' : 'Stock option';

  // Montar HTML do email
  const htmlContent = renderPrevisivelEmailHtml({
    nome: identidade.nome,
    tipo: tipoEquity,
    janela: qualificacao.janela_vesting || '',
    impostoTotalBRL: entregavel_email.kpis.imposto_total_brl,
    patrimonioBRL: entregavel_email.kpis.patrimonio_bruto_brl,
    exposicaoUSD: entregavel_email.kpis.exposicao_usd,
    calendario: entregavel_email.calendario || []
  });

  // Enviar via SES
  const command = new SendEmailCommand({
    FromEmailAddress: process.env.SES_SENDER,
    Destination: {
      ToAddresses: [identidade.email]
    },
    Content: {
      Simple: {
        Subject: {
          Data: EMAIL_SUBJECT,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlContent,
            Charset: 'UTF-8'
          }
        }
      }
    }
  });

  const response = await sesClient.send(command);

  console.log(JSON.stringify({
    message: 'SES email sent',
    messageId: response.MessageId,
    email: identidade.email
  }));

  return response;
}
