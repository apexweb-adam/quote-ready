import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceApi } from '../netlify/functions/_shared/voice-api.mjs';
const origin = 'https://voice.example.test', invite = 'fictional-test-invite-12345';
const setup = { apiKey: 'fake-provider-credential', inviteCode: invite, allowedOrigin: origin, expiresAt: '2026-10-08T00:00:00Z', now: Date.parse('2026-09-08T00:00:00Z') };
function request({ code = invite, from = origin, method = 'POST' } = {}) { return new Request(`${origin}/api/token`, { method, headers: { Origin: from, 'X-QuoteReady': 'voice', 'X-QuoteReady-Invite': code } }); }
test('hosted token endpoint rejects missing, incorrect and expired access without calling provider', async () => {
  let calls = 0; const options = { ...setup, fetcher: () => { calls++; throw Error('Unexpected request'); } };
  for (const code of ['', 'wrong', 'x'.repeat(300)]) assert.equal((await voiceApi(request({code}), options)).status,401);
  assert.equal((await voiceApi(request(), { ...options, now: Date.parse(setup.expiresAt) })).status,503);
  assert.equal((await voiceApi(request(), { ...options, expiresAt: 'invalid' })).status,503);
  assert.equal(calls,0);
});
test('hosted token endpoint rejects cross-origin and direct wrong-host requests', async () => {
  const options = { ...setup, fetcher: () => { throw Error('Unexpected request'); } };
  assert.equal((await voiceApi(request({ from: 'https://other.test' }), options)).status,403);
  const wrongHost = new Request('https://other.test/api/token',{method:'POST',headers:{Origin:origin,'X-QuoteReady':'voice','X-QuoteReady-Invite':invite}});
  assert.equal((await voiceApi(wrongHost,options)).status,403);
  assert.equal((await voiceApi(request({method:'GET'}),options)).status,405);
});
test('hosted session is bounded and secrets stay out of configuration and error responses', async () => {
  const config = await voiceApi(new Request(`${origin}/api/config`),setup);
  assert.deepEqual(await config.json(),{liveConfigured:true,requiresInvite:true,maxSessionSeconds:180});
  const result = await voiceApi(request(),{...setup,fetcher:async(url,options)=>{
    assert.equal(new URL(url).searchParams.get('max_session_duration_seconds'),'180');
    assert.equal(options.headers.Authorization,'Bearer fake-provider-credential');
    return new Response(JSON.stringify({token:'test-one-use-session'}));
  }});
  assert.deepEqual(await result.json(),{token:'test-one-use-session'});
  const error = await voiceApi(request(),{...setup,fetcher:async()=>new Response('private provider detail',{status:401})});
  assert.equal(error.status,502);assert.doesNotMatch(await error.text(),/private|credential|invite-12345/);
});
