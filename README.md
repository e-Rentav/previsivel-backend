# Previsível Backend

Backend AWS que substitui o Make para captura de leads e eventos de funil da landing page do Previsível.

## Arquitetura

```
LP (Lovable) → API Gateway → Lambda → [Notion, Brevo, Asana, DynamoDB]
```

**Stack:**
- AWS SAM (IaC)
- Lambda Node.js 22 (ESM)
- DynamoDB (single-table, PAY_PER_REQUEST)
- API Gateway HTTP API
- SSM Parameter Store (secrets)

**Região:** us-east-2

## Fluxo de Dados

### Evento `step_previsivel` (funil anônimo)
1. Lambda valida e grava no DynamoDB
2. Retorna 200 OK

### Evento `lead_previsivel` (lead completo)
1. Lambda valida estrutura
2. Executa em paralelo (com try/catch independentes):
   - **Notion**: cria item na base de prospecção (crítico)
   - **Brevo**: envia email transacional (template 136)
   - **Asana**: cria tarefa de contato
   - **DynamoDB**: grava evento + atualiza agregado por email
3. Retorna 200 OK se Notion gravou (outros podem falhar)

## Invariante de Segurança

**Valores em R$ nunca são persistidos.** Transitam apenas no campo `entregavel_email` para montagem do email, e são descartados após o envio. DynamoDB e Notion guardam apenas metadados e rótulos.

## Pré-requisitos

- [AWS CLI](https://aws.amazon.com/cli/) configurado
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Node.js 22+
- Credenciais AWS com permissões de deploy

## Setup Inicial

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar parâmetros SSM (secrets)

**IMPORTANTE:** Você precisa criar os seguintes parâmetros no SSM Parameter Store **antes** do deploy:

```bash
# Dev
aws ssm put-parameter \
  --name /previsivel/dev/notion-token \
  --value "SEU_TOKEN_NOTION" \
  --type SecureString \
  --region us-east-2

aws ssm put-parameter \
  --name /previsivel/dev/brevo-key \
  --value "SUA_API_KEY_BREVO" \
  --type SecureString \
  --region us-east-2

aws ssm put-parameter \
  --name /previsivel/dev/asana-token \
  --value "SEU_TOKEN_ASANA" \
  --type SecureString \
  --region us-east-2

# Opcional: segredo compartilhado para validação de requests
aws ssm put-parameter \
  --name /previsivel/dev/shared-secret \
  --value "SEU_SECRET_ALEATORIO" \
  --type SecureString \
  --region us-east-2
```

Para **produção**, troque `/dev/` por `/prod/` nos comandos acima.

### 3. Build

```bash
sam build
```

### 4. Deploy

**Dev:**
```bash
sam deploy
```

**Produção:**
```bash
sam deploy --config-env prod
```

Na primeira vez, SAM perguntará sobre:
- Origem da LP para CORS (ex: `https://seu-dominio.lovable.app`)
- Confirmação de changeset

### 5. Obter URL do endpoint

Após o deploy, copie o valor de `ApiEndpoint` nos Outputs do CloudFormation:

```bash
aws cloudformation describe-stacks \
  --stack-name previsivel-backend \
  --region us-east-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text
```

### 6. Atualizar frontend (Lovable)

No projeto Lovable, ajuste `src/lib/previsivel/webhook.ts`:

```typescript
// Trocar URL do Make pela URL do API Gateway
const WEBHOOK_URL = import.meta.env.VITE_PREVISIVEL_ENDPOINT;

// Opcional: adicionar header de segredo compartilhado
headers: {
  'Content-Type': 'application/json',
  'x-previsivel-token': import.meta.env.VITE_PREVISIVEL_TOKEN
}
```

## Estrutura do Projeto

```
previsivel-backend/
├── src/
│   ├── index.js                 # Handler principal
│   ├── integrations/
│   │   ├── notion.js            # Cria leads no Notion
│   │   ├── brevo.js             # Envia emails transacionais
│   │   └── asana.js             # Cria tarefas de contato
│   ├── services/
│   │   ├── ssm.js               # Carrega secrets do SSM
│   │   └── dynamodb.js          # Grava eventos e agregados
│   └── utils/
│       └── validator.js         # Valida estrutura dos eventos
├── tests/                       # Testes (a implementar)
├── template.yaml                # SAM template
├── samconfig.toml               # Configuração de deploy
├── package.json
└── README.md
```

## Testes

```bash
npm test
```

## Monitoramento

**CloudWatch Logs:**
```bash
aws logs tail /aws/lambda/previsivel-webhook-dev --follow --region us-east-2
```

**Métricas:**
- Lambda: invocations, errors, duration
- DynamoDB: read/write capacity units
- API Gateway: requests, 4xx, 5xx

## Troubleshooting

### Lambda retorna 500
- Verificar logs no CloudWatch
- Confirmar que parâmetros SSM existem e estão acessíveis
- Verificar permissões IAM da Lambda

### Notion não grava
- Verificar token no SSM
- Confirmar IDs da data source e database
- Ver logs detalhados no CloudWatch

### Brevo não envia email
- Verificar API key no SSM
- Confirmar que template 136 existe na conta Brevo
- Ver response do Brevo nos logs

### Asana não cria tarefa
- Verificar token no SSM
- Confirmar GIDs de workspace/projeto/seção/assignee
- Ver response do Asana nos logs

## Segurança

- **Secrets**: todos em SSM Parameter Store (SecureString), nunca no código
- **IAM**: least privilege (Lambda só acessa sua tabela e seus parâmetros SSM)
- **CORS**: configurado para origem específica da LP
- **Throttling**: ativado no API Gateway (proteção contra abuso)
- **Validação**: header `x-previsivel-token` opcional para deterrente de spam

## Compliance

- **LGPD**: valores financeiros não são persistidos (apenas transitam no email)
- **Logs**: não contêm CPF, valores em R$ ou dados sensíveis
- **Encryption**: DynamoDB com SSE, SSM com SecureString

## Custos Estimados

Com volume estimado de 1000 leads/mês:

- Lambda: ~$0.20/mês (arm64, 512MB)
- DynamoDB: ~$0.30/mês (PAY_PER_REQUEST, <1K writes)
- API Gateway: ~$1.00/mês
- **Total: ~$1.50/mês** (vs $12/mês do Make)

## Próximos Passos

- [ ] Implementar testes de contrato
- [ ] Adicionar DLQ para retry de falhas
- [ ] Dashboard de métricas (funil, conversão)
- [ ] Alertas no CloudWatch (erros, latência)
- [ ] CI/CD com GitHub Actions

## Suporte

Para dúvidas ou problemas, abrir issue no repositório.
