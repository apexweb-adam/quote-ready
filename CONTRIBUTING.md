# Contributing to QuoteReady

Start with a reproducible problem or integration need. Discuss significant scope changes in an issue before implementation. Small, focused bug fixes with regression tests are welcome. Please do not split one logical change into multiple pull requests or generate activity to inflate metrics.

## Development

Use Node.js 22 or 24. The local application and core have no runtime package dependencies. `npm ci --ignore-scripts` installs the existing deployment development dependencies when needed. Run:

```sh
node scripts/sync-intake-core.mjs --check
npm test
node examples/intake-core.mjs
```

Change the reusable module in `packages/intake-core/index.mjs`, then run `node scripts/sync-intake-core.mjs`. The checked-in browser and static copies must match. Provider configuration belongs in `public/assemblyai-config.mjs`, not in the reusable module. `node scripts/build-static-demo.mjs` rebuilds the public synthetic sample.

Type declarations can be checked with TypeScript 5.8.3:

```sh
tsc --strict --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 test-types/intake-core.mts
```

## Pull requests

Describe the problem, expected and actual behavior, changes, tests run, and remaining limitations. Include the relevant Node/browser versions. Keep synthetic fixtures labelled, obtain permission before using real-speaker recordings, and never attach API keys, invitation codes, customer transcripts or personal data. Do not run paid provider tests automatically in untrusted pull-request workflows.

AI assistance is permitted for proposed changes, but the contributor remains responsible for understanding the code, reviewing it, testing it, and disclosing material assistance in the PR. A generated patch or self-authored PR is not independent external adoption. Maintain existing copyright and license notices.

For security concerns, follow SECURITY.md. Maintainers may request changes or close proposals that are unsafe, redundant or outside scope. No response-time guarantee is made.
