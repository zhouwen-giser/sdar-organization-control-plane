# Phase P03 Completion

## Source Locks

- Console baseline: `52ee82f336ed221dcd85c4921c345898a5b8b29c`
- SDAR live contract/SUT: local integration branch `codex/sdar-smpp-home-lab-integration@816f25f86910a94cba260e9f84e98de92074b75f`
- SMPP live SUT: local integration branch `codex/ha-real-device-preparation@99302cf8d7871b677147c39530701790f8b7a051`
- The SDAR and SMPP repositories were read-only. Their `origin/main` branches were not used as the integration baseline.

## Scope Completed

- Replaced the live mapping-pending boundary with typed Console records for all P03 collection and detail resources.
- Preserved frozen identifiers, revisions, snapshot versions, ETags, page `asOf` values and authoritative source fields under `__metadata`.
- Added real pagination, 404 handling, 403 preservation and task/capability detail enrichment.
- Added live Node/Profile/Health and Evidence status bootstrap without inventing an Evidence configuration when the optional resource is absent.
- Removed live-mode role switching and synthetic Task Binding / Capability implementation fallbacks.
- Prevented live collection refresh loops when authoritative page `asOf` values advance.
- Made timestamp presentation fail safely instead of crashing a complete resource page on an absent or invalid timestamp.

## Real SUT Evidence

The Console BFF was started on loopback with the server-held Node Control credential and connected to the locked SDAR integration branch. The machine-readable result is `live-read-smoke.json`.

- 20/20 collection or singleton probes matched their frozen response shape.
- 11/11 representative detail probes succeeded.
- Real counts observed through the BFF:
  - SMPP Sources: 1
  - MCP Candidates: 2
  - MCP Bindings: 2
  - Skills: 6
  - Capabilities: 6
  - Capability Readiness snapshots: 6
  - A2A Exposures: 1
  - Agent Card revisions: 9
  - Tasks: 21
  - Management Operations: first page 100
  - Audit Events: first page 100
- Configuration, LLM Provider, Model Route and Plan Template collections were authoritatively empty.
- Evidence Export configuration returned the allowed optional 404; Evidence Export status returned 200 and rendered without mock configuration data.
- Every successful read exposed an ETag. `If-None-Match` returned a stable 200/ETag, which is valid for this implementation.
- Skill cursor pagination returned two consecutive one-item pages with a real continuation token.
- Node Events SSE returned 200, `text/event-stream`, non-cacheable headers and an initial frame.
- Public runtime configuration exposed only live mode and the `node_admin` deployment identity; it did not expose the Node Control bearer or upstream URL.

## Browser Verification

The built Console was exercised in the in-app browser against the same real BFF:

- Capability Readiness rendered 6 authoritative snapshots.
- SMPP Source rendered the single `home-lab-smpp` source.
- MCP Provider Binding rendered both active real bindings.
- Runtime Tasks rendered all 21 real task projections.
- Evidence Export rendered the disabled live status while keeping the missing configuration explicit.
- A real browser-only defect was found: the Task page crashed on an invalid display timestamp. The formatter now renders an em dash for absent or invalid values; the rebuilt Task page rendered all 21 records successfully.
- The temporary browser tab and exact Console BFF process were closed after verification; port 4188 had no remaining listener.

## Tests

- `npm.cmd run test:live-read`: PASS.
- `npm.cmd run validate`: PASS.
  - contract check: 94 public operations / 29 schemas / exact OpenAPI SHA
  - TypeScript, architecture and product checks: PASS
  - browser/unit tests: 7 files / 43 tests PASS
  - BFF/config tests: 2 files / 9 tests PASS
  - production build and bundle secret scan: PASS
- `git diff --check`: PASS.

## Contract / Authority Impact

- All browser traffic remained same-origin through the thin Console BFF.
- The browser never received a Node Control credential or configurable upstream.
- Runtime internal APIs and direct database access were not introduced.
- Node Events remain change hints; P05 will wire hint-driven authoritative refetch.
- No SDAR or SMPP source, configuration, database or process was modified.

## Implementation Commit

`c059302b7c785407ccb4a8041ea35f50b4c77840`

## Evidence Commit and Remote Verification

- Evidence commit: `5a546f4d7b2f3c5b6fa5a01eb7a6ae762e90396b`
- `git ls-remote origin refs/heads/feature/single-node-console-live-integration` matched the evidence commit exactly before phase closure.

## Remaining Work

- P04 will replace command mapping-pending with real mutation semantics, optimistic concurrency and operation follow-up.
- P05 will connect SSE hints to authoritative GET refetch and replay handling.
- Later phases will complete failure-state UX, evidence/recovery views and final browser qualification.

## Status

`LIVE_READ_VERTICAL_PASSED`
