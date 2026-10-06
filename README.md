# QuoteReady

Original AssemblyAI voice-intake prototype. Collects five service-request details with transcript evidence, supports corrections and unknown/declined answers, and produces a locally downloaded draft after explicit screen review. No quotes, bookings, emails or business-side records are created.

## QuoteReady Relay: October 6 Alexa+ MCP extension

The separate `mcp/` application adds a working MCP 2025-11-25 Streamable HTTP server, durable request resumption, user-supplied supplier offers, exclusions and currency warnings, and revision-aware screen review. A request correction makes earlier offers outdated; either a correction or a new offer invalidates prior approval. The assistant can prepare a draft, but its MCP tools cannot approve it. Download requires explicit review on the local page. Source evidence is client-supplied text and still requires human review.

```sh
cd mcp
npm ci --ignore-scripts
npm test
npm start
```

Open http://127.0.0.1:4320 and run the fictional example. Compare the two synthetic offers, prepare and download a reviewed draft, change Friday to Monday, and inspect the outdated-offer warnings before reviewing again. Requests are saved to ignored `mcp/data/requests.json`; run only one server per data file. No paid API or hardware is required. This loopback demonstration has no public multi-user authentication or hosting configuration and must not be exposed as-is.

An MCP client connects to `http://127.0.0.1:4320/mcp`. Available tools: `start_request`, `record_answer`, `inspect_request`, `add_supplier_offer`, `prepare_handoff`, `export_reviewed_handoff`. With the server running, `npm run demo` exercises the official SDK client and outputs synthetic integration evidence. Six new HTTP integration tests verify version negotiation, discovery, complete handoff, correction invalidation, concurrent revision conflicts, persisted resumption and invalid inputs. The browser is a scripted MCP client, not a live Alexa or language-model session; Alexa device/provider interoperability has not been tested. The original AssemblyAI app and its published submission remain separate.

This extension is intended for the Amazon Developer Hackathon's Alexa+ MCP route, with an additional Open Source contribution. The official rules currently accept a self-hosted MCP server implementing 2025-11-25 over Streamable HTTP. Submission still requires a public YouTube/Vimeo demonstration, product feedback, eligible entrant details and final rule acceptance. No Amazon submission or prize is claimed here. Source and tests were prepared with Codex assistance; AWS services, Kiro, Alexa hardware and runtime Alexa access were not used.

Rules checked October 6, 2026: https://amazonappdev2026.devpost.com/rules . Transport reference: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports . Runtime SDK: https://github.com/modelcontextprotocol/typescript-sdk .

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
- A six-slide presentation, captioned video and protected public voice app are available. The public contest entry is https://lablab.ai/submissions/j23hzxa3xpibnfekorve8rb8 . No award or payment is confirmed.
- On October 6, 2026, all 26 local tests passed again. A fresh hosted API check captured five fields, changed Friday afternoon to Monday morning, invalidated the previous review and received agent audio. This synthetic check does not establish microphone quality or delivery of the private invitation to judges.

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

For the deployed app, pass `https://quote-ready-voice.netlify.app` in place of the port and provide the existing private `QUOTEREADY_INVITE_CODE` in the process environment. Never include the invitation in command arguments or evidence. The script restricts hosted checks to that exact origin.

The output labels the input as synthesized speech. Passing requires actual provider transcripts, tool capture of every field, a corrected time, and invalidation of the old review. This is an API integration check, not proof of browser microphone quality.

## Public interactive sample

`node scripts/build-static-demo.mjs` generates `docs/` for GitHub Pages. This version exposes the fictional example, corrections, review and download. It intentionally contains no API token endpoint and does not open a microphone. Run the local server for live voice.

The presentation source uses the optional `pptxgenjs` package: `node scripts/build-deck.cjs presentation/QuoteReady.pptx`.

## Public voice and recorded demonstration

- Live app: https://quote-ready-voice.netlify.app
- Captioned recording: https://quote-ready-voice.netlify.app/watch.html

The live app requires a private reviewer invitation code. The same live service supports microphone input or a clearly labelled guided synthetic caller. The recording uses the real session audio, transcripts and state changes; it is not a customer session.

For Netlify deployment, configure `ASSEMBLYAI_API_KEY`, `QUOTEREADY_INVITE_CODE` (at least 16 characters), `QUOTEREADY_ORIGIN` (the exact HTTPS origin), and `QUOTEREADY_INVITE_EXPIRES_AT` privately. The hosted token has a three-minute session cap. The source defines a per-IP rate rule; enforceability must be checked on each target deployment. The dedicated release command is `node scripts/deploy-live.mjs`; it verifies the exact site and tests before uploading both assets and Functions.
