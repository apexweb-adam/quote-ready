import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntake, addTranscript, capture, inspect, prepareReview, confirmReview, fields, agentConfig } from '../public/intake.mjs';
function answer(state, field, value = 'Example answer', status = 'known') {
  addTranscript(state, value);
  return capture(state, { field, value, status, evidence: value });
}
function complete() { const s = createIntake(); for (const field of Object.keys(fields)) answer(s, field); return s; }
test('asks only unanswered fields, including after an unknown answer', () => {
  const s = createIntake(); answer(s, 'service'); answer(s, 'equipment', 'I do not know', 'unknown');
  assert.deepEqual(inspect(s).missing, ['area','access','window']);
  assert.deepEqual(inspect(s).followUp, ['equipment']);
});
test('rejects evidence not present in caller transcript without modifying state', () => {
  const s = createIntake(); addTranscript(s, 'Kitchen extractor');
  assert.throws(() => capture(s, { field:'service', status:'known', value:'Roof repair', evidence:'Roof repair' }), /Evidence must match/);
  assert.equal(s.revision, 0);
});
test('declines are preserved and permit a draft marked for follow-up', () => {
  const s = complete(); answer(s, 'area', 'I prefer not to say', 'declined');
  assert.equal(inspect(s).status, 'follow-up-needed');
  const r = prepareReview(s); assert.deepEqual(r.followUp, ['area']);
  assert.equal(r.answers.area.value, '');
});
test('cannot prepare an incomplete request', () => assert.throws(() => prepareReview(createIntake()), /unanswered/));
test('correction invalidates a reviewed and confirmed draft', () => {
  const s = complete(), r = prepareReview(s); confirmReview(s, r.revision, true);
  answer(s, 'window', 'Saturday instead');
  assert.equal(s.review, null); assert.equal(s.confirmed, null);
  assert.throws(() => confirmReview(s, r.revision, true), /changed/);
});
test('identical answer replay does not change revision', () => {
  const s = complete(), rev = s.revision; answer(s, 'service'); assert.equal(s.revision, rev);
});
test('review requires exact current revision and explicit true', () => {
  const s = complete(), r = prepareReview(s);
  assert.throws(() => confirmReview(s, r.revision, 'true'), /Explicit/);
  assert.throws(() => confirmReview(s, r.revision - 1, true), /changed/);
  const result = confirmReview(s, r.revision, true);
  assert.equal(result.booking, null); assert.equal(result.price, null); assert.equal(result.delivery, 'local-download-only');
});
test('returned state cannot mutate the source', () => {
  const s = complete(), data = inspect(s); data.answers.service.value = 'Injected';
  assert.equal(s.answers.service.value, 'Example answer');
});
test('unrecognized fields and empty evidence fail closed', () => {
  const s = createIntake();
  for (const field of ['__proto__', 'constructor', 'price']) assert.throws(() => capture(s,{field}), /Unknown/);
  assert.throws(() => capture(s, { field:'service',status:'known',value:'x',evidence:'' }), /evidence quote/);
});
test('intake state is isolated between callers', () => {
  const a = complete(), b = createIntake(); assert.equal(b.transcript.length, 0); assert.equal(inspect(b).missing.length, 5); assert.equal(inspect(a).missing.length, 0);
});
test('agent cannot approve, send or book through its available tools', () => {
  const config = agentConfig(); assert.deepEqual(config.tools.map(t=>t.name), ['capture_answer','inspect_intake']);
  assert.ok(config.tools.every(t=>t.type==='function' && t.parameters.type==='object'));
});
