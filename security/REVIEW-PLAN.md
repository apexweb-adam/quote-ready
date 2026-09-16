# Scoped security review plan

This is a future scan plan, not a completed scan. The maintainer requested improvements to this repository. Installing a security plugin does not prove program acceptance or permission to scan other systems.

## Authorized target

Repository: `apexweb-adam/quote-ready`. Begin at a recorded commit SHA on the maintenance branch. Include `packages/intake-core/`, `public/`, `server.mjs`, `netlify/functions/`, deployment configuration and `.github/workflows/`. Generated `docs/` copies should be checked for consistency rather than counted as separate projects. Exclude private commercial repositories, external service endpoints, real credentials and customer data.

## Review priorities

1. Trace token requests through origin, host, invitation, expiry and response handling. Separate code controls from platform-enforced rate limiting.
2. Trace untrusted caller/model text into DOM, state, tool execution and output. Verify that models cannot call approval, message-sending, quote or booking operations.
3. Examine correction/review invariants, session reset, cancelled starts, delayed recorder shutdown and repeated event delivery.
4. Check dependency/CI/release permissions and whether build artifacts expose unintended files.

## Completion evidence

For each candidate finding, record the commit, affected path, threat preconditions, minimal synthetic reproduction, observed vs expected behavior, triage decision, tested patch and review status. Record false positives as such. Distinguish an observed bug from a hypothetical risk. Do not assign an invented severity or claim a CVE.

A bounded scan should produce a maintainer-reviewed report and patch queue, not unattended merges or mass issue creation. Assess usefulness with confirmed findings and accepted fixes; test totals and scanner output volumes do not measure adoption. No API credit request is needed merely to document this intended use of a Pro subscription and conditional Security access.
