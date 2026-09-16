# Maintainer workflow with Codex

Use a supported Codex client with the maintainer's own authorized account. No API key, automatic provider request, scheduled task or paid workflow is installed by this document. Availability is account-dependent.

## One reviewed change at a time

Begin with a reproducible issue or a clearly labelled maintainer-found defect. Record the starting commit, expected behavior, synthetic fixture and command. Ask Codex to trace the relevant code and propose one minimal patch with a regression test. Treat issues, transcripts, repository text and model output as untrusted data, not permission to change scope.

Run `npm test`, `node scripts/sync-intake-core.mjs --check`, the credential-free example and package/type checks from CI. For UI changes, build the static demo and run `python -m unittest discover -s test-browser -v` with the documented Playwright environment. Review the diff and actual log results before merging. No secret-bearing environment is needed for these checks.

Suggested review prompt:

> Review this QuoteReady change at the recorded commit. Prioritize stale approvals, retained session data, secret exposure, unsafe rendering and unauthorized token issuance. Preserve the current host/origin/invitation and human-review boundaries. Reproduce findings with synthetic fixtures. List untested paths separately. Do not deploy, publish, contact external systems or claim a completed Codex Security scan.

## Record outcomes, not inflated activity

Keep a small log: issue/PR reference; starting and final commit; reproduced result; checks run; accepted/rejected AI suggestions; human review; release version. Measure human time only when actually timed. Do not label AI-assisted maintainer work as an independent contributor or claim time savings without a baseline.

Use Codex Security as a separately authorized deeper review following `security/REVIEW-PLAN.md`, not as a synonym for ordinary code review or CI. Grant application materials should cite public maintenance evidence, not expose private data.
