import { createSession, fields, type CaptureArgs } from '../packages/intake-core/index.mjs';
const session = createSession();
const args: CaptureArgs = { field: 'service', status: 'known', value: 'Repair', evidence: 'Repair' };
session.addTranscript(args.evidence);
session.capture(args);
const review = session.prepareReview();
session.confirmReview(review.revision, true);
// @ts-expect-error: unsupported field
session.capture({ ...args, field: 'price' });
// @ts-expect-error: approval must be literal true, not a string
session.confirmReview(review.revision, 'true');
// @ts-expect-error: field labels are immutable
fields.service = 'Changed';
// @ts-expect-error: callers must not have access to internal state
session.state.answers = {};
