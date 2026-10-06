import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const origin = process.env.QUOTEREADY_RELAY_URL || 'http://127.0.0.1:4320';
const url = new URL(origin);
if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/' || url.search) throw Error('Demo requires the loopback server');
const client = new Client({ name: 'quoteready-scripted-demo', version: '0.1.0' });
const steps = [];
async function call(name, args) {
  const result = await client.callTool({ name, arguments: args });
  steps.push({ name, arguments: args, isError: result.isError || false, response: result.structuredContent || result.content });
  return result;
}
try {
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', origin)));
  let r = (await call('start_request', { label: 'Synthetic CLI demonstration' })).structuredContent;
  for (const [field, value] of Object.entries({ service: 'Repair a noisy extractor', equipment: 'Kitchen extractor', area: 'Cambridge', access: 'Parking available', window: 'Friday afternoon' })) {
    r = (await call('record_answer', { requestId: r.id, expectedRevision: r.revision, field, status: 'known', value, utterance: value })).structuredContent;
  }
  for (const [supplier, amountMinor, includesParts] of [['Fictional A',12000,false],['Fictional B',16500,true]]) {
    r = (await call('add_supplier_offer', { requestId: r.id, expectedRevision: r.revision, supplier, amountMinor, includesParts, currency: 'GBP', sourceText: `Synthetic example offer from ${supplier}; parts ${includesParts ? 'included' : 'excluded'}.` })).structuredContent;
  }
  await call('prepare_handoff', { requestId: r.id });
  const before = await call('export_reviewed_handoff', { requestId: r.id });
  r = (await call('record_answer', { requestId: r.id, expectedRevision: r.revision, field: 'window', status: 'known', value: 'Monday morning', utterance: 'Monday morning instead of Friday afternoon' })).structuredContent;
  const draft = (await call('prepare_handoff', { requestId: r.id })).structuredContent;
  const after = await call('export_reviewed_handoff', { requestId: r.id });
  const passed = before.isError === true && after.isError === true && r.offers.every(o => o.stale) && draft.warnings.some(w => w.includes('updated offers'));
  console.log(JSON.stringify({ passed, recordedAt: new Date().toISOString(), input: 'Fictional client text and supplier offers', surface: 'Loopback Streamable HTTP with the official MCP client', alexaSession: false, externalActions: [], reviewUrl: draft.reviewUrl, steps }, null, 2));
  if (!passed) process.exitCode = 1;
} finally { await client.close(); }
