/* Generated from SDAR v1.4 Node Control Backend frozen contract. Do not edit. */
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export interface JsonObject { [key: string]: JsonValue | undefined; }

export interface A2AExposureVersion {
  "exposureId": string;
  "version": number;
  "capabilityId": string;
  "capabilityVersion": number;
  "agentSkillId": string;
  "name": string;
  "description": string;
  "tags"?: string[];
  "examples"?: string[];
  "inputModes"?: string[];
  "outputModes"?: string[];
  "requestSchema": Record<string, unknown>;
  "resultSchema": Record<string, unknown>;
  "visibility": "organization" | "public";
  "requesterPolicy"?: Record<string, unknown>;
  "readinessPublicationPolicy"?: "publish_when_available" | "publish_degraded" | "always_publish_with_status";
  "status": "draft" | "published" | "suspended" | "retired";
  "exposureHash": string;
}

export interface AgentCardRevision {
  "revision": number;
  "nodeId": string;
  "exposureRefs"?: string[];
  "contentHash": string;
  "capabilityCatalogHash": string;
  "status": "candidate" | "staged" | "active" | "rejected" | "superseded";
  "generatedAt": string;
  "activatedAt"?: string;
  "rejectionCode"?: string;
}

export interface CapabilityImplementationBinding {
  "bindingId": string;
  "capabilityId": string;
  "capabilityVersion": number;
  "implementationType": "skill" | "plan_template";
  "implementationId": string;
  "implementationVersion": string;
  "role": "primary" | "alternative" | "supporting" | "validation" | "recovery";
  "priority": number;
  "activationCondition"?: unknown;
  "providerPolicyOverride"?: unknown;
  "status": "draft" | "active" | "suspended" | "retired";
  "revision": number;
}

export interface CapabilityReadiness {
  "capabilityId": string;
  "capabilityVersion": number;
  "snapshotVersion": number;
  "status": "available" | "degraded" | "unavailable" | "suspended";
  "evaluatedAt": string;
  "validUntil": string;
  "catalogHash"?: string;
  "policyHash"?: string;
  "reasons": ({ "code": string; "severity"?: "info" | "warning" | "blocking"; "detail"?: string; "dependencyRef"?: string })[];
  "availableImplementations"?: string[];
  "unavailableImplementations"?: string[];
}

export interface CommandRequest {
  "reason": string;
  "payload"?: unknown;
  "expectedRevision"?: number;
}

export interface ConfigurationRevision {
  "configurationId": string;
  "targetType": string;
  "targetId": string;
  "revision": number;
  "status": "draft" | "validated" | "published" | "applying" | "applied" | "partially_applied" | "rejected" | "rolled_back";
  "applyMode": "hot_reload" | "new_task_only" | "reconnect_required" | "restart_required" | "immutable";
  "content"?: unknown;
  "checksum": string;
  "createdBy"?: string;
  "createdAt": string;
  "publishedAt"?: string;
  "state"?: DesiredObservedState;
}

export interface DesiredObservedState {
  "desired": { "revision"?: number; "status": string; "checksum"?: string };
  "observed": { "revision"?: number; "status": string; "checksum"?: string; "runtimeVersion"?: string; "observedAt"?: string };
  "convergence": { "status": "converged" | "pending" | "degraded" | "rejected" | "restart_required" | "unavailable"; "reasonCode"?: string; "detail"?: string };
}

export interface NodeEventEnvelope {
  "eventId": string;
  "eventType": string;
  "occurredAt": string;
  "recordedAt"?: string;
  "nodeId": string;
  "aggregateType": string;
  "aggregateId": string;
  "aggregateRevision": number;
  "correlationId": string;
  "causationId"?: string;
  "actorId"?: string;
  "dataClassification"?: "public" | "internal" | "restricted";
  "payload": Record<string, unknown>;
}

