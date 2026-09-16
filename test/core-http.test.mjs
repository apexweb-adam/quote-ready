import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { makeServer } from '../server.mjs';

test('local HTTP serves the complete intake module import graph without broadening access', async t => {
  let providerCalls = 0;
  const server = makeServer({ apiKey: '', fetcher: async () => { providerCalls++; throw Error('Unexpected provider request'); } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const pending = ['/intake.mjs'], visited = new Set();
  while (pending.length) {
    const path = pending.shift();
    if (visited.has(path)) continue;
    visited.add(path);
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, `Missing browser module: ${path}`);
    assert.match(response.headers.get('content-type'), /^text\/javascript/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    const source = await response.text();
    assert.equal(source, await readFile(new URL(`../public${path}`, import.meta.url), 'utf8'));
    for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      const next = new URL(match[1], origin + path);
      assert.equal(next.origin, origin, 'Core imports must stay local');
      pending.push(next.pathname);
    }
  }
  assert.deepEqual([...visited].sort(), ['/assemblyai-config.mjs', '/intake-core.mjs', '/intake.mjs']);
  for (const path of ['/packages/intake-core/index.mjs', '/.env', '/server.mjs']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404, `Must not expose ${path}`);
    await response.arrayBuffer();
  }
  const wrongMethod = await fetch(origin + '/intake-core.mjs', { method: 'POST' });
  assert.equal(wrongMethod.status, 404);
  await wrongMethod.arrayBuffer();
  assert.equal(providerCalls, 0);
});
