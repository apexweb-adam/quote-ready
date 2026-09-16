# QuoteReady review and release gate

This is a pre-release review checklist, not a claim of release, outside adoption, certification or program acceptance. Application preparation is separate from the maintainer's release decision.

## Review the bounded change

PR #1 extracts the five-field intake core, isolates review snapshots, adds validation and documentation, clears retained UI artifacts, and strengthens cancelled-start and failed-shutdown handling. Inspect the diff and CI for the exact head before merging. Generated `docs/` copies are the same application, not separate integrations.

The new `test/session-lifecycle.test.mjs` exercises the actual application functions with deterministic fake browser resources and timers. In local testing against the preceding application blob `b54ea169ec4e947d4a4ff4c7427b5ff44beb053c`, 9 of its 12 assertions failed; all 12 passed after the change. Those failures represent overlapping cleanup/cancellation conditions, not nine separately assessed vulnerabilities. Full runtime and real Chromium results must be taken from the final commit's CI logs, not inferred from this local result.

Shutdown now attempts stream/worklet/socket cleanup before awaiting recorder/audio completion. Each asynchronous completion has a three-second UI deadline; an expired wait does not prove that the browser released the resource. Late recorder results are ignored. Cancelling startup aborts app-side token/fixture fetches and prevents a new token request after delayed audio initialization. Aborting a fetch cannot undo a token the server already issued. Existing short session limits remain important.

## Merge/release decision

- Inspect the final Node 22 and Node 24 runtime results, strict declaration checks, generated assets and package import checks.
- Inspect the real Chromium keyless sample, correction, review, download and reset results.
- Recheck synthetic voice/audio/recording integration before describing a voice release as validated. Deterministic resource fakes are not device testing.
- Resolve any release-blocking findings and record the maintainer's approval. Do not let an application deadline replace review.
- On explicit authorization, merge and publish a clearly labelled version with installation instructions, scope and known limitations. Keep `private: true` until a deliberate npm publishing decision. A GitHub tag is not an npm publication.

A core-only experimental release can document a narrower scope than the full voice prototype, but it still requires a reviewed version and an actual release operation. No automatic release is installed here.

## Independent evaluation

Use `EVALUATION-KIT.md` with an independent developer who genuinely needs the component. Ask for a reproducible integration or concrete limitation; no star, positive review or PR is required. Record repository, version/commit, function reused and evidence with permission. A first integration is a learning milestone, not any program's eligibility threshold.

## Security access

`security/THREAT-MODEL.md` and `security/REVIEW-PLAN.md` define a repository-limited proposed deeper review. This ordinary AI-assisted maintenance work is not a Codex Security scan. Do not scan third-party systems or expose credentials. Security access and a subscription award remain separate from passing tests.
