# Contract Mapping Report

- Selected SDAR source: `codex/sdar-smpp-home-lab-integration@816f25f86910a94cba260e9f84e98de92074b75f`
- Public Node Control Operation Inventory: 94/94 classified
- Total operation IDs validated by the frozen package, including internal Runtime Control: 131
- JSON Schemas: 29/29 generated
- RBAC roles: 11
- Node Control OpenAPI SHA-256: `870a7451b84410fe6979ac2e773dd42ba63e545dfe45899afc493b56010a6fde`
- Runtime Control OpenAPI SHA-256: `d9f250a8f057eab5d9d5dc77088faf0fc525835804f8f3ad8fdb7fca18e66aba`
- Operation classification: 79 unchanged, 6 renamed from Telemetry Export, 9 new Evidence operations

The browser/BFF must not call Runtime Control operations. Their presence is retained only as frozen authority-boundary documentation. Exact per-operation disposition is recorded in `reports/single-node-live-integration/operation-coverage.csv`.
