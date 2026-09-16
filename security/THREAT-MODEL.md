# QuoteReady threat model

Scope: `apexweb-adam/quote-ready`, the five-field JavaScript intake core, its browser UI, local HTTP server and hosted token handler. This document describes code boundaries and review questions, not a Codex Security scan, certification or evidence of broad adoption. Maintainer authorization covers this repository; it does not authorize probing AssemblyAI, Netlify or unrelated repositories and websites.

## Data and execution boundaries

| Boundary | Data / authority | Expected constraint |
| --- | --- | --- |
| Caller or manual entry -> transcript | Untrusted text, including instructions and markup | Length/count bounds; rendering as text, not HTML |
| Model tools -> intake | Proposed fields, statuses and evidence | Fixed field/tool allowlists; exact transcript quote; no approval or booking tool |
| Intake -> review UI | Structured values and evidence | Detached snapshots; corrections invalidate prior review |
| User review -> downloaded draft | Explicit user action | Current revision and strict approval; no automatic sending |
| Browser -> token endpoint | Origin, invitation code, short-lived session token | Exact origin/host checks; server-side provider key; bounded sessions |
| Provider -> browser | Audio, transcript and tool events | Treat model output as untrusted; do not let source text widen tool permissions |
| CI -> repository | Untrusted proposed source changes | Read-only token, pinned actions, no deployment/provider secrets |
| Session reset -> retained UI/media | Hidden review, form text, canvas, object URLs | Clear app-owned view state and revoke owned recording URLs |

The core does not authenticate a person, prove speaker identity, judge semantic correctness, implement durable audit storage, or authorize server-side transactions. `approved: true` is not authentication. Arbitrary same-page JavaScript can control a client; the legacy raw-state API is mutable by design. Prefer `createSession()` and implement authentication/authorization in any integrating host app.

## Assets and failure scenarios

Protect the server-side provider key, private reviewer invitation, local request details, current review version, bounded provider usage, and release integrity. Review unauthorized token issuance, sensitive data in logs or errors, unsafe HTML rendering, stale-review acceptance, cross-session leakage, retained media after reset, async teardown/restart races, and accidental privileged CI execution.

Prompt text alone is not a security boundary. Exact quote matching alone does not prevent a model from assigning an incorrect value to a real quote. Review both values and evidence. The local app intentionally binds to loopback; do not present it as production hosting.

## Evidence and remaining gaps

`test/` covers the core, HTTP paths, audio transformation and token-handler behavior. `test-browser/test_offline.py` exercises synthetic sample/review/download/correction/reset paths in Chromium and blocks token issuance, non-local HTTP, WebSockets and microphone requests. Its canvas/blob fixture checks UI cleanup, not live recording quality. CI log results must be inspected before claiming a pass.

The hosted rate rule still needs verification on each deployment; a local function test cannot establish a distributed rate limit. Browser/device audio, provider interruption behavior, async recording teardown, full accessibility, deployment configuration and provider retention remain separately scoped validation work. Reset cannot erase already downloaded files, another tab, browser/OS forensic copies or provider-held data; do not describe it as secure erasure.

## Proposed deeper security review

Use Codex Security only after access and repository authorization are confirmed. Prioritize the token handler, browser event lifecycle, approval-state transitions and release workflow. Validate findings with synthetic fixtures locally or in isolated CI, triage false positives, and require human review before patches or disclosure. Do not attach raw customer transcripts, credentials or unpatched exploit details to a grant application.
