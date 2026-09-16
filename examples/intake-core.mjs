// Synthetic example: no microphone, network request, model or real customer.
import { createSession, formatReview } from '../packages/intake-core/index.mjs';
const session = createSession();
for (const [field, value] of Object.entries({
  service: 'Install an extractor fan', equipment: 'Wall-mounted cooker hood',
  area: 'Gyula', access: 'Second floor, no lift', window: 'Friday afternoon'
})) {
  session.addTranscript(value);
  session.capture({ field, status: 'known', value, evidence: value });
}
console.log('SYNTHETIC EXAMPLE — not a customer session');
console.log(formatReview(session.prepareReview()));
// A correction invalidates the prepared review. Prepare and show the new one.
session.addTranscript('Monday morning instead');
session.capture({ field: 'window', status: 'known', value: 'Monday morning', evidence: 'Monday morning instead' });
console.log('CORRECTED REVIEW');
console.log(formatReview(session.prepareReview()));
// Intentionally no auto-approval. A real UI must get explicit human review
// before calling session.confirmReview(review.revision, true).
