# QuoteReady

Original AssemblyAI voice-intake prototype. Collects five service-request details with transcript evidence, supports corrections and unknown/declined answers, and produces a locally downloaded draft after explicit screen review. No quotes, bookings, emails or business-side records are created.

## Run

Node.js 20 or newer; the local application has no runtime package dependencies. `npm ci` installs the development types used for Netlify deployment.

```sh
npm test
npm start
```

Open http://127.0.0.1:4318. The fictional example works without an account. The server intentionally accepts only its loopback address; it is not a production/public hosting configuration.

For live voice, provide `ASSEMBLYAI_API_KEY` through a private environment variable before starting. Never add it to source or send it in chat. Consent and microphone permission are required for each browser session. The server mints a single-use token with a 60-second redemption period and a five-minute session cap. The browser supplies an inline agent configuration and runs narrowly scoped client-side tools. Local draft fields persist only in browser memory; downloads are explicit.

## Evidence and limits

- Original source released under the MIT License.
- 26 local tests cover intake, review text, HTTP boundaries, hosted access protection, audio resampling and parallel tool-result delivery.
- Live AssemblyAI token minting, session initialization, all five field captures and a Friday-to-Monday correction passed on September 8, 2026 using synthesized speech. The correction invalidated the old review. Browser microphone testing remains separate.
- The public app completed a guided browser voice session, including all five fields and the correction, and exported a 64-second video. Basic microphone connection, transcription and reply were observed separately; broader real-speaker and interruption evaluation remain future work.
- Exact transcript matching establishes quote provenance, not semantic correctness of an AI-extracted value. The user must review the values and evidence.
- Microphone capture resamples device-rate audio to 24 kHz PCM16; playback uses Web Audio buffers at 24 kHz. Browser/device audio QA remains required.
- No server transcript storage. The optional guided-demo recorder saves only the synthesized caller and agent output in browser memory, with an explicit download. Microphone conversations are not recorded by the app. AssemblyAI handles live audio under its current processing and retention terms.
- A six-slide presentation, captioned video and protected public voice app are available. A final contest submission receipt remains separate from event enrollment.

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

## Public voice and recorded demonstration

- Live app: https://quote-ready-voice.netlify.app
- Captioned recording: https://quote-ready-voice.netlify.app/watch.html

The live app requires a private reviewer invitation code. The same live service supports microphone input or a clearly labelled guided synthetic caller. The recording uses the real session audio, transcripts and state changes; it is not a customer session.

For Netlify deployment, configure `ASSEMBLYAI_API_KEY`, `QUOTEREADY_INVITE_CODE` (at least 16 characters), `QUOTEREADY_ORIGIN` (the exact HTTPS origin), and `QUOTEREADY_INVITE_EXPIRES_AT` privately. The hosted token has a three-minute session cap. The source defines a per-IP rate rule; enforceability must be checked on each target deployment. The dedicated release command is `node scripts/deploy-live.mjs`; it verifies the exact site and tests before uploading both assets and Functions.
