# Phase P04 Completion

## Source Locks

- Console baseline: `52ee82f336ed221dcd85c4921c345898a5b8b29c`
- SDAR live SUT: local integration branch `codex/sdar-smpp-home-lab-integration@816f25f86910a94cba260e9f84e98de92074b75f`
- SMPP live SUT: local integration branch `codex/ha-real-device-preparation@99302cf8d7871b677147c39530701790f8b7a051`
- SDAR and SMPP remained read-only.

## Scope Completed

- Added operation-specific live mappings for Configuration create/validate/publish/rollback and Capability Readiness evaluate.
- Added canonical JSON SHA-256 generation for Configuration drafts and stripped page-only fields from the strict frozen request.
- Added resource-level ETag propagation from detail GETs and authoritative ETag acquisition when a displayed ETag is unavailable.
- Preserved `If-Match`, stable `Idempotency-Key`, reason, expected revision and command payload through the browser client and same-origin BFF.
- Added live synchronous resource mapping and asynchronous ManagementOperation receipts.
- Kept HTTP 202 explicitly in `operation` mode; accepted/running is never displayed as applied.
- Left every other command fail-closed with `CONSOLE_LIVE_COMMAND_NOT_MAPPED`; live mode never falls back to Mock behavior.
- Made Create-page idempotency keys stable across retries and constrained Configuration target types to the frozen API enum.

## Real SUT Command Evidence

The machine-readable evidence is `live-command-smoke.json` for run `20260812-core-06`.

- Configuration Draft create: 201 with resource ETag.
- Identical create retry: 201 with the same immutable resource identity, content and checksum.
- Invalid plaintext secret-shaped content: 422 `CONFIGURATION_PLAINTEXT_SECRET_FORBIDDEN`.
- Stale resource ETag: 412 `PRECONDITION_FAILED`.
- Validate: 200 with a new ETag.
- Identical Validate retry: byte-equivalent 200 response.
- Same Validate idempotency key with different reason: 409 `IDEMPOTENCY_KEY_REUSED`.
- Publish: 202 with a stable ManagementOperation identity on identical retry.
- Publish Operation follow-up: authoritative GET returned `running`; the Console did not label it applied or succeeded.
- Capability Readiness evaluate: 202 with terminal `succeeded`, proving terminal Operation rendering without conflating HTTP acceptance with Configuration application.
- Audit query found 3 entries correlated to the Configuration/Operation/reason.

The live run created inert `runtime_policy` probes with unique target identifiers and `new_task_only`; it did not alter SDAR/SMPP source code or device state.

## Controlled Failure Coverage

- Browser/BFF network uncertainty maps to retryable 503 `CONSOLE_BFF_UNAVAILABLE`.
- Frozen Problem Details for 409, 412, 422, 429 and 503 are preserved, including correlation identifiers and retryability.
- `Retry-After` is preserved by both the BFF and browser response metadata.
- Operation records preserve accepted, running, succeeded, failed and canceled statuses without inventing a success transition.

These transport/failure cases use deterministic HTTP fixtures in the Console test suite. The real SUT run above supplies the create/validate/publish, 409, 412, 422, 202, follow-up and audit evidence.

## Upstream Finding

`createConfigurationRevision` returned 500 `NODE_CONTROL_INTERNAL_ERROR` when the same create idempotency key was replayed with a changed target. The equivalent conflicting replay on Validate correctly returned the frozen 409 response. The Console preserved both statuses and did not mask the 500. Because the task package forbids SDAR writes, this finding is recorded rather than patched in the read-only SUT.

## Tests

- `npm.cmd run test:live-command`: PASS.
- `npm.cmd run validate`: PASS.
  - contract check: 94 public operations / 29 schemas / exact OpenAPI SHA
  - TypeScript, architecture and product checks: PASS
  - browser/unit tests: 8 files / 53 tests PASS
  - BFF/config tests: 2 files / 9 tests PASS
  - production build and bundle secret scan: PASS
- `git diff --check`: PASS.

## Authority Impact

- Browser code still has no Node Control bearer or upstream selector.
- All real commands use frozen public Node Control paths through the same-origin BFF.
- No Runtime-internal endpoint or database access was added.
- ETag conflicts and idempotency conflicts remain authoritative backend decisions.

## Implementation Commit

`ecd1b8b0c6143a3e2e855a82366d3d0440cd23b4`

## Remaining Work

- P05 will turn Node Events into reconnectable hints followed by authoritative GET refreshes.
- Additional command families remain intentionally fail-closed until their operation-specific phases.
- The published inert Configuration Operation remains running because no Runtime owns that unique probe target; this is reported as observed state, not a successful apply.

## Status

`LIVE_COMMAND_SEMANTICS_PASSED`
