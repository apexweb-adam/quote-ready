# Changelog

## Unreleased

- Extract the provider-independent intake core into `packages/intake-core`, preserving the browser compatibility entry point.
- Fix mutable review-snapshot aliasing by returning a detached copy from `prepareReview`.
- Add a closure-based session API with snapshot outputs and an immutable facade.
- Freeze the shared field schema and reject malformed capture arguments and unexpected properties.
- Add ESM type declarations, a credential-free synthetic example, regression and boundary tests, and generated-file consistency checks.
- Add contributor, security, release-planning and integration documentation.
- Add read-only CI without deployment, publication or live-provider usage.

These changes are unreleased until merged and deliberately released. No outside adoption or program eligibility is asserted.