export interface EvidenceExportConfiguration {
  "exportId": string;
  "endpointRef": string;
  "sourceId": string;
  "nodeId"?: string;
  "credentialRef": string;
  "includedFamilies": ("runtime" | "skill" | "mcp_task" | "capability" | "experience" | "replay" | "artifact" | "node_control" | "evidence")[];
  "excludedDiagnosticTypes"?: string[];
  "batchPolicy": { "maxRecords": number; "maxBytes": number; "flushIntervalMs": number };
  "retryPolicy": { "baseDelayMs": number; "maxDelayMs": number; "maxAttempts"?: number };
  "outboxPolicy": { "maxPendingRecords": number; "retentionDays": number };
  "redactionProfile": string;
  "artifactMode": "inline" | "reference";
  "status": "draft" | "active" | "suspended" | "retired";
  "revision": number;
  "applyMode"?: "hot_reload" | "reconnect_required" | "restart_required";
}

export interface EvidenceExportStatus {
  "exportId": string;
  "status": "healthy" | "degraded" | "blocked" | "disabled" | "unavailable";
  "activeRevision"?: number;
  "lastAcknowledgedSequence"?: string;
  "pendingRecords": number;
  "oldestPendingAt"?: string;
  "lastAcknowledgedAt"?: string;
  "lastErrorCode"?: string;
  "lastErrorAt"?: string;
  "observedAt": string;
}

export interface EvidenceOperations {
  "exportId"?: string;
  "activeRevision"?: number;
  "pendingRecords": number;
  "deadLetterRecords": number;
  "openProjectionIssues": number;
  "openQualityIssues": number;
  "globalAcknowledgedFrontier"?: string;
  "highWatermarkActive": boolean;
  "partitions": ({ "exportId": string; "sourcePartition": string; "status": "idle" | "exporting" | "degraded" | "high_watermark" | "disabled"; "lastSentSequence"?: string; "lastAcknowledgedSequence"?: string; "lastAcknowledgedAt"?: string; "leaseExpiresAt"?: string; "fencingToken": string; "lastErrorCode"?: string; "lastErrorAt"?: string; "observedAt": string })[];
  "observedAt": string;
}

export interface LlmProvider {
  "providerId": string;
  "providerType": string;
  "baseUrl": string;
  "credentialRef": string;
  "models"?: { "modelId": string; "capabilities"?: string[]; "contextWindow"?: number; "enabled"?: boolean }[];
  "healthPolicy"?: Record<string, unknown>;
  "rateLimitPolicy"?: Record<string, unknown>;
  "status": "draft" | "active" | "degraded" | "suspended" | "retired";
  "secretStatus"?: "unknown" | "available" | "unavailable" | "invalid";
  "lastValidatedAt"?: string;
  "revision": number;
}

export interface ManagementOperation {
  "operationId": string;
  "operationType": string;
  "target": ResourceRef;
  "status": "accepted" | "running" | "succeeded" | "failed" | "canceled";
  "actorId": string;
  "reason": string;
  "idempotencyKeyHash"?: string;
  "inputHash"?: string;
  "result"?: unknown;
  "errorCode"?: string;
  "createdAt": string;
  "startedAt"?: string;
  "completedAt"?: string;
}

export interface McpProviderBinding {
  "bindingId": string;
  "localServerId": string;
  "originType": "direct" | "smpp_registry";
  "smppSourceId"?: string;
  "externalProviderId"?: string;
  "externalServerId"?: string;
  "registryRevision"?: number;
  "registryChecksum"?: string;
  "catalogRevision": string;
  "catalogChecksum": string;
  "endpointRef"?: string;
  "status": "candidate" | "imported" | "active" | "degraded" | "suspended" | "removed";
  "availabilityStatus"?: "unknown" | "available" | "degraded" | "unavailable";
  "availabilityValidUntil"?: string;
  "catalogObservedAt"?: string;
  "operationCount"?: number;
  "revision": number;
}

export interface ModelRoute {
  "routeId": string;
  "stage": "understanding" | "planning" | "execution" | "evaluation" | "summary" | "embedding";
  "primary": { "providerId": string; "modelId": string };
  "fallbacks": { "providerId": string; "modelId": string }[];
  "budgetPolicy"?: Record<string, unknown>;
  "status": "draft" | "active" | "suspended" | "retired";
  "revision": number;
}

