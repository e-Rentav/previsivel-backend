import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateEvent } from '../src/utils/validator.js';

describe('Validator', () => {
  describe('step_previsivel', () => {
    it('valida evento válido', () => {
      const event = {
        evento: 'step_previsivel',
        timestamp: '2025-01-15T10:30:00Z',
        passo: 3,
        degrau_atingido: 2
      };

      const result = validateEvent(event);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('rejeita evento sem passo', () => {
      const event = {
        evento: 'step_previsivel',
        timestamp: '2025-01-15T10:30:00Z',
        degrau_atingido: 2
      };

      const result = validateEvent(event);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('passo')));
    });

    it('rejeita passo não-numérico', () => {
      const event = {
        evento: 'step_previsivel',
        timestamp: '2025-01-15T10:30:00Z',
        passo: 'tres',
        degrau_atingido: 2
      };

      const result = validateEvent(event);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('número')));
    });
  });

  describe('lead_previsivel', () => {
    it('valida lead válido', () => {
      const event = {
        evento: 'lead_previsivel',
        timestamp: '2025-01-15T10:30:00Z',
        identidade: {
          nome: 'João Silva',
          email: 'joao@example.com',
          whatsapp: '+5511999999999'
        },
        perfil: {
          nome_completo: 'João Silva',
          empresa: 'TechCorp'
        },
        qualificacao: {
          tem_rsu: true,
          tem_option: false,
          faixa_exposicao_fiscal: 'alta'
        },
        degrau_atingido: 3,
        entregavel_email: {
          kpis: {
            imposto_total_brl: 50000,
            patrimonio_bruto_brl: 200000,
            exposicao_usd: 40000
          },
          calendario: []
        }
      };

      const result = validateEvent(event);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('rejeita lead sem identidade', () => {
      const event = {
        evento: 'lead_previsivel',
        timestamp: '2025-01-15T10:30:00Z',
        qualificacao: { tem_rsu: true, tem_option: false },
        degrau_atingido: 3,
        entregavel_email: { kpis: {}, calendario: [] }
      };

      const result = validateEvent(event);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('identidade')));
    });

    it('rejeita lead sem email', () => {
      const event = {
        evento: 'lead_previsivel',
        timestamp: '2025-01-15T10:30:00Z',
        identidade: { nome: 'João' },
        qualificacao: { tem_rsu: true, tem_option: false },
        degrau_atingido: 3,
        entregavel_email: { kpis: {}, calendario: [] }
      };

      const result = validateEvent(event);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('email')));
    });

    it('rejeita lead sem qualificacao', () => {
      const event = {
        evento: 'lead_previsivel',
        timestamp: '2025-01-15T10:30:00Z',
        identidade: { nome: 'João', email: 'joao@example.com' },
        degrau_atingido: 3,
        entregavel_email: { kpis: {}, calendario: [] }
      };

      const result = validateEvent(event);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('qualificacao')));
    });

    it('rejeita lead sem entregavel_email', () => {
      const event = {
        evento: 'lead_previsivel',
        timestamp: '2025-01-15T10:30:00Z',
        identidade: { nome: 'João', email: 'joao@example.com' },
        qualificacao: { tem_rsu: true, tem_option: false },
        degrau_atingido: 3
      };

      const result = validateEvent(event);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('entregavel_email')));
    });
  });

  describe('campos comuns', () => {
    it('rejeita evento sem tipo', () => {
      const event = {
        timestamp: '2025-01-15T10:30:00Z'
      };

      const result = validateEvent(event);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('evento')));
    });

    it('rejeita evento sem timestamp', () => {
      const event = {
        evento: 'step_previsivel'
      };

      const result = validateEvent(event);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('timestamp')));
    });
  });
});
