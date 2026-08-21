# Setup Checklist — Previsível Backend

Este documento lista **exatamente** o que você precisa fazer após clonar o repositório para colocar o backend em funcionamento.

## 1. Parâmetros SSM (Secrets)

Antes do deploy, você precisa criar os seguintes parâmetros no **AWS Systems Manager Parameter Store**. Estes parâmetros guardam as credenciais de integração com serviços externos.

### Dev Environment

```bash
# Token de integração do Notion
aws ssm put-parameter \
  --name /previsivel/dev/notion-token \
  --value "COLE_AQUI_SEU_TOKEN_NOTION" \
  --type SecureString \
  --region us-east-2 \
  --description "Token de integração Notion para PrevisÃ­vel"

# API Key do Brevo
aws ssm put-parameter \
  --name /previsivel/dev/brevo-key \
  --value "COLE_AQUI_SUA_API_KEY_BREVO" \
  --type SecureString \
  --region us-east-2 \
  --description "API Key Brevo para envio de emails"

# Token do Asana
aws ssm put-parameter \
  --name /previsivel/dev/asana-token \
  --value "COLE_AQUI_SEU_TOKEN_ASANA" \
  --type SecureString \
  --region us-east-2 \
  --description "Token Asana para criação de tarefas"

# Segredo compartilhado (OPCIONAL - para validar requests da LP)
aws ssm put-parameter \
  --name /previsivel/dev/shared-secret \
  --value "$(openssl rand -hex 32)" \
  --type SecureString \
  --region us-east-2 \
  --description "Segredo compartilhado LP<>Backend"
```

### Produção (quando for subir)

Repetir os comandos acima trocando `/dev/` por `/prod/` e usando credenciais de produção.

---

## 2. Onde Obter as Credenciais

### Notion Token
1. Acesse https://www.notion.so/my-integrations
2. Clique em "+ New integration"
3. Dê um nome (ex: "Previsível Backend")
4. Selecione o workspace onde está a base de prospecção
5. Dê permissões de "Insert content"
6. Copie o "Internal Integration Token"
7. **IMPORTANTE:** Compartilhe a base de prospecção com esta integração (botão "Share" na página da base)

### Brevo API Key
1. Acesse https://app.brevo.com/settings/keys/api
2. Crie uma nova chave ou use uma existente
3. Copie a chave (começa com `xkeysib-...`)

### Asana Token
1. Acesse https://app.asana.com/0/my-apps
2. Clique em "Personal Access Token"
3. Crie um novo token com descrição "Previsível Backend"
4. Copie o token gerado

---

## 3. Deploy

```bash
# Instalar dependências
npm install

# Build
sam build

# Deploy em dev
sam deploy

# Deploy em prod (quando for subir)
sam deploy --config-env prod
```

Na primeira execução de `sam deploy`, SAM irá perguntar:

- **LandingPageOrigin**: Cole a URL completa da LP publicada no Lovable (ex: `https://previsivel.e-rentav.com` ou `https://previsivel-123abc.lovable.app`)
  - **⚠️ IMPORTANTE**: Nunca usar `*` em produção — sempre especificar a origem exata
  - Para dev/testes locais você pode usar `*` temporariamente, mas em produção isso abre brecha de segurança (qualquer site pode chamar seu endpoint)
- **Confirm changeset**: Digite `y` para confirmar

---

## 4. Obter URL do Endpoint

Após o deploy bem-sucedido, copie a URL do endpoint que aparece nos **Outputs** do CloudFormation:

```bash
aws cloudformation describe-stacks \
  --stack-name previsivel-backend \
  --region us-east-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text
```

Exemplo de URL: `https://abc123xyz.execute-api.us-east-2.amazonaws.com/previsivel`

---

## 5. Atualizar Frontend (Lovable)

No projeto do Lovable, ajustar o arquivo `src/lib/previsivel/webhook.ts`:

```typescript
// Trocar a URL antiga do Make por esta
const WEBHOOK_URL = 'https://abc123xyz.execute-api.us-east-2.amazonaws.com/previsivel';

// Se você configurou o shared-secret (opcional), adicionar header:
const headers = {
  'Content-Type': 'application/json',
  'x-previsivel-token': 'VALOR_DO_SHARED_SECRET_AQUI'
};
```

Ou melhor ainda, usar variáveis de ambiente no Lovable:

```typescript
const WEBHOOK_URL = import.meta.env.VITE_PREVISIVEL_ENDPOINT;
const TOKEN = import.meta.env.VITE_PREVISIVEL_TOKEN;
```

E configurar essas variáveis no Lovable em "Settings → Environment Variables".

---

## 6. Testar

### Teste Manual via cURL

**Evento de passo:**
```bash
curl -X POST https://SEU-ENDPOINT/previsivel \
  -H "Content-Type: application/json" \
  -d '{
    "evento": "step_previsivel",
    "timestamp": "2025-01-15T10:30:00Z",
    "passo": 2,
    "degrau_atingido": 1
  }'
```

**Evento de lead:**
```bash
curl -X POST https://SEU-ENDPOINT/previsivel \
  -H "Content-Type: application/json" \
  -d @tests/fixtures/sample-events.json
```

### Ver Logs

```bash
aws logs tail /aws/lambda/previsivel-webhook-dev --follow --region us-east-2
```

---

## 7. Validar Integrações

Após enviar um evento de lead, verificar:

- [ ] **Notion**: novo item apareceu na base de prospecção
- [ ] **Brevo**: email chegou no endereço de teste
- [ ] **Asana**: tarefa criada no projeto Ops
- [ ] **DynamoDB**: registros salvos na tabela `previsivel-eventos-dev`

Para conferir o DynamoDB:

```bash
aws dynamodb scan \
  --table-name previsivel-eventos-dev \
  --region us-east-2 \
  --max-items 5
```

---

## 8. Troubleshooting

### Lambda retorna 500
1. Ver logs no CloudWatch: `aws logs tail /aws/lambda/previsivel-webhook-dev --follow --region us-east-2`
2. Verificar se os parâmetros SSM existem e estão acessíveis
3. Confirmar permissões IAM da Lambda

### Notion não grava
- Token está correto no SSM?
- A integração foi **compartilhada** com a base de dados?
- IDs da data source e database estão corretos no `template.yaml`?

### Brevo não envia email
- API key está correta no SSM?
- Template ID 136 existe na conta Brevo?
- Email de destino é válido?

### Asana não cria tarefa
- Token está correto no SSM?
- GIDs de workspace/projeto/seção/assignee estão corretos?
- O assignee tem acesso ao projeto?

---

## Resumo: Ordem de Execução

1. ✅ Criar parâmetros SSM (seção 1)
2. ✅ `npm install && sam build && sam deploy`
3. ✅ Copiar URL do endpoint (seção 4)
4. ✅ Atualizar frontend Lovable (seção 5)
5. ✅ Testar com cURL (seção 6)
6. ✅ Validar integrações (seção 7)

---

## Notas Finais

- **Custos**: ~$1.50/mês (muito menor que os $12/mês do Make)
- **Região**: `us-east-2` (não mudar sem ajustar todos os comandos)
- **Segurança**: secrets em SSM, IAM least privilege, CORS configurado
- **Compliance**: valores R$ não são persistidos (apenas transitam no email)

Se tudo estiver ok, a LP do Previsível estará enviando leads diretamente para a sua AWS, e você pode cancelar o plano pago do Make.
