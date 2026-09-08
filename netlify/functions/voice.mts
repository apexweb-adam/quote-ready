import type { Config } from '@netlify/functions';
import { voiceApi } from './_shared/voice-api.mjs';

export default async (request: Request) => voiceApi(request, {
  apiKey: Netlify.env.get('ASSEMBLYAI_API_KEY'),
  inviteCode: Netlify.env.get('QUOTEREADY_INVITE_CODE'),
  allowedOrigin: Netlify.env.get('QUOTEREADY_ORIGIN'),
  expiresAt: Netlify.env.get('QUOTEREADY_INVITE_EXPIRES_AT')
});

export const config: Config = {
  path: ['/api/config', '/api/token'],
  rateLimit: { windowLimit: 6, windowSize: 60, aggregateBy: ['ip', 'domain'] }
};
