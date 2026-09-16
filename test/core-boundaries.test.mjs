import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, createIntake, addTranscript, capture, inspect, fields } from '../packages/intake-core/index.mjs';
function completed() {
  const s = createSession();
  for (const field of Object.keys(fields)) {
    s.addTranscript(`Example ${field}`);
    s.capture({ field, status: 'known', value: `Example ${field}`, evidence: `Example ${field}` });
  }
  return s;
}
test('session facade exposes no mutable internal state', () => {
  const s = completed();
  assert.equal(Object.isFrozen(s), true);
  assert.deepEqual(Object.keys(s), ['addTranscript','capture','inspect','prepareReview','confirmReview']);
  const view = s.inspect(); view.answers.service.value = 'changed'; view.missing.push('service');
  assert.equal(s.inspect().answers.service.value, 'Example service');
  assert.deepEqual(s.inspect().missing, []);
});
test('session review and draft outputs cannot alter subsequent confirmations', () => {
  const s = completed(), r = s.prepareReview(); r.answers.service.value = 'changed';
  const d = s.confirmReview(r.revision, true); assert.equal(d.answers.service.value, 'Example service');
  d.answers.service.evidence = 'invented';
  assert.equal(s.confirmReview(r.revision, true).answers.service.evidence, 'Example service');
});
test('session correction invalidates old approval, including declined answers', () => {
  const s = completed(), old = s.prepareReview(); s.confirmReview(old.revision, true);
  s.addTranscript('I prefer not to say');
  s.capture({ field:'area',status:'declined',value:'ignored',evidence:'I prefer not to say' });
  assert.throws(() => s.confirmReview(old.revision,true), /changed/);
  const r=s.prepareReview(); assert.equal(r.answers.area.value,''); assert.deepEqual(r.followUp,['area']);
});
test('replayed identical answer preserves the current reviewed draft', () => {
  const s=completed(),r=s.prepareReview();s.confirmReview(r.revision,true);
  s.capture({field:'service',status:'known',value:'Example service',evidence:'Example service'});
  assert.equal(s.inspect().revision,r.revision);assert.equal(s.inspect().status,'reviewed-draft');
});
test('public field schema cannot be altered globally', () => {
  assert.ok(Object.isFrozen(fields));assert.throws(()=>{fields.service='unexpected';},TypeError);
  assert.equal(fields.service,'Requested work');
});
test('malformed capture arguments do not mutate state', () => {
  const s=createIntake();addTranscript(s,'Repair'); const before=structuredClone(s);
  for(const args of [null,[],{}, {field:{toString:()=> 'service'}}, {field:'__proto__'},
    {field:'service',status:'known',value:'Repair',evidence:'Repair',approve:true},
    {field:'service',status:'invented',value:'Repair',evidence:'Repair'}]) {
    assert.throws(()=>capture(s,args));assert.deepEqual(s,before);
  }
});
test('transcript count and length limits are exact and non-mutating on failure', () => {
  const s=createIntake(); addTranscript(s,'x'.repeat(10000));
  for(let i=1;i<200;i++)addTranscript(s,'Example');
  const before=structuredClone(s);
  for(const value of ['', '   ', null, 123, 'x'.repeat(10001), 'another transcript']) {
    assert.throws(()=>addTranscript(s,value));assert.deepEqual(s,before);
  }
});
test('known values and evidence enforce length boundaries', () => {
  const s=createIntake();addTranscript(s,'x'.repeat(2001));
  capture(s,{field:'service',status:'known',value:'x'.repeat(1000),evidence:'x'.repeat(2000)});
  const before=structuredClone(s);
  for(const changes of [{value:'x'.repeat(1001)},{evidence:'x'.repeat(2001)},{value:'  '},{evidence:'  '}]) {
    assert.throws(()=>capture(s,{field:'service',status:'known',value:'x',evidence:'x',...changes}));
    assert.deepEqual(s,before);
  }
});
test('unknown answers normalize value without fabricating a fact', () => {
  const s=createSession();s.addTranscript('I do not know');
  s.capture({field:'equipment',status:'unknown',value:'not a verified model',evidence:'I do not know'});
  assert.equal(s.inspect().answers.equipment.value,'');
  assert.deepEqual(s.inspect().followUp,['equipment']);
});
test('evidence provenance does not imply semantic correctness', () => {
  const s=createSession();s.addTranscript('Monday morning');
  s.capture({field:'window',status:'known',value:'Friday afternoon',evidence:'Monday morning'});
  // This documents a deliberate limit: the host must show BOTH value and evidence.
  assert.equal(s.inspect().answers.window.value,'Friday afternoon');
});
test('approval is strict and revision-specific', () => {
  const s=completed(),r=s.prepareReview();
  for(const value of [false,1,'true',null,undefined])assert.throws(()=>s.confirmReview(r.revision,value),/Explicit/);
  for(const rev of [String(r.revision),NaN,Infinity,r.revision-1])assert.throws(()=>s.confirmReview(rev,true),/changed/);
});
test('independent session objects do not share transcripts or answers', () => {
  const a=completed(),b=createSession();assert.equal(a.inspect().missing.length,0);assert.equal(b.inspect().missing.length,5);
  assert.throws(()=>b.capture({field:'service',status:'known',value:'Example service',evidence:'Example service'}),/Evidence must match/);
});
test('repeated corrections cannot approve a stale prepared revision', () => {
  const s=completed();
  for(let i=0;i<100;i++) {
    const previous=s.prepareReview();s.confirmReview(previous.revision,true);
    const value=`Correction ${i}`;s.addTranscript(value);
    s.capture({field:'window',status:'known',value,evidence:value});
    assert.throws(()=>s.confirmReview(previous.revision,true),/changed/);
    assert.equal(s.inspect().status,'ready-for-review');
  }
});
