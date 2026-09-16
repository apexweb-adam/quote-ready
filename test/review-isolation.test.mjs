import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createIntake, addTranscript, capture, prepareReview, confirmReview, fields
} from '../public/intake.mjs';

function complete() {
  const state = createIntake();
  for (const field of Object.keys(fields)) {
    const value = `Recorded ${field}`;
    addTranscript(state, value);
    capture(state, { field, value, status: 'known', evidence: value });
  }
  return state;
}

test('prepareReview returns a detached snapshot, not the internal review', () => {
  const state = complete();
  const review = prepareReview(state);
  assert.deepEqual(review, state.review);
  assert.notStrictEqual(review, state.review);
  assert.notStrictEqual(review.answers, state.review.answers);
  assert.notStrictEqual(review.answers.service, state.review.answers.service);
});

test('mutating returned review values and evidence cannot alter a confirmed draft', () => {
  const state = complete();
  const review = prepareReview(state);
  const revision = state.revision;
  const original = structuredClone(state.review);

  review.answers.service.value = 'Unrecorded replacement';
  review.answers.service.evidence = 'Fabricated transcript';
  review.followUp.push('service');
  review.missing.push('window');
  review.preparedAt = 'corrupted timestamp';

  const confirmed = confirmReview(state, revision, true);
  assert.deepEqual(state.review, original);
  assert.deepEqual(confirmed.answers, original.answers);
  assert.deepEqual(confirmed.followUp, original.followUp);
  assert.deepEqual(confirmed.missing, original.missing);
  assert.equal(confirmed.preparedAt, original.preparedAt);
  assert.equal(state.revision, revision);
});

test('confirmReview also keeps its returned draft isolated from stored state', () => {
  const state = complete();
  const review = prepareReview(state);
  const confirmed = confirmReview(state, review.revision, true);
  confirmed.answers.window.value = 'Unrecorded later change';
  assert.equal(state.confirmed.answers.window.value, 'Recorded window');
  assert.equal(state.review.answers.window.value, 'Recorded window');
});

test('the static demo uses the same intake implementation as the live source', () => {
  const live = readFileSync(new URL('../public/intake.mjs', import.meta.url), 'utf8');
  const demo = readFileSync(new URL('../docs/intake.mjs', import.meta.url), 'utf8');
  assert.equal(demo, live);
});