export interface NodeCapabilityVersion {
  "capabilityId": string;
  "version": number;
  "domain": string;
  "name": string;
  "description": string;
  "inputSchema": Record<string, unknown>;
  "outputSchema": Record<string, unknown>;
  "successCriteria": Record<string, unknown>[];
  "requiredEvidence": Record<string, unknown>[];
  "effects"?: string[];
  "artifacts"?: string[];
  "constraints"?: Record<string, unknown>[];
  "supportedModes"?: string[];
  "riskLevel": "low" | "medium" | "high" | "critical";
  "status": "draft" | "validating" | "published" | "suspended" | "deprecated" | "retired";
  "definitionHash": string;
  "previousVersion"?: number;
  "createdBy"?: string;
  "createdAt"?: string;
}

export interface NodeHealth {
  "nodeId": string;
  "status": "healthy" | "degraded" | "unavailable" | "maintenance";
  "components": ({ "component": string; "status": "healthy" | "degraded" | "unavailable" | "disabled"; "reasonCode"?: string; "observedAt"?: string })[];
  "activeTasks"?: number;
  "observedAt": string;
}

export interface NodeProfile {
  "nodeId": string;
  "nodeType": string;
  "displayName": string;
  "description"?: string;
  "environment": string;
  "labels"?: Record<string, string>;
  "authorityScopes"?: string[];
  "runtimeEndpointRef"?: string;
  "telemetrySourceId"?: string;
  "status": "draft" | "active" | "maintenance" | "retired";
  "revision": number;
  "updatedAt"?: string;
}

export interface Page {
  "items": unknown[];
  "nextPageToken"?: string;
  "totalEstimate"?: number;
  "asOf"?: string;
}

export interface PlanTemplateVersionView {
  "artifactId": string;
  "version": string;
  "name"?: string;
  "status": "candidate" | "validated" | "approved" | "active" | "suspended" | "deprecated" | "retired";
  "checksum": string;
  "validationSummary"?: Record<string, unknown>;
  "activePointer"?: boolean;
  "createdAt"?: string;
}

export interface ProblemDetails {
  "type": string;
  "title": string;
  "status": number;
  "code": string;
  "detail"?: string;
  "instance"?: string;
  "correlationId": string;
  "retryable"?: boolean;
  "violations"?: { "path": string; "code": string; "message": string }[];
}

export interface ResourceRef {
  "type": string;
  "id": string;
  "version"?: string;
  "revision"?: number;
}

export interface RuntimeRevisionAck {
  "runtimeInstanceId": string;
  "targetType": string;
  "targetId": string;
  "revision": number;
  "status": "applied" | "partially_applied" | "rejected" | "restart_required" | "stale" | "unavailable";
  "observedRuntimeVersion": string;
  "activeChecksum"?: string;
  "reasonCode"?: string;
  "detail"?: Record<string, unknown>;
  "acknowledgedAt": string;
}

export interface RuntimeBootstrap {
  "nodeProfile": NodeProfile;
  "runtimeContractVersion": string;
  "activeConfigurationRefs": ResourceRef[];
  "activeCapabilityCatalogRef": ResourceRef;
  "activeExposureCatalogRef": ResourceRef;
  "evidenceExportRef"?: ResourceRef;
  "serviceCredentialPolicy"?: Record<string, unknown>;
}

export interface SkillVersionView {
  "skillId": string;
  "version": string;
  "name"?: string;
  "description"?: string;
  "status": "draft" | "validated" | "published" | "suspended" | "deprecated" | "retired";
  "inputSchema": Record<string, unknown>;
  "outputSchema": Record<string, unknown>;
  "usageSpecification"?: Record<string, unknown>;
  "outcomeSpecification"?: Record<string, unknown>;
  "evidencePolicy"?: Record<string, unknown>;
  "providerPolicy"?: Record<string, unknown>;
  "checksum"?: string;
  "createdAt"?: string;
}

export interface SmppSource {
  "smppSourceId": string;
  "name"?: string;
  "registryEndpoint": string;
  "credentialRef": string;
  "tenantId"?: string;
  "projectId"?: string;
  "environment"?: string;
  "syncMode": "manual" | "poll" | "watch";
  "snapshotTtlSeconds"?: number;
  "lkgPolicy"?: "allow_unexpired" | "deny_when_unavailable";
  "status": "draft" | "active" | "suspended" | "retired";
  "activeSnapshotRevision"?: number;
  "activeSnapshotChecksum"?: string;
  "activeSnapshotValidUntil"?: string;
  "lastSyncAt"?: string;
  "lastErrorCode"?: string;
  "revision": number;
}

