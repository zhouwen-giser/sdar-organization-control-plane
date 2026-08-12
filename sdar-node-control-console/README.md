# SDAR v1.4 Single-Node Control Console

React + TypeScript console integrated with the live SDAR Node Control API through a thin same-origin BFF.

## Live scope

- Node profile and health
- Configuration revisions and convergence
- LLM Provider and model routes
- SMPP Source, MCP candidates and local Provider Bindings
- Skill, Plan Template, Node Capability and Runtime Readiness
- A2A Exposure, Agent Card and Runtime Task projections
- Evidence v1.4.1 export configuration, delivery state and governed recovery
- Management Operations, Audit and Node Events

The browser never receives the Node Control bearer token or a browser-selected upstream URL. Runtime-internal APIs, databases, Evidence Analytics, ClickHouse and Evaluation queries are outside this console.

## Run

```powershell
npm.cmd ci
npm.cmd run build
$env:CONSOLE_GATEWAY_MODE = 'live'
$env:CONSOLE_BFF_HOST = '127.0.0.1'
$env:CONSOLE_BFF_PORT = '4173'
$env:SDAR_NODE_CONTROL_BASE_URL = 'http://127.0.0.1:20080'
$env:SDAR_NODE_CONTROL_BEARER_TOKEN_FILE = '<server-only token file>'
$env:SDAR_NODE_CONTROL_ROLE = 'node_admin'
npm.cmd start
```

Default development mode is still a deterministic local mock when `CONSOLE_GATEWAY_MODE` is absent. It is not accepted as live evidence.

## Quality gates

```powershell
npm.cmd run contract:check
npm.cmd run validate
npm.cmd run test:live-read
npm.cmd run test:live-sse
npm.cmd run test:live-evidence
npm.cmd run test:live-supply
npm.cmd run test:live-capability-a2a
npm.cmd run test:live-recovery
```

The platform currently exposes 94 frozen public operations, 29 schemas and 53 Console routes. See `reports/single-node-live-integration/` for phase evidence and the exact source locks.

## Current blocker

The locked live SDAR Node Control API does not register the frozen Task pause/resume/cancel public routes. Exact Console BFF calls return HTTP 404 `RESOURCE_NOT_FOUND`. The Console mappings are present, but protected review must retain blocker `EXT-SDAR-NODE-CONTROL-TASK-CONTROL-001` until SDAR implements those routes.
