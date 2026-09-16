// Real application functions; browser resources are deterministic fakes.
// This is not a live voice, physical microphone or Codex Security test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as intake from '../public/intake.mjs';

const app = await readFile(new URL('../public/app.mjs', import.meta.url), 'utf8');
const boundary = app.indexOf("\n$('start').onclick");
assert.ok(boundary > 0, 'Application initialization marker changed; update the harness');
const functions = app.slice(0, boundary).replace(/^import .*;\n/gm, '');
const tick = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness(extra = {}) {
  const elements = new Map(), timers = new Map(), events = [], urls = [];
  const element = id => {
    if (!elements.has(id)) elements.set(id, { checked: false, value: '', hidden: true, textContent: '', replaceChildren() {} });
    return elements.get(id);
  };
  const socket = { readyState: 1, send(text) { events.push(JSON.parse(text).type); }, close() { events.push('socket.close'); } };
  let serial = 0;
  const sandbox = vm.createContext({ ...intake, Blob, AbortController, structuredClone,
    document: { getElementById: element }, WebSocket: { OPEN: 1 },
    URL: { createObjectURL(blob) { urls.push(blob); return `blob:test-${urls.length}`; }, revokeObjectURL() {} },
    setTimeout(callback, milliseconds) { const id = ++serial; timers.set(id, { callback, milliseconds }); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch() { throw Error('Network forbidden'); }, ...extra });
  vm.runInContext(functions, sandbox);
  vm.runInContext('render = () => {};', sandbox);
  const run = source => vm.runInContext(source, sandbox);
  const set = (name, value) => { sandbox.__value = value; run(`${name} = __value`); delete sandbox.__value; };
  function finish() { const p = run('finish()'); p.catch(() => {}); return p; }
  async function expireTimers() {
    await tick();
    for (const [id, timer] of [...timers]) { timers.delete(id); timer.callback(); }
    await tick();
  }
  return { element, events, urls, socket, run, set, finish, expireTimers, timers };
}

test('cleanup: rejected audio close cannot skip socket closure', async () => {
  const h = harness(); h.set('ws', h.socket);
  h.set('context', { state: 'running', close: async () => { throw Error('synthetic close failure'); } });
  const p = h.finish(); await tick(); await h.expireTimers();
  assert.ok(h.events.includes('socket.close'));
  await assert.doesNotReject(p);
  assert.equal(h.run('ws'), null);
});

test('cleanup: stalled recording does not delay socket or capture shutdown', async () => {
  const h = harness(), gate = deferred(); h.set('ws', h.socket);
  h.set('stream', { getTracks: () => [{ stop: () => h.events.push('track.stop') }] });
  h.set('worklet', { disconnect: () => h.events.push('worklet.disconnect') });
  h.set('recording', { stop: () => gate.promise });
  h.finish(); await tick();
  assert.ok(h.events.includes('track.stop'));
  assert.ok(h.events.includes('worklet.disconnect'));
  assert.ok(h.events.includes('socket.close'));
  assert.equal(h.run('ws'), null);
  await h.expireTimers();
});

test('cleanup: pending recording and audio shutdown have a finite wait', async () => {
  const h = harness(); h.set('recording', { stop: () => new Promise(() => {}) });
  h.set('context', { state: 'running', close: () => new Promise(() => {}) });
  let settled = false;
  h.finish().then(() => { settled = true; }, () => {});
  await tick();
  assert.ok([...h.timers.values()].some(t => t.milliseconds > 0 && t.milliseconds <= 5000));
  await h.expireTimers();
  assert.equal(settled, true);
  assert.equal(h.run('finishTask'), null);
  assert.equal(h.run('context'), null);
});

test('cleanup: one failed track stop cannot skip remaining resources', async () => {
  const h = harness(); h.set('ws', h.socket);
  h.set('stream', { getTracks: () => [
    { stop() { throw Error('synthetic track failure'); } },
    { stop: () => h.events.push('second.track.stop') }
  ] });
  h.set('worklet', { disconnect: () => h.events.push('worklet.disconnect') });
  const p = h.finish(); await tick(); await h.expireTimers();
  assert.ok(h.events.includes('second.track.stop'));
  assert.ok(h.events.includes('worklet.disconnect'));
  assert.ok(h.events.includes('socket.close'));
  await assert.doesNotReject(p);
});

test('cleanup: failed worklet disconnect cannot skip audio and socket close', async () => {
  const h = harness(); h.set('ws', h.socket);
  h.set('worklet', { disconnect() { throw Error('synthetic disconnect failure'); } });
  h.set('context', { state: 'running', close: async () => h.events.push('audio.close') });
  const p = h.finish(); await tick(); await h.expireTimers();
  assert.ok(h.events.includes('audio.close'));
  assert.ok(h.events.includes('socket.close'));
  await assert.doesNotReject(p);
});

test('cleanup: failed session-end send still closes transport and hides raw errors', async () => {
  const h = harness();
  h.set('ws', { readyState: 1, send() { throw Error('SYNTHETIC_SECRET'); }, close: () => h.events.push('socket.close') });
  const p = h.finish(); await tick(); await h.expireTimers();
  assert.ok(h.events.includes('socket.close'));
  await assert.doesNotReject(p);
  assert.ok(!h.element('notice').textContent.includes('SYNTHETIC_SECRET'));
});

test('startup: cancellation while audio resumes prevents a later token request', async () => {
  const resume = deferred(); let tokenRequests = 0;
  const h = harness({ AudioContext: class {
    state = 'running'; resume() { return resume.promise; } async close() { this.state = 'closed'; }
  }, fetch: async () => { tokenRequests++; return { ok: true, json: async () => ({ token: 'synthetic' }) }; } });
  h.set('configured', true); h.element('consent').checked = true;
  const starting = h.run('start()');
  await h.finish(); resume.resolve(); await starting;
  assert.equal(tokenRequests, 0);
});

test('startup: cancellation aborts an in-flight token fetch', async () => {
  let signal; const response = deferred();
  const h = harness({ AudioContext: class { state = 'running'; async resume() {} async close() {} },
    fetch: (_url, options) => { signal = options.signal; return response.promise; } });
  h.set('configured', true); h.element('consent').checked = true;
  const starting = h.run('start()'); await tick();
  const stopping = h.finish(); await tick();
  const aborted = signal?.aborted === true;
  response.resolve({ ok: true, json: async () => ({ token: 'synthetic' }) });
  await starting; await stopping;
  assert.equal(aborted, true);
});

test('cleanup: concurrent finish calls share one cleanup operation', async () => {
  const h = harness(), gate = deferred(); let stops = 0;
  h.set('recording', { stop() { stops++; return gate.promise; } });
  const first = h.finish(), second = h.finish();
  assert.equal(first, second); assert.equal(stops, 1);
  gate.resolve({ blob: new Blob(['synthetic']), extension: 'webm' });
  await first; assert.equal(h.run('finishTask'), null);
});

test('cleanup: late recorder result cannot repopulate export after timeout', async () => {
  const h = harness(), gate = deferred(); h.set('recording', { stop: () => gate.promise });
  let settled = false; h.finish().then(() => { settled = true; });
  await h.expireTimers(); assert.equal(settled, true);
  gate.resolve({ blob: new Blob(['synthetic']), extension: 'webm' }); await tick();
  assert.equal(h.urls.length, 0);
});

test('cleanup: no-resource shutdown completes without an error warning', async () => {
  const h = harness(); await h.finish();
  assert.equal(h.element('notice').textContent, 'Conversation ended. Review your captured details.');
  assert.equal(h.run('active'), false);
});

test('cleanup: successful recording creates one export and completes audio shutdown', async () => {
  const h = harness(); h.set('recording', { stop: async () => ({ blob: new Blob(['synthetic']), extension: 'webm' }) });
  h.set('context', { state: 'running', close: async () => h.events.push('audio.close') });
  await h.finish();
  assert.equal(h.urls.length, 1); assert.ok(h.events.includes('audio.close'));
  assert.equal(h.element('video-download').hidden, false);
  assert.equal(h.element('video-download').download, 'quoteready-live-demo.webm');
  assert.equal(h.timers.size, 0);
});
