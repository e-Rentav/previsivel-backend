import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-2' });

/**
 * Carrega secrets do SSM Parameter Store
 * Cache no cold start da Lambda
 */
export async function getSecrets() {
  const prefix = process.env.SSM_PREFIX || '/previsivel/dev';

  try {
    const command = new GetParametersCommand({
      Names: [
        `${prefix}/notion-token`,
        `${prefix}/brevo-key`,
        `${prefix}/asana-token`,
        `${prefix}/shared-secret`
      ],
      WithDecryption: true
    });

    const response = await ssmClient.send(command);

    const secrets = {};
    for (const param of response.Parameters || []) {
      const key = param.Name.split('/').pop();
      secrets[toCamelCase(key)] = param.Value;
    }

    console.log(JSON.stringify({
      message: 'Secrets loaded',
      keys: Object.keys(secrets)
    }));

    return secrets;
  } catch (err) {
    console.error(JSON.stringify({
      error: 'Failed to load secrets',
      details: err.message
    }));
    throw new Error('Secret loading failed');
  }
}

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}
