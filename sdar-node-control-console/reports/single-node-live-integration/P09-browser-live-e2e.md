# Phase P09 Result

## Source Locks

- Console baseline: `52ee82f336ed221dcd85c4921c345898a5b8b29c`
- SDAR live SUT: local integration branch `codex/sdar-smpp-home-lab-integration@816f25f86910a94cba260e9f84e98de92074b75f`
- SMPP live SUT: local integration branch `codex/ha-real-device-preparation@99302cf8d7871b677147c39530701790f8b7a051`
- SDAR and SMPP were consumed from detached read-only worktrees and were not changed or pushed.

## Live Browser Core Journey

The production Console was opened through the temporary loopback same-origin BFF at `http://127.0.0.1:4188` using the application browser.

- Overview displayed the real `home-lab-node`, fixed `LOOPBACK_SERVER_CREDENTIAL` deployment identity and live component health.
- SMPP Source displayed `home-lab-smpp`, active Registry revision 2 and the exact projection checksum.
- MCP Binding displayed the two active and available real bindings: Climate catalog `2.0.0-rc.1:36` and Light catalog `2.0.0-rc.1:31`.
- Capability displayed all six published governed versions, including `home.living-room.read-state@1`.
- Readiness displayed all six Runtime snapshots. At the final browser observation they were fail-closed with `PROVIDER_AVAILABILITY_EXPIRED`; no stale browser snapshot was shown as available.
- A2A Exposure displayed the published public `home-lab-a2a-living-room-read-state@1` exposure.
- Agent Card displayed active revision 10 and nine superseded revisions.
- Task detail displayed completed Task `5fcc984d-dda6-4d26-9f53-f8816dab70a7`, selected composite Skill and its immutable Capability Binding. The binding froze both Provider Bindings, both exact read-only Tools, the two evidence requirements and the binding hash.
- Evidence Export displayed the real disabled configuration, zero pending/dead-letter records and bounded projection/quality issue metadata. The UI did not expose Evidence payload analytics, ClickHouse or Evaluation APIs.

The phase intentionally reused the real writes and concurrency conflict already executed in P03-P08. It did not repeat lifecycle commands merely to create browser churn; every displayed state came from the authoritative GET path.

## UI Gap Repaired

The live Readiness detail exposed one field-mapping defect: structured reason objects rendered as `[object Object]`. Arrays now serialize object entries as bounded JSON, and a focused UI regression test proves the reason code, severity and dependency remain visible without object string coercion.

## Task Control Blocker

The completed Task correctly exposed no legal terminal actions. The frozen pause/resume/cancel mappings remain in the Console, but the locked live SDAR Node Control API still returns HTTP 404 `RESOURCE_NOT_FOUND` for those public command routes. This is the existing `EXT-SDAR-NODE-CONTROL-TASK-CONTROL-001` blocker from P08; P09 does not duplicate or weaken it.

## SSE and Recovery Evidence

- The live SSE connection, durable cursor continuation, `Last-Event-ID` bridge and authoritative refetch behavior remain proven by P05 machine evidence and the unchanged production path.
- Current unit/BFF validation re-ran the duplicate suppression, reconnect cursor and authoritative convergence contracts.
- The repository browser-smoke wrapper could not start its own system executable because `chromium` was absent from PATH. This is not counted as a product or live-browser failure because the application browser completed the real core journey, but it prevents claiming the literal `validate:full` wrapper command as green.

## Tests

- Application browser real core journey: PASS.
- `npm.cmd run validate`: PASS.
  - 94 frozen public operations / 29 schemas
  - 10 test files / 64 tests PASS
  - 10 BFF/config tests PASS
  - TypeScript, architecture, product, build and bundle-secret checks PASS
- `git diff --check`: PASS.
- `npm.cmd run validate:full`: validation portion PASS; browser wrapper blocked by missing `chromium` executable after all product gates passed.

## Implementation Commit

`6a62eb514c365bf6e7ae74c66e835cf9ff569412`

## Status

`BLOCKED_EXTERNAL_SDAR`

The core live browser integration is complete. The Goal remains blocked only by the already-recorded missing SDAR Task control routes; P09 therefore does not emit `LIVE_BROWSER_E2E_PASSED`.
