# Contract Capability Matrix

Every public operation in the frozen operation inventory is visible in the traceability view and mapped to a product domain. Commands use Reason, Idempotency Key and revision precondition semantics in the local validation Gateway.

| Operation ID | Method | Path | Tag | Kind | Console route(s) |
|---|---|---|---|---|---|
| `getSdarNodeDeclaration` | GET | `/.well-known/sdar-node` | Discovery | query | /overview |
| `getNodeControlLiveness` | GET | `/health/live` | Discovery | query | /overview |
| `getNodeControlReadiness` | GET | `/health/ready` | Discovery | query | /overview |
| `getNodeProfile` | GET | `/api/v1/node` | Node | query | /node |
| `updateNodeProfileDraft` | PUT | `/api/v1/node/draft` | Node | command | /node |
| `validateNodeProfileDraft` | POST | `/api/v1/node/draft/validate` | Node | command | /node |
| `publishNodeProfileDraft` | POST | `/api/v1/node/draft/publish` | Node | command | /node |
| `getNodeHealth` | GET | `/api/v1/node/health` | Node | query | /node |
| `listConfigurationRevisions` | GET | `/api/v1/configuration-revisions` | Configuration | query | /configuration |
| `createConfigurationRevision` | POST | `/api/v1/configuration-revisions` | Configuration | command | /configuration |
| `getConfigurationRevision` | GET | `/api/v1/configuration-revisions/{configurationId}/{revision}` | Configuration | query | /configuration |
| `validateConfigurationRevision` | POST | `/api/v1/configuration-revisions/{configurationId}/{revision}/validate` | Configuration | command | /configuration |
| `publishConfigurationRevision` | POST | `/api/v1/configuration-revisions/{configurationId}/{revision}/publish` | Configuration | command | /configuration |
| `rollbackConfigurationRevision` | POST | `/api/v1/configuration-revisions/{configurationId}/{revision}/rollback` | Configuration | command | /configuration |
| `listLlmProviders` | GET | `/api/v1/llm-providers` | LLM | query | /llm/providers · /llm/routes |
| `createLlmProviderDraft` | POST | `/api/v1/llm-providers` | LLM | command | /llm/providers · /llm/routes |
| `getLlmProvider` | GET | `/api/v1/llm-providers/{providerId}` | LLM | query | /llm/providers · /llm/routes |
| `validateLlmProvider` | POST | `/api/v1/llm-providers/{providerId}/validate` | LLM | command | /llm/providers · /llm/routes |
| `listModelRoutes` | GET | `/api/v1/model-routes` | LLM | query | /llm/providers · /llm/routes |
| `createModelRouteDraft` | POST | `/api/v1/model-routes` | LLM | command | /llm/providers · /llm/routes |
| `getModelRoute` | GET | `/api/v1/model-routes/{routeId}` | LLM | query | /llm/providers · /llm/routes |
| `listSmppSources` | GET | `/api/v1/smpp-sources` | SMPP | query | /smpp/sources |
| `createSmppSourceDraft` | POST | `/api/v1/smpp-sources` | SMPP | command | /smpp/sources |
| `getSmppSource` | GET | `/api/v1/smpp-sources/{smppSourceId}` | SMPP | query | /smpp/sources |
| `syncSmppSource` | POST | `/api/v1/smpp-sources/{smppSourceId}/sync` | SMPP | command | /smpp/sources |
| `listMcpProviderCandidates` | GET | `/api/v1/mcp-provider-candidates` | MCP | query | /mcp/candidates · /mcp/bindings |
| `listMcpProviderBindings` | GET | `/api/v1/mcp-provider-bindings` | MCP | query | /mcp/candidates · /mcp/bindings |
| `importMcpProviderBinding` | POST | `/api/v1/mcp-provider-bindings` | MCP | command | /mcp/candidates · /mcp/bindings |
| `getMcpProviderBinding` | GET | `/api/v1/mcp-provider-bindings/{bindingId}` | MCP | query | /mcp/candidates · /mcp/bindings |
| `refreshMcpProviderBinding` | POST | `/api/v1/mcp-provider-bindings/{bindingId}/refresh` | MCP | command | /mcp/candidates · /mcp/bindings |
| `suspendMcpProviderBinding` | POST | `/api/v1/mcp-provider-bindings/{bindingId}/suspend` | MCP | command | /mcp/candidates · /mcp/bindings |
| `removeMcpProviderBinding` | POST | `/api/v1/mcp-provider-bindings/{bindingId}/remove` | MCP | command | /mcp/candidates · /mcp/bindings |
| `listSkills` | GET | `/api/v1/skills` | Skills | query | /skills |
| `importSkillPackage` | POST | `/api/v1/skills/import` | Skills | command | /skills |
| `listSkillVersions` | GET | `/api/v1/skills/{skillId}/versions` | Skills | query | /skills |
| `getSkillVersion` | GET | `/api/v1/skills/{skillId}/versions/{version}` | Skills | query | /skills |
| `publishSkillVersion` | POST | `/api/v1/skills/{skillId}/versions/{version}/publish` | Skills | command | /skills |
| `suspendSkillVersion` | POST | `/api/v1/skills/{skillId}/versions/{version}/suspend` | Skills | command | /skills |
| `deprecateSkillVersion` | POST | `/api/v1/skills/{skillId}/versions/{version}/deprecate` | Skills | command | /skills |
| `listPlanTemplates` | GET | `/api/v1/plan-templates` | PlanTemplates | query | /plans |
| `listPlanTemplateVersions` | GET | `/api/v1/plan-templates/{artifactId}/versions` | PlanTemplates | query | /plans |
| `getPlanTemplateVersion` | GET | `/api/v1/plan-templates/{artifactId}/versions/{version}` | PlanTemplates | query | /plans |
| `publishPlanTemplateVersion` | POST | `/api/v1/plan-templates/{artifactId}/versions/{version}/publish` | PlanTemplates | command | /plans |
| `revalidatePlanTemplateVersion` | POST | `/api/v1/plan-templates/{artifactId}/versions/{version}/revalidate` | PlanTemplates | command | /plans |
| `suspendPlanTemplateVersion` | POST | `/api/v1/plan-templates/{artifactId}/versions/{version}/suspend` | PlanTemplates | command | /plans |
| `listNodeCapabilities` | GET | `/api/v1/node-capabilities` | Capabilities | query | /capabilities · /readiness |
| `createNodeCapabilityDraft` | POST | `/api/v1/node-capabilities` | Capabilities | command | /capabilities · /readiness |
| `getNodeCapabilityVersion` | GET | `/api/v1/node-capabilities/{capabilityId}/versions/{version}` | Capabilities | query | /capabilities · /readiness |
| `validateNodeCapabilityVersion` | POST | `/api/v1/node-capabilities/{capabilityId}/versions/{version}/validate` | Capabilities | command | /capabilities · /readiness |
| `publishNodeCapabilityVersion` | POST | `/api/v1/node-capabilities/{capabilityId}/versions/{version}/publish` | Capabilities | command | /capabilities · /readiness |
| `suspendNodeCapabilityVersion` | POST | `/api/v1/node-capabilities/{capabilityId}/versions/{version}/suspend` | Capabilities | command | /capabilities · /readiness |
| `deprecateNodeCapabilityVersion` | POST | `/api/v1/node-capabilities/{capabilityId}/versions/{version}/deprecate` | Capabilities | command | /capabilities · /readiness |
| `retireNodeCapabilityVersion` | POST | `/api/v1/node-capabilities/{capabilityId}/versions/{version}/retire` | Capabilities | command | /capabilities · /readiness |
| `listCapabilityImplementations` | GET | `/api/v1/node-capabilities/{capabilityId}/versions/{version}/implementations` | Capabilities | query | /capabilities · /readiness |
| `createCapabilityImplementation` | POST | `/api/v1/node-capabilities/{capabilityId}/versions/{version}/implementations` | Capabilities | command | /capabilities · /readiness |
| `listCapabilityReadiness` | GET | `/api/v1/capability-readiness` | Capabilities | query | /capabilities · /readiness |
| `getCapabilityReadiness` | GET | `/api/v1/capability-readiness/{capabilityId}/{version}` | Capabilities | query | /capabilities · /readiness |
| `evaluateCapabilityReadiness` | POST | `/api/v1/capability-readiness/{capabilityId}/{version}/evaluate` | Capabilities | command | /capabilities · /readiness |
| `listA2aExposures` | GET | `/api/v1/a2a-exposures` | A2A | query | /a2a/exposures · /a2a/agent-card |
| `createA2aExposureDraft` | POST | `/api/v1/a2a-exposures` | A2A | command | /a2a/exposures · /a2a/agent-card |
| `getA2aExposureVersion` | GET | `/api/v1/a2a-exposures/{exposureId}/versions/{version}` | A2A | query | /a2a/exposures · /a2a/agent-card |
| `publishA2aExposureVersion` | POST | `/api/v1/a2a-exposures/{exposureId}/versions/{version}/publish` | A2A | command | /a2a/exposures · /a2a/agent-card |
| `suspendA2aExposureVersion` | POST | `/api/v1/a2a-exposures/{exposureId}/versions/{version}/suspend` | A2A | command | /a2a/exposures · /a2a/agent-card |
| `retireA2aExposureVersion` | POST | `/api/v1/a2a-exposures/{exposureId}/versions/{version}/retire` | A2A | command | /a2a/exposures · /a2a/agent-card |
| `listAgentCardRevisions` | GET | `/api/v1/a2a-agent-card-revisions` | A2A | query | /a2a/exposures · /a2a/agent-card |
| `getAgentCardRevision` | GET | `/api/v1/a2a-agent-card-revisions/{revision}` | A2A | query | /a2a/exposures · /a2a/agent-card |
| `rebuildAgentCardRevision` | POST | `/api/v1/a2a-agent-card-revisions/rebuild` | A2A | command | /a2a/exposures · /a2a/agent-card |
| `listOperationalTasks` | GET | `/api/v1/tasks` | Tasks | query | /tasks |
| `getOperationalTask` | GET | `/api/v1/tasks/{taskId}` | Tasks | query | /tasks |
| `getTaskCapabilityBinding` | GET | `/api/v1/tasks/{taskId}/capability-binding` | Tasks | query | /tasks |
| `pauseTask` | POST | `/api/v1/tasks/{taskId}/pause` | Tasks | command | /tasks |
| `resumeTask` | POST | `/api/v1/tasks/{taskId}/resume` | Tasks | command | /tasks |
| `cancelTask` | POST | `/api/v1/tasks/{taskId}/cancel` | Tasks | command | /tasks |
| `submitTaskGoalPatch` | POST | `/api/v1/tasks/{taskId}/goal-patches` | Tasks | command | /tasks |
| `getTelemetryExportConfiguration` | GET | `/api/v1/telemetry-export` | TelemetryExport | query | /telemetry-export |
| `createTelemetryExportRevision` | POST | `/api/v1/telemetry-export/revisions` | TelemetryExport | command | /telemetry-export |
| `validateTelemetryExportRevision` | POST | `/api/v1/telemetry-export/revisions/{revision}/validate` | TelemetryExport | command | /telemetry-export |
| `publishTelemetryExportRevision` | POST | `/api/v1/telemetry-export/revisions/{revision}/publish` | TelemetryExport | command | /telemetry-export |
| `getTelemetryExportStatus` | GET | `/api/v1/telemetry-export/status` | TelemetryExport | query | /telemetry-export |
| `testTelemetryExportConnection` | POST | `/api/v1/telemetry-export/test` | TelemetryExport | command | /telemetry-export |
| `listManagementOperations` | GET | `/api/v1/management-operations` | Operations | query | /operations |
| `getManagementOperation` | GET | `/api/v1/management-operations/{operationId}` | Operations | query | /operations |
| `cancelManagementOperation` | POST | `/api/v1/management-operations/{operationId}/cancel` | Operations | command | /operations |
| `listAuditEvents` | GET | `/api/v1/audit-events` | Audit | query | /audit |
| `subscribeNodeEvents` | GET | `/api/v1/events` | Events | query | /events |
