import { createHash, timingSafeEqual } from 'node:crypto';

function equalSecret(a, b) {
  if (typeof a !== 'string' || !a || a.length > 256 || typeof b !== 'string' || b.length < 16) return false;
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

export async function voiceApi(request, { apiKey, inviteCode, allowedOrigin, expiresAt, fetcher = fetch, now = Date.now() }) {
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'
  } });
  const path = new URL(request.url).pathname;
  const expiry = Date.parse(expiresAt || '');
  const available = Boolean(apiKey && inviteCode?.length >= 16 && allowedOrigin && Number.isFinite(expiry) && now < expiry);
  if (path === '/api/config' && request.method === 'GET') return reply(200, { liveConfigured: available, requiresInvite: true, maxSessionSeconds: 180 });
  if (path !== '/api/token') return reply(404, { error: 'Not found' });
  if (request.method !== 'POST') return reply(405, { error: 'POST required' });
  if (!available) return reply(503, { error: 'This live demonstration is not currently available. The fictional example still works.' });
  if (request.headers.get('origin') !== allowedOrigin || new URL(request.url).origin !== allowedOrigin || request.headers.get('x-quoteready') !== 'voice') return reply(403, { error: 'Use the published demonstration page to connect.' });
  if (!equalSecret(request.headers.get('x-quoteready-invite'), inviteCode)) return reply(401, { error: 'Enter the demonstration access code supplied with your invitation.' });
  try {
    const response = await fetcher('https://agents.assemblyai.com/v1/token?expires_in_seconds=60&max_session_duration_seconds=180', {
      headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return reply(502, { error: `Voice provider did not issue a session (${response.status}).` });
    const result = await response.json();
    if (typeof result.token !== 'string' || !result.token) throw Error('Invalid token');
    return reply(200, { token: result.token });
  } catch { return reply(502, { error: 'Voice connection could not be prepared. Please try again later.' }); }
}
