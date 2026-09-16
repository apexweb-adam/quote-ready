# Independent integration evaluation

QuoteReady is a pre-release reference implementation. No independent adoption is asserted. This guide helps a developer decide whether the fixed five-field evidence/review core is useful in their own application.

## Reproduce before integrating

Check out the explicitly named maintenance branch or a pinned reviewed commit, use Node.js 22/24, and run:

```sh
npm test
node examples/intake-core.mjs
node scripts/sync-intake-core.mjs --check
npm pack ./packages/intake-core --ignore-scripts --pack-destination /tmp
```

`npm pack` builds a local archive; it does not publish to npm or establish a download count. Import the core from the checkout or install the local archive in a disposable test app. Keep the MIT notice. The package remains `private: true` until a reviewed release decision.

Use synthetic transcripts. Capture five known/unknown/declined responses, show evidence alongside the extracted values, request a correction, verify stale approval is rejected, and require a fresh user review. Do not connect real quotes/bookings/payment flows or claim an authorization guarantee. See `packages/intake-core/README.md` for the API and limitations.

## Feedback requested

Describe your independent repository/application, the exact QuoteReady commit, the function you tried to reuse, the steps and result, and what prevented adoption. Link integration code or a reproducible issue where permitted. Label experiments, internal use and production use accurately. Do not post tokens, invitation codes, real conversations or private customer material.

There is no requirement to star, fork, publish a positive testimonial or contribute a pull request. Useful negative feedback is welcome. The maintainer's own demos, CI jobs and synthetic fixtures are not independent integrations.

## Optional outreach draft (not sent)

> I maintain QuoteReady, an MIT-licensed, early-stage evidence-and-review component for AI intake. It preserves unknown answers and invalidates a prior review after corrections; the host remains responsible for real user approval and access controls. Could you evaluate whether its fixed five-field core is useful in your own intake workflow? I would value a concrete limitation or integration example, not stars or endorsements. The public evaluation guide includes a keyless example and test commands.
