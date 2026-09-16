export const fields = Object.freeze({
  service: 'Requested work', equipment: 'Equipment or property',
  area: 'Service area', access: 'Access constraints', window: 'Preferred time'
});
export function createIntake() {
  return { revision: 0, answers: {}, transcript: [], review: null, confirmed: null };
}
export function addTranscript(state, text) {
  if (typeof text !== 'string' || !text.trim() || text.length > 10000) throw Error('Invalid transcript');
  if (state.transcript.length >= 200) throw Error('Session transcript limit reached');
  state.transcript.push(text.trim());
}
export function capture(state, args) {
  if (!args || typeof args !== 'object' || Array.isArray(args) || typeof args.field !== 'string' || !Object.hasOwn(fields, args.field)) throw Error('Unknown intake field');
  if (Object.keys(args).some(key => !['field', 'status', 'value', 'evidence'].includes(key))) throw Error('Unexpected answer property');
  if (!['known', 'unknown', 'declined'].includes(args.status)) throw Error('Invalid answer status');
  if (typeof args.evidence !== 'string' || !args.evidence.trim() || args.evidence.length > 2000) throw Error('A spoken evidence quote is required');
  if (!state.transcript.some(t => t.includes(args.evidence.trim()))) throw Error('Evidence must match a received caller transcript; ask the caller again if unclear');
  if (args.status === 'known' && (typeof args.value !== 'string' || !args.value.trim() || args.value.length > 1000)) throw Error('Known answers require a short value');
  const answer = { status: args.status, value: args.status === 'known' ? args.value.trim() : '', evidence: args.evidence.trim() };
  if (JSON.stringify(state.answers[args.field]) !== JSON.stringify(answer)) {
    state.answers[args.field] = answer;
    state.revision++;
    state.review = null;
    state.confirmed = null;
  }
  return inspect(state);
}
export function inspect(state) {
  const missing = Object.keys(fields).filter(k => !state.answers[k]);
  const followUp = Object.keys(fields).filter(k => state.answers[k] && state.answers[k].status !== 'known');
  return { revision: state.revision, answers: structuredClone(state.answers), missing, followUp,
    nextQuestion: missing.length ? fields[missing[0]] : null,
    status: state.confirmed ? 'reviewed-draft' : missing.length ? 'collecting' : followUp.length ? 'follow-up-needed' : 'ready-for-review' };
}
export function prepareReview(state) {
  const report = inspect(state);
  if (report.missing.length) throw Error('Finish the unanswered fields before preparing the draft');
  state.review = structuredClone({ ...report, preparedAt: new Date().toISOString() });
  return structuredClone(state.review);
}
export function formatReview(report) {
  return Object.entries(fields).map(([key,label]) => `${label}: ${report.answers[key].value || report.answers[key].status}`).join('\n\n');
}
export function confirmReview(state, revision, approved) {
  if (approved !== true) throw Error('Explicit user review is required');
  if (!state.review || revision !== state.revision || state.review.revision !== revision) throw Error('The draft changed. Review the current version first');
  state.confirmed = { ...structuredClone(state.review), reviewedAt: new Date().toISOString(),
    kind: 'service-request-draft', delivery: 'local-download-only', price: null, booking: null };
  return structuredClone(state.confirmed);
}

/**
 * Preferred integration API. The mutable state is held in this closure; every
 * returned answer/review/draft is a snapshot. Do not expose confirmReview as
 * an AI tool. The host application must obtain real human consent itself.
 */
export function createSession() {
  const state = createIntake();
  return Object.freeze({
    addTranscript(text) { addTranscript(state, text); },
    capture(args) { return capture(state, args); },
    inspect() { return inspect(state); },
    prepareReview() { return prepareReview(state); },
    confirmReview(revision, approved) { return confirmReview(state, revision, approved); }
  });
}