export interface TaskCapabilityBinding {
  "bindingId": string;
  "taskId": string;
  "requestedCapabilityId": string;
  "capabilityVersion": number;
  "exposureId"?: string;
  "exposureVersion"?: number;
  "inputSnapshot": unknown;
  "successCriteriaSnapshot": Record<string, unknown>[];
  "evidenceRequirementSnapshot": Record<string, unknown>[];
  "constraintSnapshot": Record<string, unknown>[];
  "initialImplementationRefs": string[];
  "providerPolicySnapshot"?: unknown;
  "bindingHash": string;
  "boundAt": string;
}

export interface TaskSummary {
  "taskId": string;
  "goalId"?: string;
  "planId"?: string;
  "contextId"?: string;
  "phase": string;
  "selectedSkillId"?: string;
  "capabilityBindingId"?: string;
  "createdAt"?: string;
  "updatedAt": string;
  "controlledActions"?: Record<string, boolean>;
}

export interface SdarNodeDeclaration {
  "schemaVersion": "1.0";
  "nodeId": string;
  "nodeType": string;
  "displayName"?: string;
  "environment"?: string;
  "nodeControlApi": string;
  "nodeEvents": string;
  "a2aAgentCard": string;
  "contractVersions": { "nodeControlApi": string; "runtimeControl"?: string; "nodeEvents": string; "evidenceExport"?: string };
  "features"?: string[];
}

