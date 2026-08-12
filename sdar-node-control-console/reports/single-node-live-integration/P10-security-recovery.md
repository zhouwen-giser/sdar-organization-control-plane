# Phase P10 Completion

## Source Locks

- Console baseline: `52ee82f336ed221dcd85c4921c345898a5b8b29c`
- SDAR live SUT: local integration branch `codex/sdar-smpp-home-lab-integration@816f25f86910a94cba260e9f84e98de92074b75f`
- SMPP live SUT: local integration branch `codex/ha-real-device-preparation@99302cf8d7871b677147c39530701790f8b7a051`
- SDAR/SMPP remained read-only.

## Security Boundary

- The browser receives only same-origin `/bff/node-control/**` responses and deployment identity.
- The Node Control bearer token is read only by the server from a temporary server-side token file; the file and its value never appear in the public configuration, evidence report or production bundle.
- The BFF uses a fixed deployment upstream, validates the public operation allowlist, rejects redirect following, forwards only bounded request/response headers and enforces a 1 MiB request-body maximum.
- Non-loopback binding remains fail-closed unless the explicit non-production acknowledgement is set.
- Malformed cursor, non-contract route, 401/403 identity, 429 with Retry-After, 503 Problem Details, stale If-Match and idempotency behavior remain covered by the BFF and command tests.
- Bundle scan and changed-report scan found no configured token, Authorization value, credential URL or local token-file path.

## Real Fault and Recovery

Machine evidence: `p10-live-recovery-smoke.json`.

An isolated Console BFF was started on loopback port 4190; the real SDAR, SMPP and device processes were not stopped.

1. With the fixed upstream set to an unreachable loopback port, the BFF returned HTTP 502 `CONSOLE_PROXY_UPSTREAM_FAILED`.
2. The isolated BFF was stopped and restarted against the real Node Control API.
3. An authoritative `GET /api/v1/node` returned HTTP 200.
4. The BFF was stopped and started a second time, then repeated the authoritative GET.
5. Both recovered reads identified the same Node using only a SHA-256 identity in evidence.
6. The test removed the temporary token file and released port 4190.

The recovery never reused a browser Mock snapshot, changed a device write gate or stopped a real SDAR/SMPP service.

## Other Fault Contracts

- SSE reconnect and Last-Event-ID convergence: P05 live evidence plus current unit/BFF tests.
- Runtime degraded / 503 and 429 Retry-After: current BFF tests preserve the exact Problem Details/status/headers.
- SMPP/MCP unavailable: live P09 Readiness remained fail-closed with Provider availability reasons; no stale available state was synthesized.
- Evidence receiver unavailable: the Console exposes the real bounded status/issues/dead-letter and recovery controls but does not proxy Evidence analytics.
- Async command failure and stale ETag: P04 real command evidence and current command mapping tests preserve ManagementOperation, If-Match and Problem Details behavior.

## Tests

- `npm.cmd run test:live-recovery`: PASS.
- `npm.cmd run validate`: PASS.
  - 94 public operations / 29 schemas
  - 10 test files / 64 tests PASS
  - 10 BFF/config tests PASS
  - TypeScript, architecture, product, build and bundle-secret gates PASS
- `git diff --check`: PASS.

## Implementation Commit

`46e5b41311fdbf55a4814fc704efb27df4202ca1`

## Status

`SECURITY_RECOVERY_PASSED`

The global Goal remains `BLOCKED_EXTERNAL_SDAR` because P08 Task pause/resume/cancel routes are still absent from the locked live SDAR Node Control API.
