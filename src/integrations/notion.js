/**
 * Integração com Notion API
 * Cria item na base de prospecção
 */

const NOTION_API_VERSION = '2025-09-03';
const NOTION_API_URL = 'https://api.notion.com/v1';

/**
 * Cria lead na base de prospecção do Notion
 */
export async function createNotionLead(body, token) {
  const { identidade, perfil, qualificacao, degrau_atingido } = body;

  // Normalizar faixas: "media" → "média"
  const normalizeFaixa = (val) => val === 'media' ? 'média' : val;

  // Determinar tipo de equity
  const tipoEquity = qualificacao.tem_rsu ? 'RSU' : 'Stock option';

  // Calcular prioridade
  const prioridade = (!qualificacao.natureza_confirmada || qualificacao.faixa_exposicao_fiscal === 'alta')
    ? 'Alta'
    : 'Média';

  // Montar payload conforme estrutura da spec
  const payload = {
    parent: {
      type: 'data_source_id',
      data_source_id: process.env.NOTION_DATA_SOURCE_ID
    },
    properties: {
      'Nome': {
        title: [{ text: { content: identidade.nome || '' } }]
      },
      'E-mail': {
        email: identidade.email || null
      },
      'WhatsApp': {
        phone_number: identidade.whatsapp || null
      },
      'Etapa': {
        select: { name: 'Novo' }
      },
      'Origem': {
        select: { name: 'LP Previsível' }
      },
      'Tipo de equity': {
        select: { name: tipoEquity }
      },
      'Exposição fiscal': {
        select: { name: normalizeFaixa(qualificacao.faixa_exposicao_fiscal) }
      },
      'Faixa de patrimônio': {
        select: { name: normalizeFaixa(qualificacao.faixa_patrimonio) }
      },
      'IRPF-M': {
        checkbox: qualificacao.flag_irpfm || false
      },
      'Natureza confirmada': {
        checkbox: qualificacao.natureza_confirmada || false
      },
      'Anos IRPF-M': {
        rich_text: [{ text: { content: (qualificacao.anos_irpfm || []).join(', ') } }]
      },
      'Janela de vesting': {
        rich_text: [{ text: { content: qualificacao.janela_vesting || '' } }]
      },
      'Particularidade de natureza': {
        rich_text: [{ text: { content: perfil.natureza_descricao || '' } }]
      },
      'Nome completo': {
        rich_text: [{ text: { content: perfil.nome_completo || '' } }]
      },
      'Empresa': {
        rich_text: [{ text: { content: perfil.empresa || '' } }]
      },
      'CNPJ': {
        rich_text: [{ text: { content: perfil.cnpj || '' } }]
      },
      'Função': {
        rich_text: [{ text: { content: perfil.funcao || '' } }]
      },
      'O que faz': {
        rich_text: [{ text: { content: perfil.descricao || '' } }]
      },
      'Quem declara hoje': {
        rich_text: [{ text: { content: perfil.quem_declara || '' } }]
      },
      'Degrau atingido': {
        number: degrau_atingido
      },
      'Prioridade': {
        select: { name: prioridade }
      }
    }
  };

  // Limpar propriedades vazias (nulls em email/phone)
  Object.keys(payload.properties).forEach(key => {
    const prop = payload.properties[key];
    if (prop.email === null || prop.phone_number === null) {
      delete payload.properties[key];
    }
  });

  const response = await fetch(`${NOTION_API_URL}/pages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result;
}
