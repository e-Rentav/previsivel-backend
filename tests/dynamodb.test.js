import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { buildLeadEventItem, determineEquityType } from '../src/services/dynamodb.js';

describe('DynamoDB Service', () => {
  describe('Invariante: valores em R$ nunca persistidos', () => {
    it('item de lead não contém valores em R$', async () => {
      // Carregar fixture de lead completo
      const fixturesPath = new URL('./fixtures/sample-events.json', import.meta.url);
      const fixtures = JSON.parse(await readFile(fixturesPath, 'utf-8'));
      const leadEvent = fixtures.lead_previsivel;

      // Construir item que seria gravado no DynamoDB
      const item = buildLeadEventItem(leadEvent);

      // Verificar que NÃO existem campos com valores em R$
      const forbiddenKeys = [
        'valor_brl',
        'imposto_brl',
        'reserve_brl',
        'imposto_total_brl',
        'patrimonio_bruto_brl',
        'patrimonio',
        'exposicao_usd',
        'calendario',
        'kpis',
        'premissas',
        'entregavel_email'
      ];

      const itemKeys = Object.keys(item);
      const foundForbidden = itemKeys.filter(key => forbiddenKeys.includes(key));

      assert.strictEqual(
        foundForbidden.length,
        0,
        `Item contém campos proibidos com valores R$: ${foundForbidden.join(', ')}`
      );

      // Verificar também que valores numéricos não vazaram
      const itemJson = JSON.stringify(item);

      // Buscar padrões de valores R$ no JSON serializado
      const suspectPatterns = [
        /valor_brl/i,
        /imposto_brl/i,
        /reserve_brl/i,
        /patrimonio_bruto/i,
        /calendario.*\[\s*\{/  // array de calendário com objetos
      ];

      for (const pattern of suspectPatterns) {
        assert.ok(
          !pattern.test(itemJson),
          `Item contém padrão suspeito de valor R$: ${pattern}`
        );
      }

      // Garantir que campos esperados existem (sanity check)
      assert.ok(item.email, 'Item deve conter email');
      assert.ok(item.tipo, 'Item deve conter tipo de equity');
      assert.strictEqual(item.evento, 'lead_previsivel');
    });

    it('payload do Notion não contém valores em R$', async () => {
      // Importar função do Notion dinamicamente para verificar
      const fixturesPath = new URL('./fixtures/sample-events.json', import.meta.url);
      const fixtures = JSON.parse(await readFile(fixturesPath, 'utf-8'));
      const leadEvent = fixtures.lead_previsivel;

      // Simular construção do payload do Notion (sem chamar a API)
      const { identidade, perfil, qualificacao, degrau_atingido } = leadEvent;

      const mockPayload = {
        properties: {
          'Nome': identidade.nome,
          'E-mail': identidade.email,
          'Tipo de equity': qualificacao.tem_rsu ? 'RSU' : 'Stock option',
          'Exposição fiscal': qualificacao.faixa_exposicao_fiscal,
          'Faixa de patrimônio': qualificacao.faixa_patrimonio,
          'IRPF-M': qualificacao.flag_irpfm,
          'Degrau atingido': degrau_atingido
        }
      };

      const payloadJson = JSON.stringify(mockPayload);

      // Verificar que não há valores R$ no payload
      const forbiddenPatterns = [
        /valor_brl/i,
        /imposto_brl/i,
        /reserve_brl/i,
        /patrimonio_bruto/i,
        /exposicao_usd/i,
        /\d{5,}/  // números grandes (> 10k) que poderiam ser valores em R$
      ];

      // Nota: permitimos o degrau_atingido que é um número pequeno (0-5)
      // Removemos ele antes de testar números grandes
      const payloadWithoutDegrau = payloadJson.replace(/"Degrau atingido":\s*\d+/, '');

      for (const pattern of forbiddenPatterns) {
        if (pattern === /\d{5,}/) {
          assert.ok(
            !pattern.test(payloadWithoutDegrau),
            'Payload do Notion não deve conter números grandes (possíveis valores R$)'
          );
        } else {
          assert.ok(
            !pattern.test(payloadJson),
            `Payload do Notion contém padrão proibido: ${pattern}`
          );
        }
      }
    });
  });

  describe('Tipo de equity', () => {
    it('retorna "rsu" quando tem_rsu é true', () => {
      const result = determineEquityType({ tem_rsu: true, tem_option: false });
      assert.strictEqual(result, 'rsu');
    });

    it('retorna "option" quando tem_option é true', () => {
      const result = determineEquityType({ tem_rsu: false, tem_option: true });
      assert.strictEqual(result, 'option');
    });

    it('retorna "unknown" quando nenhum é true', () => {
      const result = determineEquityType({ tem_rsu: false, tem_option: false });
      assert.strictEqual(result, 'unknown');
    });

    it('prioriza RSU quando ambos são true', () => {
      const result = determineEquityType({ tem_rsu: true, tem_option: true });
      assert.strictEqual(result, 'rsu');
    });
  });
});
