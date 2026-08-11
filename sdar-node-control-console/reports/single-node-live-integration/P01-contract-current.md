# Phase P01 Completion

## Source Locks

- Console baseline: `52ee82f336ed221dcd85c4921c345898a5b8b29c`
- SDAR contract source: `codex/sdar-smpp-home-lab-integration@816f25f86910a94cba260e9f84e98de92074b75f`
- SMPP source reference: `codex/ha-real-device-preparation@99302cf8d7871b677147c39530701790f8b7a051`

## Scope Completed

- Replaced the embedded 76-file Console protocol package with the exact 77-file selected SDAR Node Control protocol tree.
- Regenerated the public operation inventory and TypeScript contract from 94 operations and 29 schemas.
- Classified all 94 public operations in `operation-coverage.csv`.
- Migrated the Console surface from Telemetry Export to Evidence Export.
- Updated the RBAC display model to the current 11-role and Evidence scope matrix.
- Preserved Runtime Control only as authority documentation, not a browser/BFF calling surface.

## Failing Evidence Before Fix

- Baseline `npm.cmd run validate` failed at `contract:check` because generated DTOs were stale.
- The first migrated generation produced an invalid TypeScript interface because the new Evidence metadata schema has a human-readable `title`; the old generator assumed every title was a TypeScript identifier.
- The old generated array type for an enum union would have applied `[]` only to its last member.

## Implementation

- Contract files now match the selected SDAR source tree byte-for-byte: 77 files, zero missing, zero extra and zero SHA mismatch.
- Generator now resolves local `$defs`, root `$ref`, external schema references, constants, intersections and union arrays.
- `EvidenceOperations` is generated from its canonical status `$ref` instead of becoming an empty interface.
- `lastAcknowledgedSequence` and `globalAcknowledgedFrontier` remain decimal strings, including values beyond `Number.MAX_SAFE_INTEGER`.
- Six Telemetry operations are classified as renamed Evidence operations; nine additional Evidence operations are classified as new.
- The Console route, navigation, mock compatibility fixture and labels now use `/evidence-export` and current Evidence operations.

## Tests

- Exact source-tree hash comparison: PASS (`77`, mismatches `0`, extras `0`).
- Operation coverage validation: PASS (`94/94`; 79 unchanged, 6 renamed, 9 new).
- `npm.cmd run validate`: PASS.
  - contract check: 94 operations, 29 schemas, exact OpenAPI SHA
  - typecheck: PASS
  - architecture/product checks: PASS
  - unit/component tests: 4 files, 19 tests PASS
  - production build: PASS

## Contract / Authority Impact

- Node Control OpenAPI is locked to `870a7451b84410fe6979ac2e773dd42ba63e545dfe45899afc493b56010a6fde`.
- Evidence Export is `sdar.evidence/v1`; old Telemetry Export command identifiers no longer compile.
- Runtime Control OpenAPI stays packaged for authority review only and is explicitly excluded from the future browser/BFF surface.
- This phase updates contract correctness only; the factory still uses the mock gateway until P02 provides a production BFF/live gateway path.

## External Findings

No SDAR or SMPP defect was found. The generator incompatibility belonged to the Console and was fixed locally.

## Changed Paths

- `contracts/node-control/v1.0.0/**`
- `scripts/generate-contract.mjs`
- `scripts/generate-operation-coverage.mjs`
- `scripts/check-contract.mjs`
- `scripts/check-product.mjs`
- `src/api/generated/contract.ts`
- Evidence/RBAC-related Console domain, route, page, mock and tests
- `reports/single-node-live-integration/operation-coverage.csv`
- generated contract/architecture/product evidence

## Commits

- implementation: `032c5df44b126d1bf6d593aa68fcbb3aa8bb2e07`
- evidence: `7d0a5f3031cb59da53c76c023931f17f07db15a2`

## Remote Verification

Implementation and evidence commits were pushed to `origin/feature/single-node-console-live-integration`; `git ls-remote` matched local SHA `7d0a5f3031cb59da53c76c023931f17f07db15a2` exactly.

## Remaining Risks

- Live mode, BFF authentication and ETag/header preservation are P02 work.
- Historical browser screenshots and old delivery manifests remain baseline artifacts; P10 will regenerate live browser evidence rather than relabel old mock evidence.

## Status

`CONTRACT_CURRENT`
