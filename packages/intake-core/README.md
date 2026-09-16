# QuoteReady intake core

Provider-independent JavaScript state machine for five-field service-request intake. MIT licensed; zero runtime dependencies. This is an **unpublished, pre-release module**, not an established infrastructure package. `private: true` intentionally prevents an accidental registry publication.

Use directly from a checkout:

```js
import { createSession } from './packages/intake-core/index.mjs';
const session = createSession();
session.addTranscript('Monday morning');
session.capture({ field: 'window', status: 'known', value: 'Monday morning', evidence: 'Monday morning' });
console.log(session.inspect());
```

Run `node examples/intake-core.mjs` from the repository for a complete synthetic workflow without credentials, models, microphone access or network requests.

## API

`createSession()` is the preferred entry point. It keeps mutable state inside a closure and returns an immutable facade. `inspect()`, `capture()`, `prepareReview()` and `confirmReview()` return independent snapshots. The compatibility functions (`createIntake`, `addTranscript`, `capture`, `inspect`, `prepareReview`, `confirmReview`) remain available, but their state object is intentionally mutable and must stay inside trusted application code.

The field keys are `service`, `equipment`, `area`, `access`, and `window`. Answers have `known`, `unknown`, or `declined` status. Unknown/declined values are normalized to an empty string. Every capture needs a nonempty evidence string present verbatim inside one previously received transcript entry. Matching is case-sensitive; evidence must fit in one entry. Character limits use JavaScript string length: 10,000 per transcript entry, 200 entries per session, 2,000 per evidence quote, and 1,000 per known value.

Address every field before `prepareReview()`. Show the returned values **and evidence** to the user. Call `confirmReview(review.revision, true)` only after explicit approval in your UI; do not expose it as an AI-callable tool. A changed recorded answer invalidates the old review and confirmation. An identical capture is a no-op. Create a new session object for a new caller.

## Limits and integration responsibilities

Evidence matching proves only that text was received, not that it supports the extracted value or that the speaker is truthful. The boolean approval parameter is not an authentication mechanism or proof of human identity. The host must provide consent, access control, retention rules, session isolation, and safe UI rendering. Use text nodes/textContent rather than injecting values as HTML. This module does not detect personal data or enforce legal compliance. It makes no bookings, sends no messages, and performs no network or storage operations. The schema is fixed; arbitrary/custom schemas are not yet supported.

The browser adapter's voice-provider configuration remains separate. Browser microphone, interruption and real-speaker evaluation are not proved by unit tests.

## Local package inspection

```sh
npm pack ./packages/intake-core --ignore-scripts --pack-destination /tmp
```

Inspect the resulting archive before use. No npm listing, registry downloads, external users, or adoption are claimed. Review package ownership, versioning, documentation and security before removing the publication guard. Keep the MIT notice when redistributing code.
