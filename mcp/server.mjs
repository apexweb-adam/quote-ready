import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { RequestStore } from './store.mjs';

const requestId = z.string().uuid();
const expectedRevision = z.number().int().nonnegative();
const shortText = z.string().trim().min(1).max(1000);
export function createMcp(store, origin) {
  const server = new McpServer({ name: 'quoteready-relay', version: '0.1.0' });
  function tool(name, description, inputSchema, action, readOnlyHint = false) {
    server.registerTool(name, { description, inputSchema, annotations: { readOnlyHint, destructiveHint: false, openWorldHint: false } }, args => {
      try {
        const data = action(args);
        return { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data };
      } catch (error) { return { content: [{ type: 'text', text: error.message }], isError: true }; }
    });
  }
  tool('start_request', 'Start a local service-request draft. Use a short non-identifying label; no contact details.', { label: z.string().trim().min(1).max(80) }, a => store.start(a.label));
  tool('record_answer', 'Record or correct one user answer. Client-supplied utterances are evidence to review, not independent proof. Corrections invalidate prior review and stale supplier offers.', {
    requestId, expectedRevision, utterance: z.string().trim().min(1).max(2000),
    field: z.enum(['service','equipment','area','access','window']), status: z.enum(['known','unknown','declined']), value: z.string().max(1000)
  }, a => store.answer(a.requestId, a));
  tool('inspect_request', 'Resume a saved request, inspect missing fields and identify stale offers. Request state survives server restarts.', { requestId }, a => store.report(a.requestId), true);
  tool('add_supplier_offer', 'Attach an offer supplied by the user for the current request revision. Do not invent a supplier, amount or included parts. No supplier is contacted.', {
    requestId, expectedRevision, supplier: shortText, amountMinor: z.number().int().nonnegative().max(100000000),
    currency: z.enum(['EUR','GBP','USD','HUF']), includesParts: z.boolean().nullable(), sourceText: z.string().trim().min(1).max(2000)
  }, a => store.offer(a.requestId, a));
  tool('prepare_handoff', 'Prepare a comparison for human screen review. Retain exclusions, follow-up and stale-offer warnings. Never call a listed amount an all-in cheapest price.', { requestId }, a => ({ ...store.prepare(a.requestId), reviewUrl: `${origin}/?request=${a.requestId}` }));
  tool('export_reviewed_handoff', 'Read the draft only after its current version was reviewed on screen. This tool cannot approve, pay, book or contact anyone.', { requestId }, a => store.export(a.requestId), true);
  return server;
}

function json(res, code, value) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}
async function body(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 65536) throw Error('Request too large');
  }
  return text ? JSON.parse(text) : {};
}
export function createHttpServer({ store = new RequestStore(), port = 4320 } = {}) {
  let origin;
  const server = http.createServer(async (req, res) => {
    const host = `127.0.0.1:${server.address().port}`;
    origin = `http://${host}`;
    if (req.headers.host !== host || (req.headers.origin && req.headers.origin !== origin)) return json(res, 403, { error: 'Use the local application origin' });
    const url = new URL(req.url, origin);
    try {
      if (url.pathname === '/mcp') {
        const mcp = createMcp(store, origin);
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        res.on('close', () => { void mcp.close(); });
        await mcp.connect(transport);
        return await transport.handleRequest(req, res, req.method === 'POST' ? await body(req) : undefined);
      }
      if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(readFileSync(new URL('./index.html', import.meta.url)));
      }
      if (req.method === 'GET' && url.pathname === '/client.mjs') {
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(readFileSync(new URL('./client.mjs', import.meta.url)));
      }
      if (req.method === 'GET' && url.pathname === '/api/requests') return json(res, 200, Object.keys(store.requests).map(id => store.report(id)));
      const match = url.pathname.match(/^\/api\/requests\/([a-f0-9-]{36})(?:\/(approve|export))?$/);
      if (match && req.method === 'GET' && !match[2]) return json(res, 200, store.report(match[1]));
      if (match && req.method === 'POST' && match[2] === 'approve') {
        if (req.headers.origin !== origin) return json(res, 403, { error: 'Screen review must come from the local page' });
        const input = await body(req);
        if (input.reviewed !== true) throw Error('Explicit screen review is required');
        return json(res, 200, store.approve(match[1], input.snapshot));
      }
      if (match && req.method === 'GET' && match[2] === 'export') return json(res, 200, store.export(match[1]));
      return json(res, 404, { error: 'Not found' });
    } catch (error) { if (!res.headersSent) json(res, 400, { error: error.message }); }
  });
  server.requestTimeout = 10000;
  return { server, store, listen: () => new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`))) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const store = new RequestStore(resolve(process.env.QUOTEREADY_RELAY_DATA || fileURLToPath(new URL('./data/requests.json', import.meta.url))));
  const app = createHttpServer({ store, port: Number(process.env.PORT || 4320) });
  console.log(`QuoteReady Relay: ${await app.listen()}`);
}
