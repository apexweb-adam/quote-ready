# QuoteReady intake core 0.1.0-rc.1 — evaluation preview

This release packages the provider-independent, MIT-licensed five-field intake/review core. It is for evaluation, not a stable production release. It does not deploy the voice application or merge the broader maintenance pull request. The JavaScript implementation and TypeScript declarations are unchanged from reviewed source commit `75bf80912562b1cbe3982492dd516fc1b8aa2f3c`; this candidate changes package version, tested Node range, and distribution instructions only.

## Try it in your own disposable project

Download all seven release assets (including this guide as `QUICKSTART.md`) into an empty folder. Use Node.js 22 or 24. Verify the checksums (Linux: `sha256sum -c SHA256SUMS.txt`; macOS: `shasum -a 256 -c SHA256SUMS.txt`). Then:

```sh
npm init -y
npm install --offline --ignore-scripts --no-audit --no-fund --package-lock=false ./quoteready-intake-core-0.1.0-rc.1.tgz
node --test consumer.test.mjs
```

The six consumer tests use the installed package's public export, not repository-relative imports. They are maintainer-authored synthetic checks, not independent adoption. There are no runtime dependencies, required credentials, network/model requests, or live microphone use. Downloading the release itself requires network access. With TypeScript 5.8.3 already installed, check the supplied declarations using:

```sh
tsc --strict --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 consumer-types.mts
```

## Useful independent evaluation

Try a small integration in an application you independently maintain. Record its repository or a permissioned description, the exact version, the function you attempted to reuse, and the observed result. In particular, test a correction after a prepared review and verify that a fresh approval is required. Feedback that the fixed schema does not fit is useful; no positive endorsement, star, fork, or pull request is required.

Classify the result as evaluation only, experimental integration, or production use. An evaluation is not adoption; one integration is not evidence of broad use. Note any employment, financial, client, or maintainer relationship so it is not misrepresented as independent. Do not include real transcripts, credentials, private customer data, or details of an unpatched vulnerability in a public issue. Use SECURITY.md for sensitive reports.

## Important boundaries

The fields are service, equipment, area, access, and window. Evidence matching establishes received-text provenance, not semantic correctness or speaker identity. The host must obtain real user approval, display values and evidence, safely render untrusted text, and supply any authentication, authorization and retention controls. No bookings, payments or messages are performed. The old low-level state API remains mutable; prefer createSession(). This preview is not a completed Codex Security scan or security certification. Its npm publication guard remains enabled.
