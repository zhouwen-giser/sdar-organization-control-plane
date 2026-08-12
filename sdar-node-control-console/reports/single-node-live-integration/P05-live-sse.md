# Phase P05 Completion

## Source Locks

- Console baseline: `52ee82f336ed221dcd85c4921c345898a5b8b29c`
- SDAR live SUT: local integration branch `codex/sdar-smpp-home-lab-integration@816f25f86910a94cba260e9f84e98de92074b75f`
- SMPP live SUT: local integration branch `codex/ha-real-device-preparation@99302cf8d7871b677147c39530701790f8b7a051`
- `origin/main` was only a Console ancestry reference; SDAR and SMPP stayed read-only.

## Scope Completed

- Replaced the Events page simulation with the real same-origin `/bff/node-control/api/v1/events` EventSource.
- Retained the last non-sensitive Event ID in process memory only and reconnects with a bounded cursor query.
- Added a BFF cursor bridge that validates the browser query, removes it from the upstream URL and sends it as `Last-Event-ID`.
- Added duplicate Event ID suppression and bounded reconnect backoff.
- Added frozen Node Event parsing for the 20 public event types.
- Stores the event itself only in the event timeline; it never treats `payload` as resource state.
- Maps event types to authoritative public GETs and batches hint-driven refetches.
- Shows the real stream connection state and cursor in the Console.
- Keeps upstream URL and bearer authority on the BFF only.

## Real SUT Evidence

Machine-readable evidence: `p05-live-sse-smoke.json`.

- Initial SSE request: HTTP 200 with `text/event-stream`.
- BFF response: `Cache-Control: no-cache, no-store` and `X-Accel-Buffering: no`.
- Initial read received two durable Node Event envelopes.
- A separate EventSource connection resumed after the first event cursor and returned the exact next event.
- The resumed real event was `node.health.changed` for aggregate type `node_health_observation`, revision 1.
- The event triggered an authoritative GET of `/api/v1/node/health`, which returned HTTP 200.
- Event and cursor identities are recorded only as SHA-256 values in machine evidence.
- No SDAR/SMPP source, database, Runtime-internal API or device state was modified.

## Browser Evidence

The production build was opened at `http://127.0.0.1:4188/#/events` through the temporary loopback BFF.

- Page displayed `SSE 已连接` and a live in-memory cursor.
- Page displayed 23 real Node Event hints from the selected SDAR local integration baseline.
- Entries included `node.profile.changed`, `node.health.changed`, `node.smpp.source_changed` and `node.management_operation.completed`.
- Each entry stated that an authoritative GET was scheduled.
- The page exposed deployment identity only; it did not expose the upstream base URL or bearer token.

## Failure and Recovery Coverage

- Duplicate frames are ignored without a second resource refetch.
- Malformed or event-ID/type-mismatched frames are ignored.
- Disconnect closes the old EventSource and reconnects with the exact in-memory cursor.
- The BFF accepts native `Last-Event-ID` and browser cursor-query forms, but forwards only the upstream header.
- Invalid, empty, overlong or control-character cursors fail closed with Problem Details.
- Independent reconnect requests prove durable cursor continuation; full resource state is recovered through public GET, not event replay payloads.
- The BFF is stateless across process lifecycle. Node Control persistence/restart behavior remains authoritative to its durable `listAfter` contract and was not altered in this Console phase.

## Tests

- `npm.cmd run test:live-sse`: PASS against the real Node Control SUT.
- Browser live Events page: PASS.
- `npm.cmd run validate`: PASS.
  - contract check: 94 public operations / 29 schemas / exact OpenAPI SHA
  - TypeScript, architecture and product checks: PASS
  - browser/unit tests: 10 files / 58 tests PASS
  - BFF/config tests: 2 files / 10 tests PASS
  - production build and bundle secret scan: PASS
- `git diff --check`: PASS.

## Authority Impact

- Events remain hints; authoritative GET results are the only resource state written to Console collections.
- No browser persistence was introduced.
- No browser-selected upstream or credential path was introduced.
- The implementation uses only the frozen public Node Control contract.

## Implementation Commit

`efb3611950049ac79f25d0998ae5f377c91a3f45`

## Evidence Commit and Remote Verification

- Evidence commit: `3850e78897b5e024333eb17382b50ca386f6efe4`
- The remote feature branch matched this evidence commit exactly before phase closure.

## Remaining Work

- P06 begins resource-specific Configuration workflows on top of the now-live read, command and event transport.
- Command families outside their assigned phases remain fail-closed.

## Status

`LIVE_SSE_PASSED`
