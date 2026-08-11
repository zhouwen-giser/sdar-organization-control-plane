# Phase P02 Completion

## Source Locks

- Console baseline: `52ee82f336ed221dcd85c4921c345898a5b8b29c`
- SDAR live contract/SUT: local integration branch `codex/sdar-smpp-home-lab-integration@816f25f86910a94cba260e9f84e98de92074b75f`
- SMPP live SUT: local integration branch `codex/ha-real-device-preparation@99302cf8d7871b677147c39530701790f8b7a051`
- SDAR/SMPP `origin/main` SHAs remain reference metadata only and were not used as the implementation baseline.

## Scope Completed

- Added the production same-origin Console BFF and static build server.
- Added strict environment validation for `mock|live`, loopback-safe defaults, fixed Node Control upstream and server-only bearer sources.
- Added a 94-operation public contract allowlist; Runtime-internal and unknown routes are rejected before any upstream request.
- Added the browser `NodeControlHttpClient` and `HttpNodeControlGateway` factory path.
- Ensured live mode does not instantiate `MockNodeControlGateway`.
- Preserved ETag, If-Match, If-None-Match, Idempotency-Key, Retry-After, Last-Event-ID and request/correlation identifiers.
- Added Problem Details mapping, pagination metadata and unbuffered SSE proxying.
- Replaced the simulated role selector in live mode with the fixed `Active Deployment Identity` supplied by the server runtime config.
- Added production build startup and browser-bundle secret scanning gates.

## Failing Evidence Before Fix

- The first full validation run discovered that Vitest's default file glob also collected the new Node `node:test` BFF suites. All 24 browser tests passed, while the two Node suites were reported as `No test suite found` by Vitest.
- `vitest.config.ts` now explicitly limits browser tests to `src/**/*.test.{ts,tsx}`; BFF suites run through the separate `node --test` gate.
- The first startup ownership check used `Get-NetTCPConnection`, which is permission-restricted in this Windows environment. The final smoke uses `netstat -ano`, verifies the exact spawned PID and confirms the listener is removed during cleanup.

## Implementation

- Browser requests are fixed to `/bff/node-control`; callers cannot choose a hostname or upstream URL.
- BFF authorization always comes from the server credential. Browser-supplied `Authorization` is neither forwarded nor returned.
- Upstream redirects are not followed.
- Live resource mapping is deliberately fail-closed with `CONSOLE_LIVE_RESOURCE_MAPPING_PENDING` until P03 maps the frozen business operations; no mock snapshot is presented as live authority.
- Mock mode remains the default for local UI development and existing component tests.

## Tests

- `npm.cmd run validate`: PASS.
  - contract check: 94 public operations / 29 schemas / exact OpenAPI SHA
  - TypeScript and architecture/product checks: PASS
  - browser/unit tests: 5 files / 24 tests PASS
  - BFF/config tests: 2 files / 9 tests PASS
  - production build: PASS
  - bundle secret scan: 3 build files, configured token probe checked, zero violations
- Production startup smoke: PASS.
  - exact spawned PID owned `127.0.0.1:4187`
  - `/health/live` returned `ok`
  - `/console-config` returned `mock`
  - built `/` returned HTTP 200 with injected runtime config
  - exact spawned process was stopped and port 4187 had no remaining listener

## Contract / Authority Impact

- The browser has no Node Control credential and no configurable upstream.
- The BFF calls only paths and methods in the selected SDAR frozen public operation inventory.
- Runtime Control remains outside the Console/BFF surface.
- ETag and idempotency metadata survive the complete browser-to-BFF-to-Node-Control transport path.
- Node Events are transported as SSE hints; authoritative event-driven refetch is P08 work.

## External Findings

No SDAR or SMPP product defect was found in P02. The two repositories remained read-only.

## Changed Paths

- `server/**`
- `src/gateways/HttpNodeControlGateway.ts`
- `src/gateways/factory.ts`
- `src/runtime-config.ts`
- live identity state/UI and tests
- `scripts/check-architecture.mjs`
- `scripts/check-bundle-secrets.mjs`
- `package.json`
- `vitest.config.ts`
- P02 generated gate evidence

## Commits

- implementation: `347cad295c5691e07637ad40ab55ff789d86fc16`

## Remaining Risks

- P03 must replace the live mapping-pending boundary with typed read mappers for the frozen Node Control resources.
- P04-P08 must add live commands, polling/retry behavior and authoritative SSE refetch.
- No claim is made yet that the existing business pages are live-data complete.

## Status

`LIVE_TRANSPORT_READY`