export type ContractOperation = { readonly operationId: string; readonly method: string; readonly path: string; readonly tag: string; readonly kind: 'query' | 'command' };
export const CONTRACT_VERSION = '1.0.0' as const;
export const CONTRACT_STATUS = 'PROTOCOL_DESIGN_FROZEN_IMPLEMENTATION_PENDING' as const;
export const OPENAPI_SHA256 = '870a7451b84410fe6979ac2e773dd42ba63e545dfe45899afc493b56010a6fde' as const;
export const CONTRACT_OPERATIONS = [
  {
    "operationId": "getSdarNodeDeclaration",
    "method": "GET",
    "path": "/.well-known/sdar-node",
    "tag": "Discovery",
    "kind": "query"
  },
  {
    "operationId": "getNodeControlLiveness",
    "method": "GET",
    "path": "/health/live",
    "tag": "Discovery",
    "kind": "query"
  },
  {
    "operationId": "getNodeControlReadiness",
    "method": "GET",
    "path": "/health/ready",
    "tag": "Discovery",
    "kind": "query"
  },
  {
    "operationId": "getNodeProfile",
    "method": "GET",
    "path": "/api/v1/node",
    "tag": "Node",
    "kind": "query"
  },
  {
    "operationId": "updateNodeProfileDraft",
    "method": "PUT",
    "path": "/api/v1/node/draft",
    "tag": "Node",
    "kind": "command"
  },
  {
    "operationId": "validateNodeProfileDraft",
    "method": "POST",
    "path": "/api/v1/node/draft/validate",
    "tag": "Node",
    "kind": "command"
  },
  {
    "operationId": "publishNodeProfileDraft",
    "method": "POST",
    "path": "/api/v1/node/draft/publish",
    "tag": "Node",
    "kind": "command"
  },
  {
    "operationId": "getNodeHealth",
    "method": "GET",
    "path": "/api/v1/node/health",
    "tag": "Node",
    "kind": "query"
  },
  {
    "operationId": "listConfigurationRevisions",
    "method": "GET",
    "path": "/api/v1/configuration-revisions",
    "tag": "Configuration",
    "kind": "query"
  },
  {
    "operationId": "createConfigurationRevision",
    "method": "POST",
    "path": "/api/v1/configuration-revisions",
    "tag": "Configuration",
    "kind": "command"
  },
  {
    "operationId": "getConfigurationRevision",
    "method": "GET",
    "path": "/api/v1/configuration-revisions/{configurationId}/{revision}",
    "tag": "Configuration",
    "kind": "query"
  },
  {
    "operationId": "validateConfigurationRevision",
    "method": "POST",
    "path": "/api/v1/configuration-revisions/{configurationId}/{revision}/validate",
    "tag": "Configuration",
    "kind": "command"
  },
  {
    "operationId": "publishConfigurationRevision",
    "method": "POST",
    "path": "/api/v1/configuration-revisions/{configurationId}/{revision}/publish",
    "tag": "Configuration",
    "kind": "command"
  },
  {
    "operationId": "rollbackConfigurationRevision",
    "method": "POST",
    "path": "/api/v1/configuration-revisions/{configurationId}/{revision}/rollback",
    "tag": "Configuration",
    "kind": "command"
  },
  {
    "operationId": "listLlmProviders",
    "method": "GET",
    "path": "/api/v1/llm-providers",
    "tag": "LLM",
    "kind": "query"
  },
  {
    "operationId": "createLlmProviderDraft",
    "method": "POST",
    "path": "/api/v1/llm-providers",
    "tag": "LLM",
    "kind": "command"
  },
  {
    "operationId": "getLlmProvider",
    "method": "GET",
    "path": "/api/v1/llm-providers/{providerId}",
    "tag": "LLM",
    "kind": "query"
  },
  {
    "operationId": "validateLlmProvider",
    "method": "POST",
    "path": "/api/v1/llm-providers/{providerId}/validate",
    "tag": "LLM",
    "kind": "command"
  },
  {
    "operationId": "listModelRoutes",
    "method": "GET",
    "path": "/api/v1/model-routes",
    "tag": "LLM",
    "kind": "query"
  },
  {
    "operationId": "createModelRouteDraft",
    "method": "POST",
    "path": "/api/v1/model-routes",
    "tag": "LLM",
    "kind": "command"
  },
  {
    "operationId": "getModelRoute",
    "method": "GET",
    "path": "/api/v1/model-routes/{routeId}",
    "tag": "LLM",
    "kind": "query"
  },
  {
    "operationId": "listSmppSources",
    "method": "GET",
    "path": "/api/v1/smpp-sources",
    "tag": "SMPP",
    "kind": "query"
  },
  {
    "operationId": "createSmppSourceDraft",
    "method": "POST",
    "path": "/api/v1/smpp-sources",
    "tag": "SMPP",
    "kind": "command"
  },
  {
    "operationId": "getSmppSource",
    "method": "GET",
    "path": "/api/v1/smpp-sources/{smppSourceId}",
    "tag": "SMPP",
    "kind": "query"
  },
  {
    "operationId": "syncSmppSource",
    "method": "POST",
    "path": "/api/v1/smpp-sources/{smppSourceId}/sync",
    "tag": "SMPP",
    "kind": "command"
  },
  {
    "operationId": "listMcpProviderCandidates",
    "method": "GET",
    "path": "/api/v1/mcp-provider-candidates",
    "tag": "MCP",
    "kind": "query"
  },
  {
    "operationId": "listMcpProviderBindings",
    "method": "GET",
    "path": "/api/v1/mcp-provider-bindings",
    "tag": "MCP",
    "kind": "query"
  },
  {
    "operationId": "importMcpProviderBinding",
    "method": "POST",
    "path": "/api/v1/mcp-provider-bindings",
    "tag": "MCP",
    "kind": "command"
  },
  {
    "operationId": "getMcpProviderBinding",
    "method": "GET",
    "path": "/api/v1/mcp-provider-bindings/{bindingId}",
    "tag": "MCP",
    "kind": "query"
  },
  {
    "operationId": "refreshMcpProviderBinding",
    "method": "POST",
    "path": "/api/v1/mcp-provider-bindings/{bindingId}/refresh",
    "tag": "MCP",
    "kind": "command"
  },
  {
    "operationId": "suspendMcpProviderBinding",
    "method": "POST",
    "path": "/api/v1/mcp-provider-bindings/{bindingId}/suspend",
    "tag": "MCP",
    "kind": "command"
  },
  {
    "operationId": "removeMcpProviderBinding",
    "method": "POST",
    "path": "/api/v1/mcp-provider-bindings/{bindingId}/remove",
    "tag": "MCP",
    "kind": "command"
  },
  {
    "operationId": "listSkills",
    "method": "GET",
    "path": "/api/v1/skills",
    "tag": "Skills",
    "kind": "query"
  },
  {
    "operationId": "importSkillPackage",
    "method": "POST",
    "path": "/api/v1/skills/import",
    "tag": "Skills",
    "kind": "command"
  },
  {
    "operationId": "listSkillVersions",
    "method": "GET",
    "path": "/api/v1/skills/{skillId}/versions",
    "tag": "Skills",
    "kind": "query"
  },
  {
    "operationId": "getSkillVersion",
    "method": "GET",
    "path": "/api/v1/skills/{skillId}/versions/{version}",
    "tag": "Skills",
    "kind": "query"
  },
  {
    "operationId": "publishSkillVersion",
    "method": "POST",
    "path": "/api/v1/skills/{skillId}/versions/{version}/publish",
    "tag": "Skills",
    "kind": "command"
  },
  {
    "operationId": "suspendSkillVersion",
    "method": "POST",
    "path": "/api/v1/skills/{skillId}/versions/{version}/suspend",
    "tag": "Skills",
    "kind": "command"
  },
  {
    "operationId": "deprecateSkillVersion",
    "method": "POST",
    "path": "/api/v1/skills/{skillId}/versions/{version}/deprecate",
    "tag": "Skills",
    "kind": "command"
  },
  {
    "operationId": "listPlanTemplates",
    "method": "GET",
    "path": "/api/v1/plan-templates",
    "tag": "PlanTemplates",
    "kind": "query"
  },
  {
    "operationId": "listPlanTemplateVersions",
    "method": "GET",
    "path": "/api/v1/plan-templates/{artifactId}/versions",
    "tag": "PlanTemplates",
    "kind": "query"
  },
  {
    "operationId": "getPlanTemplateVersion",
    "method": "GET",
    "path": "/api/v1/plan-templates/{artifactId}/versions/{version}",
    "tag": "PlanTemplates",
    "kind": "query"
  },
  {
    "operationId": "publishPlanTemplateVersion",
    "method": "POST",
    "path": "/api/v1/plan-templates/{artifactId}/versions/{version}/publish",
    "tag": "PlanTemplates",
    "kind": "command"
  },
  {
    "operationId": "revalidatePlanTemplateVersion",
    "method": "POST",
    "path": "/api/v1/plan-templates/{artifactId}/versions/{version}/revalidate",
    "tag": "PlanTemplates",
    "kind": "command"
  },
  {
    "operationId": "suspendPlanTemplateVersion",
    "method": "POST",
    "path": "/api/v1/plan-templates/{artifactId}/versions/{version}/suspend",
    "tag": "PlanTemplates",
    "kind": "command"
  },
  {
    "operationId": "listNodeCapabilities",
    "method": "GET",
    "path": "/api/v1/node-capabilities",
    "tag": "Capabilities",
    "kind": "query"
  },
  {
    "operationId": "createNodeCapabilityDraft",
    "method": "POST",
    "path": "/api/v1/node-capabilities",
    "tag": "Capabilities",
    "kind": "command"
  },
  {
    "operationId": "getNodeCapabilityVersion",
    "method": "GET",
    "path": "/api/v1/node-capabilities/{capabilityId}/versions/{version}",
    "tag": "Capabilities",
    "kind": "query"
  },
  {
    "operationId": "validateNodeCapabilityVersion",
    "method": "POST",
    "path": "/api/v1/node-capabilities/{capabilityId}/versions/{version}/validate",
    "tag": "Capabilities",
    "kind": "command"
  },
  {
    "operationId": "publishNodeCapabilityVersion",
    "method": "POST",
    "path": "/api/v1/node-capabilities/{capabilityId}/versions/{version}/publish",
    "tag": "Capabilities",
    "kind": "command"
  },
  {
    "operationId": "suspendNodeCapabilityVersion",
    "method": "POST",
    "path": "/api/v1/node-capabilities/{capabilityId}/versions/{version}/suspend",
    "tag": "Capabilities",
    "kind": "command"
  },
  {
    "operationId": "deprecateNodeCapabilityVersion",
    "method": "POST",
    "path": "/api/v1/node-capabilities/{capabilityId}/versions/{version}/deprecate",
    "tag": "Capabilities",
    "kind": "command"
  },
  {
    "operationId": "retireNodeCapabilityVersion",
    "method": "POST",
    "path": "/api/v1/node-capabilities/{capabilityId}/versions/{version}/retire",
    "tag": "Capabilities",
    "kind": "command"
  },
  {
    "operationId": "listCapabilityImplementations",
    "method": "GET",
    "path": "/api/v1/node-capabilities/{capabilityId}/versions/{version}/implementations",
    "tag": "Capabilities",
    "kind": "query"
  },
  {
    "operationId": "createCapabilityImplementation",
    "method": "POST",
    "path": "/api/v1/node-capabilities/{capabilityId}/versions/{version}/implementations",
    "tag": "Capabilities",
    "kind": "command"
  },
  {
    "operationId": "listCapabilityReadiness",
    "method": "GET",
    "path": "/api/v1/capability-readiness",
    "tag": "Capabilities",
    "kind": "query"
  },
  {
    "operationId": "getCapabilityReadiness",
    "method": "GET",
    "path": "/api/v1/capability-readiness/{capabilityId}/{version}",
    "tag": "Capabilities",
    "kind": "query"
  },
  {
    "operationId": "evaluateCapabilityReadiness",
    "method": "POST",
    "path": "/api/v1/capability-readiness/{capabilityId}/{version}/evaluate",
    "tag": "Capabilities",
    "kind": "command"
  },
  {
    "operationId": "listA2aExposures",
    "method": "GET",
    "path": "/api/v1/a2a-exposures",
    "tag": "A2A",
    "kind": "query"
  },
  {
    "operationId": "createA2aExposureDraft",
    "method": "POST",
    "path": "/api/v1/a2a-exposures",
    "tag": "A2A",
    "kind": "command"
  },
  {
    "operationId": "getA2aExposureVersion",
    "method": "GET",
    "path": "/api/v1/a2a-exposures/{exposureId}/versions/{version}",
    "tag": "A2A",
    "kind": "query"
  },
  {
    "operationId": "publishA2aExposureVersion",
    "method": "POST",
    "path": "/api/v1/a2a-exposures/{exposureId}/versions/{version}/publish",
    "tag": "A2A",
    "kind": "command"
  },
  {
    "operationId": "suspendA2aExposureVersion",
    "method": "POST",
    "path": "/api/v1/a2a-exposures/{exposureId}/versions/{version}/suspend",
    "tag": "A2A",
    "kind": "command"
  },
  {
    "operationId": "retireA2aExposureVersion",
    "method": "POST",
    "path": "/api/v1/a2a-exposures/{exposureId}/versions/{version}/retire",
    "tag": "A2A",
    "kind": "command"
  },
  {
    "operationId": "listAgentCardRevisions",
    "method": "GET",
    "path": "/api/v1/a2a-agent-card-revisions",
    "tag": "A2A",
    "kind": "query"
  },
  {
    "operationId": "getAgentCardRevision",
    "method": "GET",
    "path": "/api/v1/a2a-agent-card-revisions/{revision}",
    "tag": "A2A",
    "kind": "query"
  },
  {
    "operationId": "rebuildAgentCardRevision",
    "method": "POST",
    "path": "/api/v1/a2a-agent-card-revisions/rebuild",
    "tag": "A2A",
    "kind": "command"
  },
  {
    "operationId": "listOperationalTasks",
    "method": "GET",
    "path": "/api/v1/tasks",
    "tag": "Tasks",
    "kind": "query"
  },
  {
    "operationId": "getOperationalTask",
    "method": "GET",
    "path": "/api/v1/tasks/{taskId}",
    "tag": "Tasks",
    "kind": "query"
  },
  {
    "operationId": "getTaskCapabilityBinding",
    "method": "GET",
    "path": "/api/v1/tasks/{taskId}/capability-binding",
    "tag": "Tasks",
    "kind": "query"
  },
  {
    "operationId": "pauseTask",
    "method": "POST",
    "path": "/api/v1/tasks/{taskId}/pause",
    "tag": "Tasks",
    "kind": "command"
  },
  {
    "operationId": "resumeTask",
    "method": "POST",
    "path": "/api/v1/tasks/{taskId}/resume",
    "tag": "Tasks",
    "kind": "command"
  },
  {
    "operationId": "cancelTask",
    "method": "POST",
    "path": "/api/v1/tasks/{taskId}/cancel",
    "tag": "Tasks",
    "kind": "command"
  },
  {
    "operationId": "submitTaskGoalPatch",
    "method": "POST",
    "path": "/api/v1/tasks/{taskId}/goal-patches",
    "tag": "Tasks",
    "kind": "command"
  },
  {
    "operationId": "getEvidenceExportConfiguration",
    "method": "GET",
    "path": "/api/v1/evidence-export",
    "tag": "EvidenceExport",
    "kind": "query"
  },
  {
    "operationId": "createEvidenceExportRevision",
    "method": "POST",
    "path": "/api/v1/evidence-export/revisions",
    "tag": "EvidenceExport",
    "kind": "command"
  },
  {
    "operationId": "validateEvidenceExportRevision",
    "method": "POST",
    "path": "/api/v1/evidence-export/revisions/{revision}/validate",
    "tag": "EvidenceExport",
    "kind": "command"
  },
  {
    "operationId": "publishEvidenceExportRevision",
    "method": "POST",
    "path": "/api/v1/evidence-export/revisions/{revision}/publish",
    "tag": "EvidenceExport",
    "kind": "command"
  },
  {
    "operationId": "getEvidenceExportStatus",
    "method": "GET",
    "path": "/api/v1/evidence-export/status",
    "tag": "EvidenceExport",
    "kind": "query"
  },
  {
    "operationId": "testEvidenceExportConnection",
    "method": "POST",
    "path": "/api/v1/evidence-export/test",
    "tag": "EvidenceExport",
    "kind": "command"
  },
  {
    "operationId": "listManagementOperations",
    "method": "GET",
    "path": "/api/v1/management-operations",
    "tag": "Operations",
    "kind": "query"
  },
  {
    "operationId": "getManagementOperation",
    "method": "GET",
    "path": "/api/v1/management-operations/{operationId}",
    "tag": "Operations",
    "kind": "query"
  },
  {
    "operationId": "cancelManagementOperation",
    "method": "POST",
    "path": "/api/v1/management-operations/{operationId}/cancel",
    "tag": "Operations",
    "kind": "command"
  },
  {
    "operationId": "listAuditEvents",
    "method": "GET",
    "path": "/api/v1/audit-events",
    "tag": "Audit",
    "kind": "query"
  },
  {
    "operationId": "subscribeNodeEvents",
    "method": "GET",
    "path": "/api/v1/events",
    "tag": "Events",
    "kind": "query"
  },
  {
    "operationId": "listEvidenceOutbox",
    "method": "GET",
    "path": "/api/v1/evidence-export/outbox",
    "tag": "EvidenceExport",
    "kind": "query"
  },
  {
    "operationId": "listEvidenceSourceCheckpoints",
    "method": "GET",
    "path": "/api/v1/evidence-export/source-checkpoints",
    "tag": "EvidenceExport",
    "kind": "query"
  },
  {
    "operationId": "listEvidenceProjectionIssues",
    "method": "GET",
    "path": "/api/v1/evidence-export/projection-issues",
    "tag": "EvidenceExport",
    "kind": "query"
  },
  {
    "operationId": "listEvidenceQualityIssues",
    "method": "GET",
    "path": "/api/v1/evidence-export/quality-issues",
    "tag": "EvidenceExport",
    "kind": "query"
  },
  {
    "operationId": "getEpisodeEvidenceManifest",
    "method": "GET",
    "path": "/api/v1/evidence-export/episode-manifests/{episodeId}",
    "tag": "EvidenceExport",
    "kind": "query"
  },
  {
    "operationId": "listEvidenceDeadLetters",
    "method": "GET",
    "path": "/api/v1/evidence-export/dead-letters",
    "tag": "EvidenceExport",
    "kind": "query"
  },
  {
    "operationId": "replayEvidence",
    "method": "POST",
    "path": "/api/v1/evidence-export/replays",
    "tag": "EvidenceExport",
    "kind": "command"
  },
  {
    "operationId": "retryEvidenceDeadLetter",
    "method": "POST",
    "path": "/api/v1/evidence-export/dead-letters/{deadLetterId}/retry",
    "tag": "EvidenceExport",
    "kind": "command"
  },
  {
    "operationId": "reconcileEvidenceCoverage",
    "method": "POST",
    "path": "/api/v1/evidence-export/reconcile",
    "tag": "EvidenceExport",
    "kind": "command"
  }
] as const satisfies readonly ContractOperation[];
