// Maintainer-authored package-consumer tests. Not independent adoption.
// Run after installing the .tgz into a disposable project; no provider calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, fields, formatReview } from 'quoteready-intake-core';
function fullSession() {
  const session = createSession();
  for (const field of Object.keys(fields)) {
    const text = `Synthetic ${field}`;
    session.addTranscript(text);
    session.capture({field, status:'known', value:text, evidence:text});
  }
  return session;
}
test('installed public export supports capture, review, and a draft with no transaction', () => {
  const session=fullSession(), review=session.prepareReview();
  assert.match(formatReview(review), /Requested work: Synthetic service/);
  assert.throws(()=>session.confirmReview(review.revision,false),/Explicit/);
  const draft=session.confirmReview(review.revision,true);
  assert.equal(draft.delivery,'local-download-only');
  assert.equal(draft.booking,null); assert.equal(draft.price,null);
  assert.equal(Object.keys(draft.answers).length,5);
});
test('a correction invalidates the approval previously obtained by the consumer', () => {
  const session=fullSession(), review=session.prepareReview();
  session.confirmReview(review.revision,true);
  session.addTranscript('Monday morning');
  session.capture({field:'window',status:'known',value:'Monday morning',evidence:'Monday morning'});
  assert.throws(()=>session.confirmReview(review.revision,true),/changed/);
  const current=session.prepareReview();
  assert.equal(session.confirmReview(current.revision,true).answers.window.value,'Monday morning');
});
test('unknown and declined responses remain explicit follow-up items', () => {
  const session=fullSession();
  for(const [field,status] of [['equipment','unknown'],['access','declined']]) {
    const evidence=`Synthetic ${status}`;session.addTranscript(evidence);
    session.capture({field,status,value:'not a fact',evidence});
  }
  const review=session.prepareReview();
  assert.deepEqual(review.followUp,['equipment','access']);
  assert.equal(review.answers.equipment.value,'');
  assert.equal(review.answers.access.value,'');
});
test('consumer-owned returned objects cannot mutate the private session', () => {
  const session=fullSession(), review=session.prepareReview();
  review.answers.service.value='mutated';review.followUp.push('window');
  const draft=session.confirmReview(review.revision,true);
  assert.equal(draft.answers.service.value,'Synthetic service');
  assert.deepEqual(draft.followUp,[]);
  draft.answers.service.evidence='mutated';
  assert.equal(session.inspect().answers.service.evidence,'Synthetic service');
});
test('fabricated evidence is rejected and a second session has no first-session data', () => {
  const first=fullSession(), second=createSession();
  assert.equal(first.inspect().missing.length,0);
  assert.equal(second.inspect().missing.length,5);
  assert.throws(()=>second.capture({field:'service',status:'known',value:'Synthetic service',evidence:'Synthetic service'}),/Evidence must match/);
  assert.equal(second.inspect().revision,0);
});
test('public schema and package import boundaries are preserved', async () => {
  assert.ok(Object.isFrozen(fields));
  assert.throws(()=>{fields.price='Price';},TypeError);
  await assert.rejects(import('quoteready-intake-core/package.json'), {code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
  const session=createSession();
  for(const name of ['send','book','execute','state']) assert.equal(session[name],undefined);
});
