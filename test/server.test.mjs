import test from 'node:test';
import assert from 'node:assert/strict';
import { makeServer } from '../server.mjs';
async function serverCase(options, fn) {
  const server = makeServer(options); await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { await new Promise(r=>server.close(r)); }
}
test('no key means explicit unavailable, no upstream request', async () => {
  await serverCase({apiKey:'',fetcher:()=>{throw Error('must not call')}}, async base => {
    assert.deepEqual(await (await fetch(`${base}/api/config`)).json(), {liveConfigured:false});
    const r = await fetch(`${base}/api/token`,{method:'POST',headers:{Origin:base,'X-QuoteReady':'voice'}}); assert.equal(r.status,503);
  });
});
test('foreign origins cannot mint tokens', async () => {
  await serverCase({apiKey:'fake-test-key',fetcher:()=>{throw Error('must not call')}}, async base => {
    const r = await fetch(`${base}/api/token`,{method:'POST',headers:{Origin:'https://example.com','X-QuoteReady':'voice'}}); assert.equal(r.status,403);
  });
});
test('API key stays upstream; token has bounded duration and repeated requests rate-limit', async () => {
  let count=0;
  await serverCase({apiKey:'fake-test-key',fetcher:async (url, options)=> {
    count++; assert.equal(options.headers.Authorization,'Bearer fake-test-key');
    assert.equal(new URL(url).searchParams.get('max_session_duration_seconds'),'300');
    return {ok:true,json:async()=>({token:'single-use-token'})};
  }}, async base => {
    const options={method:'POST',headers:{Origin:base,'X-QuoteReady':'voice'}};
    const r = await fetch(`${base}/api/token`,options); assert.deepEqual(await r.json(),{token:'single-use-token'});
    assert.equal((await fetch(`${base}/api/token`,options)).status,429); assert.equal(count,1);
  });
});
test('upstream errors do not expose upstream body or secrets', async () => {
  await serverCase({apiKey:'fake',fetcher:async()=>({ok:false,status:401,text:async()=>'secret'})}, async base => {
    const r=await fetch(`${base}/api/token`,{method:'POST',headers:{Origin:base,'X-QuoteReady':'voice'}});
    assert.equal(r.status,502); assert.equal((await r.text()).includes('secret'),false);
  });
});
test('static routes are allowlisted and browser security headers are present', async()=> {
  await serverCase({apiKey:''}, async base=> {
    const r=await fetch(base); assert.equal(r.status,200); assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);
    assert.equal((await fetch(`${base}/server.mjs`)).status,404);
    assert.equal((await fetch(`${base}/.env`)).status,404);
  });
});
