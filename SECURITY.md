# Security and responsible use

QuoteReady is a prototype and pre-release reference implementation, not a security-certified production service. The maintained development line is the repository default branch. Apply changes only after review and successful checks.

For a suspected vulnerability, use GitHub's private vulnerability reporting option if it is enabled and visible. If it is unavailable, open a non-sensitive issue asking for a private reporting channel; do not publish the exploit details, keys, live transcripts or customer data. No bug bounty, guaranteed response time, or verified private reporting availability is claimed.

## Boundaries

The core verifies exact quote provenance, not semantic correctness, human identity, speaker authenticity, or legal consent. The application must display values and evidence for review. A caller with arbitrary JavaScript execution in the page already controls the client; neither snapshots nor the approval boolean create a server-side security boundary.

Keep API credentials on the server. Keep per-session tokens short-lived. Do not weaken loopback-only local hosting, invitation checks, origin validation or consent prompts to make a demo easier to access. Do not render untrusted text as HTML. Do not collect or commit unnecessary personal data. Real provider processing and retention are separate from local application storage.

Never run untrusted pull-request code with deployment keys or production secrets. CI for this change has read-only repository permissions, pinned action commits, no paid-provider calls and no publishing/deployment step.

## Review scope and reproducible checks

See [the threat model](security/THREAT-MODEL.md) and [scoped review plan](security/REVIEW-PLAN.md). These are maintainer review materials, not certification or a completed Codex Security scan. Browser privacy checks use only synthetic local data; no production secrets or paid-provider calls are needed.
