# Phase P00 Completion

## Source Locks

- Console: `zhouwen-giser/sdar-organization-control-plane` `feature/single-node-console-live-integration` from `52ee82f336ed221dcd85c4921c345898a5b8b29c`
- SDAR: read-only local integration branch `codex/sdar-smpp-home-lab-integration` at `816f25f86910a94cba260e9f84e98de92074b75f`
- SMPP: read-only local integration branch `codex/ha-real-device-preparation` at `99302cf8d7871b677147c39530701790f8b7a051`
- `origin/main` reference SHAs are recorded in `source-lock.json` but are not the active SDAR/SMPP SUT baselines, per user direction.

## Scope Completed

- Validated the supplied task package: `TASK_PACKAGE_OK`, 12 phases, Console-only implementation scope.
- Fetched all three repositories and created detached read-only source worktrees for the selected SDAR/SMPP branch heads.
- Installed the unchanged Console dependency lock with `npm.cmd ci`.
- Ran the unchanged Console validation baseline.
- Captured exact Git and contract artifact hashes.
- Compared the embedded Console contract with the selected SDAR Node Control contract.
- Created the machine-readable Source Lock, Contract Diff and Goal State.

## Failing Evidence Before Fix

`npm.cmd run validate` exits `1` at the first gate:

```text
> npm run contract:check
> node scripts/check-contract.mjs

Generated contract DTO is stale. Run npm run contract:generate and commit the result.
```

This is the expected unfixed P00 baseline. P00 does not regenerate or migrate the contract.

## Implementation

No product implementation was changed in P00. Only baseline evidence and Goal State were added.

## Tests

- Task package validator: PASS (`TASK_PACKAGE_OK`).
- `npm.cmd ci`: PASS against the committed lock file.
- `npm.cmd run validate`: expected FAIL at `contract:check`; later gates did not run.
- Source-lock SHA/hash extraction: PASS.
- Operation inventory comparison: PASS, old `85`, selected current `94`.

## Contract / Authority Impact

- The Console embeds Telemetry Export 1.0.0 while the selected SDAR contract exposes Evidence Export `sdar.evidence/v1`.
- Fifteen Evidence operations are added and six Telemetry operations are removed; six are semantic replacements and nine are additional Evidence operations.
- Console `lastAcknowledgedSequence` is a JavaScript number; the selected Evidence schema requires an arbitrary-size decimal string.
- The existing gateway drops ETag metadata and must be replaced by a typed live gateway/BFF contract.
- Node Events remain local simulation; later phases must connect a real SSE hint stream and refetch authoritative GET resources.

## External Findings

- SDAR and SMPP are source/SUT repositories only for this goal; no tracked files were changed there.
- The SMPP primary worktree had pre-existing unstaged HA preflight report changes; they were preserved and not used as implementation output.
- No external product defect blocks P00.

## Changed Paths

- `reports/single-node-live-integration/source-lock.json`
- `reports/single-node-live-integration/contract-diff.json`
- `reports/single-node-live-integration/goal-state.json`
- `reports/single-node-live-integration/P00-baseline.md`

## Commits

- implementation: not applicable for baseline-only P00
- evidence: pending this phase commit

## Remote Verification

Pending phase commit, push and local/remote SHA equality verification.

## Remaining Risks

- Console product validation remains red until P01 synchronizes the exact selected SDAR contract and regenerates the typed DTO.
- Real BFF, authentication, live SSE and browser integration are intentionally not implemented in P00.

## Status

`P00_COMPLETE`
