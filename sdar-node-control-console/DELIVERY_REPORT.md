# SDAR v1.4 Single-Node Console Live Integration Delivery

## Exact source locks

- Console baseline: `52ee82f336ed221dcd85c4921c345898a5b8b29c`
- SDAR: `codex/sdar-smpp-home-lab-integration@816f25f86910a94cba260e9f84e98de92074b75f`
- SMPP: `codex/ha-real-device-preparation@99302cf8d7871b677147c39530701790f8b7a051`
- Delivery branch: `feature/single-node-console-live-integration`

The SDAR/SMPP source repositories were read-only and were never pushed by this Goal.

## Delivered

- Migrated the Console from the stale 85-operation prototype contract to the selected 94-operation / 29-schema Node Control contract.
- Added the thin same-origin BFF with fixed upstream, server-side credential, allowlist, Problem Details, ETag/If-Match, Idempotency-Key, Retry-After and SSE Last-Event-ID behavior.
- Connected all 53 Console routes to authoritative live resources.
- Completed real Node, configuration, LLM, SMPP/MCP, Capability, A2A, Task projection and Evidence v1.4.1 verticals.
- Ran a real A2A single-Task read-only Home Assistant flow through two SMPP Provider Bindings with zero physical writes.
- Completed application-browser inspection of the live Console and repaired structured Readiness reason rendering.
- Proved fail-closed Node Control outage and authoritative recovery through isolated BFF restarts without stopping real SDAR/SMPP/device services.

## Final candidate gates

- Contract: 94 public operations / 29 schemas / exact OpenAPI hash.
- Product: 53 public routes; no direct upstream browser network, browser persistence, Runtime-internal API or project-specific backend.
- Tests: 10 files / 64 tests PASS; BFF/config 10/10 PASS.
- Build and bundle-secret scan: PASS.
- Browser: live P09 core journey PASS; standalone wrapper blocked only by missing system `chromium` executable.
- Security recovery: PASS.

## External blocker

The global result is `BLOCKED_EXTERNAL_SDAR`, not a full release-ready success. Frozen Task pause/resume/cancel operations are mapped in the Console but return HTTP 404 on the selected live SDAR Node Control API. See P08/P09 reports and `p08-live-capability-a2a.json`.

## Rollback

Rollback is the ordinary protected-branch revert of the Console delivery commits. No SDAR/SMPP migration, device state or external deployment was changed by this Console repository delivery.

## Non-goals

- SOCP multi-node organization management
- SDAR/SMPP source changes
- Runtime-internal or database access
- Evidence Analytics/ClickHouse/Evaluation query UI
- merge, tag, release or deployment
