import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { RequestStore } from '../store.mjs';
import { createHttpServer } from '../server.mjs';

async function setup(t, store = new RequestStore()) {
  const app = createHttpServer({ store, port: 0 });
  const origin = await app.listen();
  const client = new Client({ name: 'quoteready-integration-test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${origin}/mcp`)));
  t.after(async () => { await client.close(); await new Promise(resolve => app.server.close(resolve)); });
  return { ...app, origin, client, call: (name, args) => client.callTool({ name, arguments: args }) };
}
const answers = { service: 'Repair an extractor fan', equipment: 'Kitchen extractor', area: 'Cambridge', access: 'Parking available', window: 'Friday afternoon' };
async function complete(call) {
  let r = (await call('start_request', { label: 'Synthetic test request' })).structuredContent;
  for (const [field, value] of Object.entries(answers)) r = (await call('record_answer', { requestId: r.id, expectedRevision: r.revision, field, value, utterance: value, status: 'known' })).structuredContent;
  return r;
}
async function approve(origin, id, snapshot, reviewed = true) {
  return fetch(`${origin}/api/requests/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ reviewed, snapshot }) });
}
test('real Streamable HTTP initialization negotiates 2025-11-25 and discovers six executable tools', async t => {
  const { origin, client } = await setup(t);
  const response = await fetch(`${origin}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'protocol-check', version: '1.0' } } }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).result.protocolVersion, '2025-11-25');
  assert.deepEqual((await client.listTools()).tools.map(t => t.name), ['start_request','record_answer','inspect_request','add_supplier_offer','prepare_handoff','export_reviewed_handoff']);
});
test('full client flow catches incomparable offers and blocks export until exact screen review', async t => {
  const { call, origin } = await setup(t); let r = await complete(call);
  for (const [supplier, amountMinor, includesParts] of [['A',12000,false],['B',16500,true]]) r = (await call('add_supplier_offer', { requestId: r.id, expectedRevision: r.revision, supplier, amountMinor, includesParts, currency: 'GBP', sourceText: `Synthetic ${supplier} offer` })).structuredContent;
  const draft = (await call('prepare_handoff', { requestId: r.id })).structuredContent;
  assert.match(draft.warnings.join(' '), /not comparable total costs/);
  assert.equal((await call('export_reviewed_handoff', { requestId: r.id })).isError, true);
  assert.equal((await approve(origin, r.id, draft.snapshot, false)).status, 400);
  assert.equal((await approve(origin, r.id, 'old:snapshot')).status, 400);
  assert.equal((await approve(origin, r.id, draft.snapshot)).status, 200);
  const exported = (await call('export_reviewed_handoff', { requestId: r.id })).structuredContent;
  assert.equal(exported.reviewed, true); assert.equal(exported.booking, null); assert.equal(exported.payment, null);
  assert.equal(exported.offers.length, 2);
  const refreshed = (await call('prepare_handoff', { requestId: r.id })).structuredContent;
  assert.equal(refreshed.intake.status, 'ready-for-review');
  assert.equal((await call('export_reviewed_handoff', { requestId: r.id })).isError, true);
  assert.equal((await approve(origin, r.id, refreshed.snapshot)).status, 200);
  r = (await call('record_answer', { requestId: r.id, expectedRevision: r.revision, field: 'window', status: 'known', value: 'Monday morning', utterance: 'Monday morning instead' })).structuredContent;
  assert.equal(r.reviewed, false); assert.ok(r.offers.every(o => o.stale));
  assert.equal((await call('export_reviewed_handoff', { requestId: r.id })).isError, true);
  assert.equal((await approve(origin, r.id, draft.snapshot)).status, 400);
  assert.match((await call('prepare_handoff', { requestId: r.id })).structuredContent.warnings.join(' '), /updated offers/);
});
test('two clients cannot overwrite a correction using an outdated revision', async t => {
  const { call } = await setup(t); const r = await complete(call);
  const a = { requestId: r.id, expectedRevision: r.revision, field: 'window', status: 'known', value: 'Monday', utterance: 'Monday' };
  const results = await Promise.all([call('record_answer', a), call('record_answer', { ...a, value: 'Tuesday', utterance: 'Tuesday' })]);
  assert.equal(results.filter(x => x.isError).length, 1);
  const actual = (await call('inspect_request', { requestId: r.id })).structuredContent;
  assert.equal(actual.revision, r.revision + 1);
  assert.ok(['Monday','Tuesday'].includes(actual.answers.window.value));
});
test('a new offer invalidates review even when the request answers did not change', async t => {
  const { call, origin } = await setup(t); const r = await complete(call);
  const draft = (await call('prepare_handoff', { requestId: r.id })).structuredContent;
  await approve(origin, r.id, draft.snapshot);
  await call('add_supplier_offer', { requestId: r.id, expectedRevision: r.revision, supplier: 'Synthetic C', amountMinor: 10000, currency: 'EUR', includesParts: null, sourceText: 'Synthetic offer without parts details' });
  assert.equal((await call('export_reviewed_handoff', { requestId: r.id })).isError, true);
  assert.equal((await approve(origin, r.id, draft.snapshot)).status, 400);
});
test('saved requests resume through a new server and MCP client without losing source evidence', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'quoteready-relay-test-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'requests.json'); const first = await setup(t, new RequestStore(file));
  const r = await complete(first.call);
  const second = await setup(t, new RequestStore(file));
  const resumed = (await second.call('inspect_request', { requestId: r.id })).structuredContent;
  assert.equal(resumed.revision, r.revision); assert.deepEqual(resumed.answers, r.answers);
  assert.match(resumed.evidenceSource, /Client-supplied/);
});
test('invalid input and a foreign browser origin cannot change the local draft', async t => {
  const { origin, call } = await setup(t); const r = await complete(call);
  const bad = await call('add_supplier_offer', { requestId: r.id, expectedRevision: r.revision, supplier: 'Example', amountMinor: -1, currency: 'GBP', includesParts: true, sourceText: 'Example' });
  assert.equal(bad.isError, true);
  const response = await fetch(`${origin}/mcp`, { method: 'POST', headers: { Origin: 'https://example.invalid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) });
  assert.equal(response.status, 403);
  assert.equal((await call('inspect_request', { requestId: r.id })).structuredContent.offers.length, 0);
});
