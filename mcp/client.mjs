const $ = id => document.getElementById(id);
let current;
let rpcId = 0;
let initialization;
async function initialize() {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  const response = await fetch('/mcp', { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'quoteready-scripted-browser-demo', version: '0.1.0' } } }) });
  const result = await response.json();
  if (!response.ok || result.error || result.result?.protocolVersion !== '2025-11-25') throw Error('MCP 2025-11-25 initialization failed');
  const ready = await fetch('/mcp', { method: 'POST', headers: { ...headers, 'MCP-Protocol-Version': '2025-11-25' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
  if (!ready.ok) throw Error('MCP initialization notification failed');
}
async function tool(name, args) {
  await (initialization ||= initialize());
  const response = await fetch('/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name, arguments: args } }) });
  const rpc = await response.json();
  if (!response.ok || rpc.error || rpc.result.isError) throw Error(rpc.error?.message || rpc.result?.content?.[0]?.text || 'MCP request failed');
  $('trace').textContent = JSON.stringify({ request: { tool: name, arguments: args }, response: rpc.result.structuredContent }, null, 2);
  return rpc.result.structuredContent;
}
const sample = {
  service: 'Repair a noisy extractor fan', equipment: 'Kitchen extractor fan', area: 'Cambridge',
  access: 'Parking available; please avoid school pickup time', window: 'Friday afternoon'
};
function render(report) {
  current = report;
  $('request-label').textContent = report.label;
  $('snapshot').textContent = `Request revision ${report.revision} | offer revision ${report.snapshot.split(':')[1]}`;
  $('fields').replaceChildren(...Object.entries(report.answers).map(([key, answer]) => {
    const row = document.createElement('div'); const label = document.createElement('strong'); label.textContent = key;
    const text = document.createElement('span'); text.textContent = answer.value || answer.status;
    const evidence = document.createElement('small'); evidence.textContent = `Source text: ${answer.evidence}`;
    row.append(label, text, evidence); return row;
  }));
  $('offers').replaceChildren(...report.offers.map(offer => {
    const row = document.createElement('article'); row.className = offer.stale ? 'stale' : '';
    const title = document.createElement('strong'); title.textContent = offer.supplier;
    const amount = document.createElement('b'); amount.textContent = new Intl.NumberFormat('en-GB', { style: 'currency', currency: offer.currency }).format(offer.amountMinor / 100);
    const coverage = document.createElement('p'); coverage.textContent = offer.includesParts === true ? 'Parts included' : offer.includesParts === false ? 'Parts excluded' : 'Parts not specified';
    const source = document.createElement('small'); source.textContent = offer.sourceText;
    const state = document.createElement('p'); state.textContent = offer.stale ? 'OUTDATED: request changed. Ask for an updated offer.' : 'For this request revision; user-supplied and unverified.';
    row.append(title, amount, coverage, source, state); return row;
  }));
  $('reviewed').checked = false;
  $('download').disabled = true;
  $('correct').disabled = false;
  $('prepare').disabled = false;
  $('review').hidden = true;
  $('export-state').textContent = report.reviewed ? 'Current draft reviewed. Prepare again to change it.' : 'Export awaits human review of the current draft.';
}
async function handle(action) {
  $('error').textContent = '';
  const buttons = [...document.querySelectorAll('button')];
  buttons.forEach(b => b.disabled = true);
  try { await action(); } catch (error) { $('error').textContent = error.message; }
  finally {
    $('start').disabled = false;
    $('correct').disabled = !current;
    $('prepare').disabled = !current;
    $('download').disabled = $('review').hidden || !$('reviewed').checked;
  }
}
$('start').onclick = () => handle(async () => {
  let result = await tool('start_request', { label: 'Fictional kitchen repair' });
  for (const [field, value] of Object.entries(sample)) result = await tool('record_answer', { requestId: result.id, expectedRevision: result.revision, utterance: value, field, status: 'known', value });
  for (const offer of [
    { supplier: 'Fictional supplier A', amountMinor: 12000, currency: 'GBP', includesParts: false, sourceText: 'Fictional example: Friday visit, £120 labour; replacement parts extra.' },
    { supplier: 'Fictional supplier B', amountMinor: 16500, currency: 'GBP', includesParts: true, sourceText: 'Fictional example: Friday visit, £165 including the stated replacement part.' }
  ]) result = await tool('add_supplier_offer', { requestId: result.id, expectedRevision: result.revision, ...offer });
  history.replaceState(null, '', `?request=${result.id}`); render(result);
});
$('correct').onclick = () => handle(async () => render(await tool('record_answer', { requestId: current.id, expectedRevision: current.revision, utterance: 'Monday morning instead of Friday afternoon', field: 'window', status: 'known', value: 'Monday morning' })));
$('prepare').onclick = () => handle(async () => {
  const draft = await tool('prepare_handoff', { requestId: current.id });
  $('warnings').replaceChildren(...draft.warnings.map(w => { const item = document.createElement('li'); item.textContent = w; return item; }));
  $('review').hidden = false; $('reviewed').checked = false; $('download').disabled = true;
  $('review').dataset.snapshot = draft.snapshot;
});
$('reviewed').onchange = () => { $('download').disabled = !$('reviewed').checked; };
$('download').onclick = async () => {
  $('download').disabled = true;
  try {
    const response = await fetch(`/api/requests/${current.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewed: $('reviewed').checked, snapshot: $('review').dataset.snapshot }) });
    const result = await response.json(); if (!response.ok) throw Error(result.error);
    const document = await tool('export_reviewed_handoff', { requestId: current.id });
    const url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }));
    const link = window.document.createElement('a'); link.href = url; link.download = 'quoteready-reviewed-draft.json'; link.click(); URL.revokeObjectURL(url);
    $('export-state').textContent = 'Reviewed draft downloaded. No supplier contacted, appointment booked or payment made.';
  } catch (error) { $('error').textContent = error.message; } finally { $('download').disabled = !$('reviewed').checked; }
};
async function resume() {
  const id = new URLSearchParams(location.search).get('request');
  if (id) await handle(async () => render(await tool('inspect_request', { requestId: id })));
}
void resume();
