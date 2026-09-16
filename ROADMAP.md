# Maintainer roadmap

This is a development plan, not a record of completed integrations or ecosystem adoption.

## Review the current maintenance change

Review the provider-independent core extraction, snapshot isolation fix, strict capture boundaries, generated-copy consistency, type declarations, synthetic example and CI. Merge only after the repository suite and package checks pass. These checks do not validate browser microphone quality or live provider behavior.

## Validate actual integrations

Support an independently maintained application trying the core. Record the exact version, integration code, limitation discovered, and outcome with permission. Keep your own deployments, synthetic fixtures, demonstrations and outside integrations labelled separately. Do not invent user counts or infer them from CI or repeated downloads.

## Extend only for demonstrated needs

Consider a configurable schema only after real integrators need it. Expand browser, device, interruption and correction tests with consenting participants. Add migration notes and compatibility decisions before a public package release. Review naming, ownership, changelog, package contents and version semantics before removing `private: true`.

## Measure honest evidence

Useful evidence includes independent integration links, reproducible issue reports, resolved regressions, public release artifacts and documented maintenance. Test totals measure checks, not real users. Do not manufacture stars, forks, dependents, identities, downloads or contributions.
