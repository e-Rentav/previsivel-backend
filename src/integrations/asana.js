/**
 * Integração com Asana API
 * Cria tarefa de contato no projeto Ops
 */

const ASANA_API_URL = 'https://app.asana.com/api/1.0';

/**
 * Cria tarefa de contato no Asana
 */
export async function createAsanaTask(body, token) {
  const { identidade, perfil, qualificacao } = body;

  // Calcular due_on (hoje + 1 dia útil, aproximado por +1 dia)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueOn = tomorrow.toISOString().split('T')[0];

  // Montar nome da task
  const taskName = `[Previsível] ${identidade.nome} — exposição ${qualificacao.faixa_exposicao_fiscal}`;

  // Montar notes (sem valores R$)
  const notes = buildTaskNotes(identidade, perfil, qualificacao);

  const payload = {
    data: {
      workspace: process.env.ASANA_WORKSPACE,
      projects: [process.env.ASANA_PROJECT],
      memberships: [
        {
          project: process.env.ASANA_PROJECT,
          section: process.env.ASANA_SECTION
        }
      ],
      assignee: process.env.ASANA_ASSIGNEE,
      due_on: dueOn,
      name: taskName,
      notes: notes
    }
  };

  const response = await fetch(`${ASANA_API_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Asana API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result;
}

/**
 * Monta notes da task (sem valores R$)
 */
function buildTaskNotes(identidade, perfil, qualificacao) {
  return `
## Identidade
- Nome: ${identidade.nome}
- E-mail: ${identidade.email}
- WhatsApp: ${identidade.whatsapp || 'N/A'}

## Perfil
- Nome completo: ${perfil.nome_completo || 'N/A'}
- Empresa: ${perfil.empresa || 'N/A'}
- CNPJ: ${perfil.cnpj || 'N/A'}
- Função: ${perfil.funcao || 'N/A'}
- O que faz: ${perfil.descricao || 'N/A'}
- Quem declara hoje: ${perfil.quem_declara || 'N/A'}

## Qualificação
- Tipo: ${qualificacao.tem_rsu ? 'RSU' : 'Stock option'}
- Exposição fiscal: ${qualificacao.faixa_exposicao_fiscal}
- Faixa de patrimônio: ${qualificacao.faixa_patrimonio}
- IRPF-M: ${qualificacao.flag_irpfm ? 'Sim' : 'Não'}
- Anos IRPF-M: ${(qualificacao.anos_irpfm || []).join(', ') || 'N/A'}
- Janela de vesting: ${qualificacao.janela_vesting || 'N/A'}
- Natureza confirmada: ${qualificacao.natureza_confirmada ? 'Sim' : 'Não'}
- Particularidade: ${perfil.natureza_descricao || 'N/A'}
`.trim();
}
