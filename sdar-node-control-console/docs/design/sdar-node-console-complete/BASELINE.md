# Baseline Audit

## Inputs

- Frontend baseline: `sdar-runtime-console-prototype.zip`
- Frozen protocol: `SDAR_v1.4_Node_Control_Backend_接口协议冻结基线_V1.0.zip`
- Contract version: `1.0.0`
- Contract status: `PROTOCOL_DESIGN_FROZEN_IMPLEMENTATION_PENDING`
- Node Control OpenAPI SHA-256: `d4693a3c38ac0449e63804804fcdcea93c8fbf154fa1e7959806afc1c7652394`
- Runtime Control OpenAPI SHA-256: `09796b7cdc9e05c0ec990485d23e1045c679e7d87c662db6bf7618ca32a91177`

## Baseline findings

The supplied prototype contained eight primary review screens and historical placeholder routes. It was a static artifact-governance prototype rather than a complete single-node control console. The rebuild retains the visual language but replaces the information architecture, route inventory, state model, data contract and command semantics.

## Reconstruction result

- 53 unique public routes
- 85 public Node Control operations traced
- 28 JSON Schemas generated into TypeScript
- 7 RBAC roles represented
- No direct Runtime internal API, telemetry query, browser persistence, real authentication or backend service
