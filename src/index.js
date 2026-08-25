import { validateEvent } from './utils/validator.js';
import { createNotionLead } from './integrations/notion.js';
import { sendPrevisivelEmail } from './integrations/ses.js';
import { createAsanaTask } from './integrations/asana.js';
import { saveStepEvent, saveLeadEvent, updateLeadAggregate } from './services/dynamodb.js';
import { getSecrets } from './services/ssm.js';

// Cache de secrets (cold start)
let secrets = null;

/**
 * Handler principal da Lambda
 * Processa eventos step_previsivel e lead_previsivel
 */
export const handler = async (event) => {
  console.log(JSON.stringify({ message: 'Event received', headers: event.headers }));

  try {
    // Validar método e content-type
    if (event.requestContext.http.method !== 'POST') {
      return buildResponse(405, { error: 'Method not allowed' });
    }

    // Parse do body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (err) {
      console.error(JSON.stringify({ error: 'Invalid JSON', details: err.message }));
      return buildResponse(400, { error: 'Invalid JSON' });
    }

    // Validar segredo compartilhado (opcional)
    const sharedSecret = event.headers['x-previsivel-token'];
    if (process.env.VALIDATE_TOKEN === 'true') {
      if (!secrets) {
        secrets = await getSecrets();
      }
      if (sharedSecret !== secrets.sharedSecret) {
        console.warn(JSON.stringify({ warning: 'Invalid token', ip: event.requestContext.http.sourceIp }));
        return buildResponse(401, { error: 'Unauthorized' });
      }
    }

    // Validar estrutura do evento
    const validation = validateEvent(body);
    if (!validation.valid) {
      console.error(JSON.stringify({ error: 'Validation failed', details: validation.errors }));
      return buildResponse(400, { error: 'Invalid event structure', details: validation.errors });
    }

    // Ramificar por tipo de evento
    if (body.evento === 'step_previsivel') {
      await handleStepEvent(body);
      return buildResponse(200, { ok: true, type: 'step' });
    } else if (body.evento === 'lead_previsivel') {
      // Carregar secrets se ainda não carregados (só para lead)
      if (!secrets) {
        secrets = await getSecrets();
      }
      const result = await handleLeadEvent(body, secrets);
      return buildResponse(200, { ok: true, type: 'lead', result });
    } else {
      return buildResponse(400, { error: 'Unknown event type' });
    }

  } catch (err) {
    console.error(JSON.stringify({ error: 'Handler failed', details: err.message, stack: err.stack }));
    return buildResponse(500, { error: 'Internal server error' });
  }
};

/**
 * Processa evento de passo do funil
 */
async function handleStepEvent(body) {
  console.log(JSON.stringify({ message: 'Processing step event', passo: body.passo }));
  await saveStepEvent(body);
}

/**
 * Processa evento de lead completo
 * Executa Notion + SES + Asana + DynamoDB em paralelo com try/catch independentes
 */
async function handleLeadEvent(body, secrets) {
  console.log(JSON.stringify({
    message: 'Processing lead event',
    email: body.identidade?.email,
    degrau: body.degrau_atingido
  }));

  const results = {
    notion: { success: false },
    email: { success: false },
    asana: { success: false },
    dynamodb: { success: false }
  };

  // Executar integrações em paralelo com try/catch independentes
  await Promise.allSettled([
    // Notion (crítico)
    (async () => {
      try {
        await createNotionLead(body, secrets.notionToken);
        results.notion.success = true;
        console.log(JSON.stringify({ message: 'Notion lead created', email: body.identidade.email }));
      } catch (err) {
        results.notion.error = err.message;
        console.error(JSON.stringify({ error: 'Notion failed', details: err.message, email: body.identidade.email }));
      }
    })(),

    // SES (só se tiver email)
    (async () => {
      if (!body.identidade?.email) {
        results.email.skipped = true;
        return;
      }
      try {
        await sendPrevisivelEmail(body);
        results.email.success = true;
        console.log(JSON.stringify({ message: 'SES email sent', email: body.identidade.email }));
      } catch (err) {
        results.email.error = err.message;
        console.error(JSON.stringify({ error: 'SES failed', details: err.message, email: body.identidade.email }));
      }
    })(),

    // Asana (só se tiver email)
    (async () => {
      if (!body.identidade?.email) {
        results.asana.skipped = true;
        return;
      }
      try {
        await createAsanaTask(body, secrets.asanaToken);
        results.asana.success = true;
        console.log(JSON.stringify({ message: 'Asana task created', email: body.identidade.email }));
      } catch (err) {
        results.asana.error = err.message;
        console.error(JSON.stringify({ error: 'Asana failed', details: err.message, email: body.identidade.email }));
      }
    })(),

    // DynamoDB
    (async () => {
      try {
        await saveLeadEvent(body);
        await updateLeadAggregate(body);
        results.dynamodb.success = true;
        console.log(JSON.stringify({ message: 'DynamoDB records saved', email: body.identidade.email }));
      } catch (err) {
        results.dynamodb.error = err.message;
        console.error(JSON.stringify({ error: 'DynamoDB failed', details: err.message, email: body.identidade.email }));
      }
    })()
  ]);

  // Responder 200 se o Notion gravou (crítico para CRM)
  if (!results.notion.success) {
    console.error(JSON.stringify({ error: 'Critical: Notion failed', results }));
    throw new Error('Critical integration failed');
  }

  return results;
}

/**
 * Constrói resposta HTTP
 */
function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}
