# Phase P08 Result

## Source Locks

- Console baseline: `52ee82f336ed221dcd85c4921c345898a5b8b29c`
- SDAR live SUT: local integration branch `codex/sdar-smpp-home-lab-integration@816f25f86910a94cba260e9f84e98de92074b75f`
- SMPP live SUT: local integration branch `codex/ha-real-device-preparation@99302cf8d7871b677147c39530701790f8b7a051`
- SDAR/SMPP source remained read-only.

## Console Integration

- Added strict live mappings for Capability create/validate/publish/suspend/deprecate/retire, Implementation create, A2A Exposure create/publish/suspend/retire, Agent Card rebuild and Task pause/resume/cancel/Goal Patch.
- Capability and Exposure draft forms now collect frozen schemas, business promises, version and readiness policy and calculate the canonical SHA-256 identity in the browser before the same-origin request.
- Lifecycle commands fetch the current authoritative ETag and preserve reason, Idempotency-Key, If-Match, ManagementOperation and Problem Details semantics.
- No Runtime-internal route, database, device endpoint or browser credential was added.

## Real Core Vertical

Machine evidence: `p08-live-capability-a2a.json`.

- Refreshed both real Runtime catalogs and real SMPP-backed Bindings, then evaluated all six governed Capability versions. After the unchanged ten-second stability window, all six were available with one available implementation and no blocking reason.
- Executed the exact single-Task request `查询客厅主灯和空调当前状态` through the real A2A endpoint.
- The Task completed through simulated local structured-model semantics and real SDAR Runtime, two real read-only MCP calls, SMPP and Home Assistant observation. Physical writes and write operations were zero.
- Console BFF queried the completed Task, exact Exposure version, immutable Task Capability Binding and active Agent Card revision 10.
- The Binding froze `home.living-room.read-state@1`, `home-lab-a2a-living-room-read-state@1` and a valid 64-character binding hash.
- A controlled non-allowlisted requester returned `TASK_STATE_FAILED` before a Node Control Task/Binding projection was expected.
- The authoritative A2A run rebuilt and activated Agent Card revision 10. A redundant later rebuild probe returned `AGENT_CARD_SCHEMA_INVALID` and was not counted as a successful command.

## External SDAR Blocker

`EXT-SDAR-NODE-CONTROL-TASK-CONTROL-001`

The frozen Node Control contract declares:

- `POST /api/v1/tasks/{taskId}/pause`
- `POST /api/v1/tasks/{taskId}/resume`
- `POST /api/v1/tasks/{taskId}/cancel`

The locked live SDAR Node Control API implements Task list/detail/binding reads but does not register those three public command routes. Exact BFF requests against the completed real A2A Task returned HTTP 404 `RESOURCE_NOT_FOUND` for all three operations. The machine report records each redacted request and response SHA-256. Console mapping is complete; the owner is `skill-driven-agent-runtime`, which this Goal must not modify.

Because pause/resume/cancel are frozen P08 acceptance items, the phase cannot claim `CAPABILITY_A2A_TASK_VERTICAL_PASSED`.

## Tests

- Real A2A acceptance driver: PASS.
- `npm.cmd run test:live-capability-a2a`: core vertical PASS and external blocker reproduced.
- `npm.cmd run validate`: PASS.
  - 94 frozen public operations / 29 schemas
  - 10 test files / 63 tests PASS
  - 10 BFF/config tests PASS
  - TypeScript, architecture, product, build and bundle-secret gates PASS
- `git diff --check`: PASS.

## Implementation Commit

`8cbf75ed990d5f23fa50af83eda1d136439b41eb`

## Status

`BLOCKED_EXTERNAL_SDAR`
