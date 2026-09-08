# QuoteReady

Original AssemblyAI voice-intake prototype. Collects five service-request details with transcript evidence, supports corrections and unknown/declined answers, and produces a locally downloaded draft after explicit screen review. No quotes, bookings, emails or business-side records are created.

## Run

Node.js 20 or newer; no package dependencies.

```sh
npm test
npm start
```

Open http://127.0.0.1:4318. The fictional example works without an account. The server intentionally accepts only its loopback address; it is not a production/public hosting configuration.

For live voice, provide `ASSEMBLYAI_API_KEY` through a private environment variable before starting. Never add it to source or send it in chat. Consent and microphone permission are required for each browser session. The server mints a single-use token with a 60-second redemption period and a five-minute session cap. The browser supplies an inline agent configuration and runs narrowly scoped client-side tools. Local draft fields persist only in browser memory; downloads are explicit.

## Evidence and limits

- Original source released under the MIT License.
- 22 local tests cover intake, HTTP boundaries, audio resampling and parallel tool-result delivery.
- Live AssemblyAI token minting, session initialization, all five field captures and a Friday-to-Monday correction passed on September 8, 2026 using synthesized speech. The correction invalidated the old review. Browser microphone testing remains separate.
- Real microphone, interruption and browser/device audio QA remain outstanding.
- Exact transcript matching establishes quote provenance, not semantic correctness of an AI-extracted value. The user must review the values and evidence.
- Microphone capture resamples device-rate audio to 24 kHz PCM16; playback uses Web Audio buffers at 24 kHz. Browser/device audio QA remains required.
- No application audio recording or server transcript storage. AssemblyAI handles live audio; its current service terms govern provider processing and retention.
- A six-slide presentation is included. Secured public live voice hosting, video, microphone demo proof and final contest submission receipt remain pending. Event enrollment is separate from submitting the project.

## Protocol references

Verified from AssemblyAI documentation on September 6 and 8, 2026:

- https://www.assemblyai.com/docs/voice-agents/voice-agent-api/browser-integration
- https://www.assemblyai.com/docs/voice-agents/voice-agent-api/session-configuration
- https://www.assemblyai.com/docs/voice-agents/voice-agent-api/tools/client-side-tools

The official starter was used only to locate documentation; this directory does not redistribute its code.

## Optional live regression check

With the local server configured, Node.js 22+ can run `scripts/live-voice-check.mjs`. It requires two mono PCM16 WAV files at 24 kHz: a fictional caller providing all five details, then a correction changing the preferred time to Monday morning. It uses real AssemblyAI credits and ends the session explicitly, with a 110-second test timeout. It does not open or record a microphone.

```sh
node scripts/live-voice-check.mjs 4318 intake.wav correction.wav evidence.json
```

The output labels the input as synthesized speech. Passing requires actual provider transcripts, tool capture of every field, a corrected time, and invalidation of the old review. This is an API integration check, not proof of browser microphone quality.

## Public interactive sample

`node scripts/build-static-demo.mjs` generates `docs/` for GitHub Pages. This version exposes the fictional example, corrections, review and download. It intentionally contains no API token endpoint and does not open a microphone. Run the local server for live voice.

The presentation source uses the optional `pptxgenjs` package: `node scripts/build-deck.cjs presentation/QuoteReady.pptx`.
