import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, apiKey, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  appBaseUrl,
  ...(apiKey ? { headers: { api_key: apiKey } } : {}),
});
