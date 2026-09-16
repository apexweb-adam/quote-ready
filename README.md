# QuoteReady

Evidence-linked, human-reviewed voice intake, with a reusable JavaScript core. MIT licensed. **Prototype / pre-release**, not a production-certified service or an established infrastructure dependency.

QuoteReady collects five service-request details, preserves unknown or declined answers, supports corrections, and requires explicit screen review before producing a locally downloaded draft. It does not create quotes, bookings, emails or business-side records.

## Start here

Use Node.js 22 or 24 for development. The local app and core have no runtime package dependencies; `npm ci --ignore-scripts` installs the existing development types used for Netlify deployment when needed.

```sh
npm test
node examples/intake-core.mjs
npm start
```

Open `http://127.0.0.1:4318`. The fictional sample works without an account or voice-provider key. The example script uses synthetic text, no microphone and no network calls. The server intentionally accepts only its loopback address; it is not a public hosting configuration.

## Reuse the intake core

The provider-independent module is in [`packages/intake-core`](packages/intake-core/README.md). It includes an immutable session facade, independent review/draft snapshots and ESM TypeScript declarations. The five-field schema is fixed; configurable schemas are future work.

```js
import { createSession } from './packages/intake-core/index.mjs';
const session = createSession();
session.addTranscript('Monday morning');
session.capture({
  field: 'window', status: 'known',
  value: 'Monday morning', evidence: 'Monday morning'
});
console.log(session.inspect());
```

Address all five fields, call `prepareReview()`, display the values and evidence, and obtain explicit user approval before `confirmReview(review.revision, true)`. Do not expose approval as a model-callable tool. A changed recorded answer invalidates the old review and confirmation. Exact transcript matching establishes provenance, **not semantic correctness**. The host application must implement consent, identity/access controls and retention rules.

The module is **not published to npm**. `private: true` deliberately blocks accidental registry publication. No independent users, downstream dependents or registry download counts are claimed.

## Repository layout

| Path | Purpose |
| --- | --- |
| `packages/intake-core/` | Canonical reusable module, declarations, license and API guide |
| `public/intake.mjs` | Compatibility entry point for the existing browser app |
| `public/assemblyai-config.mjs` | Voice-provider configuration, kept outside the core |
| `public/intake-core.mjs` | Generated browser copy of the core |
| `docs/` | Public fictional sample; no token endpoint |
| `test/` and `test-types/` | Runtime regressions and declaration checks |
| `evidence/` | Previously recorded, explicitly scoped demonstration evidence |

## Verification and development

```sh
node scripts/sync-intake-core.mjs --check
npm test
node scripts/build-static-demo.mjs
```

Edit `packages/intake-core/index.mjs`, then run `node scripts/sync-intake-core.mjs`. Checked-in copies must match. CI runs the repository tests and package smoke checks on Node.js 22 and 24 without provider credentials, publication or deployment. Green unit tests do not establish browser microphone quality, accessibility, real-speaker performance, production readiness or ecosystem adoption.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), [ROADMAP.md](ROADMAP.md) and [CHANGELOG.md](CHANGELOG.md). Material AI assistance should be disclosed and changes reviewed before merging.

## Optional live voice

Set `ASSEMBLYAI_API_KEY` in a private environment variable before starting. Never commit or send keys in chat. Microphone consent and permission are required for each session. The local server mints a single-use token with a 60-second redemption period and five-minute session cap. The browser uses an inline agent configuration and narrowly scoped tools.

Local fields remain in browser memory; downloads are explicit. No server transcript storage is implemented. Microphone conversations are not recorded by the app. The optional guided-demo recorder stores only synthesized caller and agent output in browser memory, with explicit download. AssemblyAI's processing and retention terms apply independently to live audio.

Microphone audio is resampled to 24 kHz PCM16, and playback uses 24 kHz Web Audio buffers. Browser/device audio evaluation remains necessary.

### Prior evidence and its limits

The repository's September 8, 2026 evidence documents a live API check using synthesized speech: token minting, session initialization, five field captures and a Friday-to-Monday correction that invalidated the old review. A guided browser recording and a separate basic microphone observation are described in the original evidence. These are not independent customer deployments, broad real-speaker evaluation or evidence of the current change's live-provider compatibility.

With a configured local server, Node.js 22+ can run the optional live regression script:

```sh
node scripts/live-voice-check.mjs 4318 intake.wav correction.wav evidence.json
```

It requires two fictional mono PCM16 WAV files at 24 kHz, uses real AssemblyAI credits, ends the session explicitly and has a 110-second timeout. It does not open or record a microphone. Never run this automatically with secrets in an untrusted pull-request workflow.

Protocol references used by the existing voice integration:

- https://www.assemblyai.com/docs/voice-agents/voice-agent-api/browser-integration
- https://www.assemblyai.com/docs/voice-agents/voice-agent-api/session-configuration
- https://www.assemblyai.com/docs/voice-agents/voice-agent-api/tools/client-side-tools

The official starter was used only to locate documentation; the project does not redistribute its code.

## Static sample and hosted demonstration

`node scripts/build-static-demo.mjs` generates the fictional sample in `docs/`. It permits corrections, review and local download, has no API token endpoint and does not open a microphone.

Existing hosted demonstration locations (availability is separate from repository CI):

- Voice app: https://quote-ready-voice.netlify.app
- Captioned recording: https://quote-ready-voice.netlify.app/watch.html

The live app requires a private reviewer invitation code. The guided mode uses a clearly labelled synthetic caller; the recording is not a customer session.

For Netlify deployment, configure `ASSEMBLYAI_API_KEY`, `QUOTEREADY_INVITE_CODE` (at least 16 characters), `QUOTEREADY_ORIGIN` (exact HTTPS origin), and `QUOTEREADY_INVITE_EXPIRES_AT` privately. The hosted token has a three-minute session cap. The source includes a per-IP rate rule; verify enforcement on the actual deployment. `node scripts/deploy-live.mjs` is the dedicated release command and must be run separately with appropriate authorization. The maintenance CI does not deploy.

The presentation source optionally uses `pptxgenjs`: `node scripts/build-deck.cjs presentation/QuoteReady.pptx`.

## License

[MIT](LICENSE). Preserve the copyright and license notice in redistributed copies.
