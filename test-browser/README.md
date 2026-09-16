# Offline browser checks

These are real Chromium UI tests with synthetic local inputs, not live provider, microphone, full accessibility, or Codex Security scans.

```sh
python3 -m venv .venv-browser
.venv-browser/bin/pip install playwright==1.61.0
.venv-browser/bin/python -m playwright install chromium
node scripts/build-static-demo.mjs
.venv-browser/bin/python -m unittest discover -s test-browser -v
```

Node.js 22/24 must be on PATH. The harness starts the real loopback-only Node server with an explicit empty provider key and throwing upstream stub, plus a temporary static server over `docs/`. The static server is test-only and is not production hosting. No browser request to `/api/token`, external HTTP, WebSockets or microphone is permitted. Tests use isolated browser contexts and temporary downloads.

The eight tests check approval/download, correction invalidation, removal of hidden review text, clearing unsubmitted inputs, synthetic canvas/blob view cleanup, literal rendering of markup, reload isolation and a mobile-sized keyless static sample. The canvas/blob fixture is not a real recording or a test of audio quality.

CI additionally runs three reset assertions against the prior app and requires exactly three assertion failures with zero environment errors or skipped tests before restoring the patched app. Read those deliberately failing baseline results separately from the final suite. `BROWSER_EXECUTABLE` may select an already installed Chromium for local development; do not bypass browser policies when a managed environment blocks localhost. The initial assistant-side browser attempt was blocked before navigation and is not a passing or failing application test.
