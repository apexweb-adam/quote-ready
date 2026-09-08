import test from 'node:test';
import assert from 'node:assert/strict';
import { flushToolResults } from '../public/tool-results.mjs';

test('parallel tool calls all receive results at the same idle boundary', () => {
  const pending = ['service','area','access','window'].map(id => ({ id, result: { saved: id } })), sent = [];
  assert.equal(flushToolResults(pending, 'reply.started', e => sent.push(e)), 0);
  assert.equal(pending.length, 4);
  assert.equal(flushToolResults(pending, 'reply.done', e => sent.push(e)), 4);
  assert.equal(pending.length, 0);
  assert.deepEqual(sent.map(e => [e.call_id, JSON.parse(e.result).saved]), ['service','area','access','window'].map(id => [id,id]));
  pending.push({ id: 'late', result: {} });
  assert.equal(flushToolResults(pending, 'reply.done', e => sent.push(e)), 1);
  assert.equal(flushToolResults(pending, 'reply.done', e => sent.push(e)), 0);
});

test('transport failure retains unsent results', () => {
  const pending = [{ id: 'first', result: {} }, { id: 'second', result: {} }];
  assert.throws(() => flushToolResults(pending, 'reply.done', () => { throw Error('closed'); }), /closed/);
  assert.equal(pending.length, 2);
});
