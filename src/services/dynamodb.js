import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE;

/**
 * Grava evento de passo do funil
 */
export async function saveStepEvent(body) {
  const date = new Date(body.timestamp).toISOString().split('T')[0];
  const item = {
    PK: `EVENTO#${date}`,
    SK: `${body.timestamp}#${ulid()}`,
    evento: 'step_previsivel',
    passo: body.passo,
    degrau_atingido: body.degrau_atingido,
    timestamp: body.timestamp,
    created_at: new Date().toISOString()
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: item
  }));
}

/**
 * Grava evento de lead completo (coarsened, sem valores R$)
 */
export async function saveLeadEvent(body) {
  const date = new Date(body.timestamp).toISOString().split('T')[0];
  const item = {
    PK: `EVENTO#${date}`,
    SK: `${body.timestamp}#${ulid()}`,
    evento: 'lead_previsivel',
    email: body.identidade?.email?.toLowerCase() || '',
    degrau_atingido: body.degrau_atingido,
    tipo: determineEquityType(body.qualificacao),
    faixa_exposicao_fiscal: body.qualificacao?.faixa_exposicao_fiscal,
    faixa_patrimonio: body.qualificacao?.faixa_patrimonio,
    flag_irpfm: body.qualificacao?.flag_irpfm || false,
    janela_vesting: body.qualificacao?.janela_vesting || '',
    natureza_confirmada: body.qualificacao?.natureza_confirmada || false,
    timestamp: body.timestamp,
    created_at: new Date().toISOString()
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: item
  }));
}

/**
 * Atualiza agregado por e-mail (detecta recorrência)
 */
export async function updateLeadAggregate(body) {
  const email = body.identidade?.email?.toLowerCase();
  if (!email) return;

  const now = new Date().toISOString();

  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `LEAD#${email}`,
      SK: 'PERFIL'
    },
    UpdateExpression: `
      ADD run_count :one
      SET
        ultimo_visto = :now,
        ultimo_degrau = :degrau,
        ultima_qualificacao = :qual,
        primeiro_visto = if_not_exists(primeiro_visto, :now)
    `,
    ExpressionAttributeValues: {
      ':one': 1,
      ':now': now,
      ':degrau': body.degrau_atingido,
      ':qual': {
        tipo: determineEquityType(body.qualificacao),
        faixa_exposicao_fiscal: body.qualificacao?.faixa_exposicao_fiscal,
        faixa_patrimonio: body.qualificacao?.faixa_patrimonio,
        flag_irpfm: body.qualificacao?.flag_irpfm || false
      }
    }
  }));
}

/**
 * Determina tipo de equity (RSU ou Stock option)
 */
function determineEquityType(qualificacao) {
  if (qualificacao?.tem_rsu) return 'rsu';
  if (qualificacao?.tem_option) return 'option';
  return 'unknown';
}
