import type { CommandInput, RecordKind } from '../domain';
import { ConsoleError } from '../domain';

const CONFIGURATION_OPERATIONS = new Set([
  'createConfigurationRevision',
  'validateConfigurationRevision',
  'publishConfigurationRevision',
  'rollbackConfigurationRevision',
]);
const READINESS_OPERATION = 'evaluateCapabilityReadiness';
const EVIDENCE_OPERATIONS = new Set([
  'createEvidenceExportRevision',
  'validateEvidenceExportRevision',
  'publishEvidenceExportRevision',
  'testEvidenceExportConnection',
  'replayEvidence',
  'retryEvidenceDeadLetter',
  'reconcileEvidenceCoverage',
]);
const SUPPLY_OPERATIONS = new Set([
  'createLlmProviderDraft', 'validateLlmProvider', 'createModelRouteDraft',
  'createSmppSourceDraft', 'syncSmppSource', 'importMcpProviderBinding',
  'refreshMcpProviderBinding', 'suspendMcpProviderBinding', 'removeMcpProviderBinding',
]);
const CAPABILITY_OPERATIONS = new Set([
  'createNodeCapabilityDraft', 'validateNodeCapabilityVersion', 'publishNodeCapabilityVersion',
  'suspendNodeCapabilityVersion', 'deprecateNodeCapabilityVersion', 'retireNodeCapabilityVersion',
  'createCapabilityImplementation',
]);
const A2A_OPERATIONS = new Set([
  'createA2aExposureDraft', 'publishA2aExposureVersion', 'suspendA2aExposureVersion',
  'retireA2aExposureVersion', 'rebuildAgentCardRevision',
]);
const TASK_OPERATIONS = new Set(['pauseTask', 'resumeTask', 'cancelTask', 'submitTaskGoalPatch']);
export const REQUIRED_EVIDENCE_FAMILIES = [
  'runtime', 'skill', 'mcp_task', 'capability', 'experience', 'replay', 'artifact', 'node_control', 'evidence',
] as const;

export interface LiveCommandMapping {
  method: string;
  path: string;
  body: unknown;
  currentResourcePath?: string;
  responseKind?: 'configuration' | 'evidenceConfiguration' | 'record' | 'operation';
  recordKind?: RecordKind;
}

export async function mapLiveCommand(input: CommandInput): Promise<LiveCommandMapping> {
  if (!CONFIGURATION_OPERATIONS.has(input.operation.operationId) && input.operation.operationId !== READINESS_OPERATION && !EVIDENCE_OPERATIONS.has(input.operation.operationId) && !SUPPLY_OPERATIONS.has(input.operation.operationId) && !CAPABILITY_OPERATIONS.has(input.operation.operationId) && !A2A_OPERATIONS.has(input.operation.operationId) && !TASK_OPERATIONS.has(input.operation.operationId)) {
    throw new ConsoleError({
      status: 501,
      code: 'CONSOLE_LIVE_COMMAND_NOT_MAPPED',
      title: 'Live command mapping is not ready',
      detail: `${input.operation.operationId} has no operation-specific live request mapping.`,
      correlationId: 'console-local',
      retryable: false,
    });
  }

  if (EVIDENCE_OPERATIONS.has(input.operation.operationId)) return evidenceCommand(input);
  if (SUPPLY_OPERATIONS.has(input.operation.operationId)) return supplyCommand(input);
  if (CAPABILITY_OPERATIONS.has(input.operation.operationId)) return capabilityCommand(input);
  if (A2A_OPERATIONS.has(input.operation.operationId)) return a2aCommand(input);
  if (TASK_OPERATIONS.has(input.operation.operationId)) return taskCommand(input);

  if (input.operation.operationId === READINESS_OPERATION) {
    const separator = input.target.id.lastIndexOf('@');
    const capabilityId = separator < 0 ? input.target.id : input.target.id.slice(0, separator);
    const version = input.target.revision ?? (separator < 0 ? undefined : Number(input.target.id.slice(separator + 1)));
    if (!capabilityId || typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
      throw invalidPayload('A Capability Readiness command requires capabilityId and a positive version.');
    }
    return {
      method: input.operation.method,
      path: input.operation.path.replace('{capabilityId}', encodeURIComponent(capabilityId)).replace('{version}', String(version)),
      body: { reason: requiredText(input.reason, 'reason') },
      responseKind: 'operation',
    };
  }

  if (input.operation.operationId === 'createConfigurationRevision') {
    return {
      method: input.operation.method,
      path: input.operation.path,
      body: await configurationDraft(input),
      responseKind: 'configuration',
    };
  }

  const { configurationId, revision } = configurationIdentity(input);
  const currentResourcePath = `/api/v1/configuration-revisions/${encodeURIComponent(configurationId)}/${String(revision)}`;
  const path = input.operation.path
    .replace('{configurationId}', encodeURIComponent(configurationId))
    .replace('{revision}', String(revision));
  return {
    method: input.operation.method,
    path,
    currentResourcePath,
    body: {
      reason: requiredText(input.reason, 'reason'),
      ...(input.payload === undefined ? {} : { payload: input.payload }),
      expectedRevision: input.expectedRevision ?? revision,
    },
    responseKind: input.operation.operationId === 'validateConfigurationRevision' ? 'configuration' : 'operation',
  };
}

async function capabilityCommand(input: CommandInput): Promise<LiveCommandMapping> {
  const operationId = input.operation.operationId;
  if (operationId === 'createNodeCapabilityDraft') {
    const payload = input.payload ?? {};
    const capabilityId = requiredText(payload.capabilityId ?? payload.id ?? input.target.id, 'capabilityId');
    const version = positiveInteger(payload.version, 1, 'version');
    const inputSchema = jsonObject(payload.inputSchema, 'inputSchema');
    const outputSchema = jsonObject(payload.outputSchema, 'outputSchema');
    const successCriteria = jsonObjectArray(payload.successCriteria, 'successCriteria', true);
    const requiredEvidence = jsonObjectArray(payload.requiredEvidence, 'requiredEvidence', true);
    const effects = textArray(payload.effects);
    const artifacts = textArray(payload.artifacts);
    const constraints = jsonObjectArray(payload.constraints, 'constraints');
    const supportedModes = textArray(payload.supportedModes);
    const previousVersion = optionalPositiveInteger(payload.previousVersion, 'previousVersion');
    const body = {
      capabilityId,
      version,
      domain: requiredText(payload.domain, 'domain'),
      name: requiredText(payload.name, 'name'),
      description: requiredText(payload.description, 'description'),
      inputSchema,
      outputSchema,
      successCriteria,
      requiredEvidence,
      effects,
      artifacts,
      constraints,
      supportedModes,
      riskLevel: requiredText(payload.riskLevel, 'riskLevel'),
      status: 'draft',
      ...(previousVersion === undefined ? {} : { previousVersion }),
    };
    const definitionHash = await sha256(canonicalJson({
      capabilityId, version, domain: body.domain, name: body.name, description: body.description,
      inputSchema, outputSchema, successCriteria, requiredEvidence, effects, artifacts, constraints,
      supportedModes, riskLevel: body.riskLevel, previousVersion: previousVersion ?? null,
    }));
    return { method: input.operation.method, path: input.operation.path, body: { ...body, definitionHash }, responseKind: 'record', recordKind: 'capability' };
  }
  const { resourceId: capabilityId, version } = versionedIdentity(input, 'Capability');
  const path = input.operation.path
    .replace('{capabilityId}', encodeURIComponent(capabilityId))
    .replace('{version}', String(version));
  if (operationId === 'createCapabilityImplementation') {
    const payload = input.payload ?? {};
    return {
      method: input.operation.method,
      path,
      body: {
        bindingId: requiredText(payload.bindingId, 'bindingId'),
        capabilityId,
        capabilityVersion: version,
        implementationType: requiredText(payload.implementationType, 'implementationType'),
        implementationId: requiredText(payload.implementationId, 'implementationId'),
        implementationVersion: requiredText(payload.implementationVersion, 'implementationVersion'),
        role: requiredText(payload.role ?? 'primary', 'role'),
        priority: nonNegativeInteger(payload.priority, 0, 'priority'),
        ...(payload.activationCondition === undefined || payload.activationCondition === '' ? {} : { activationCondition: jsonValue(payload.activationCondition, 'activationCondition') }),
        ...(payload.providerPolicyOverride === undefined || payload.providerPolicyOverride === '' ? {} : { providerPolicyOverride: jsonValue(payload.providerPolicyOverride, 'providerPolicyOverride') }),
        status: requiredText(payload.status ?? 'active', 'status'),
        revision: positiveInteger(payload.revision, 1, 'revision'),
      },
    };
  }
  return {
    method: input.operation.method,
    path,
    currentResourcePath: `/api/v1/node-capabilities/${encodeURIComponent(capabilityId)}/versions/${String(version)}`,
    body: { reason: requiredText(input.reason, 'reason') },
    responseKind: operationId === 'validateNodeCapabilityVersion' ? 'record' : 'operation',
    ...(operationId === 'validateNodeCapabilityVersion' ? { recordKind: 'capability' as const } : {}),
  };
}

async function a2aCommand(input: CommandInput): Promise<LiveCommandMapping> {
  const operationId = input.operation.operationId;
  if (operationId === 'rebuildAgentCardRevision') {
    return { method: input.operation.method, path: input.operation.path, body: { reason: requiredText(input.reason, 'reason') }, responseKind: 'operation' };
  }
  if (operationId === 'createA2aExposureDraft') {
    const payload = input.payload ?? {};
    const exposureId = requiredText(payload.exposureId ?? payload.id ?? input.target.id, 'exposureId');
    const version = positiveInteger(payload.version, 1, 'version');
    const requestSchema = jsonObject(payload.requestSchema, 'requestSchema');
    const resultSchema = jsonObject(payload.resultSchema, 'resultSchema');
    const requesterPolicy = payload.requesterPolicy === undefined || payload.requesterPolicy === '' ? undefined : jsonObject(payload.requesterPolicy, 'requesterPolicy');
    const body = {
      exposureId,
      version,
      capabilityId: requiredText(payload.capabilityId, 'capabilityId'),
      capabilityVersion: positiveInteger(payload.capabilityVersion, 1, 'capabilityVersion'),
      agentSkillId: requiredText(payload.agentSkillId, 'agentSkillId'),
      name: requiredText(payload.name, 'name'),
      description: requiredText(payload.description, 'description'),
      tags: textArray(payload.tags),
      examples: textArray(payload.examples),
      inputModes: textArray(payload.inputModes),
      outputModes: textArray(payload.outputModes),
      requestSchema,
      resultSchema,
      visibility: requiredText(payload.visibility, 'visibility'),
      ...(requesterPolicy === undefined ? {} : { requesterPolicy }),
      readinessPublicationPolicy: requiredText(payload.readinessPublicationPolicy ?? 'publish_when_available', 'readinessPublicationPolicy'),
      status: 'draft',
    };
    const exposureHash = await sha256(canonicalJson({
      exposureId, version, capabilityId: body.capabilityId, capabilityVersion: body.capabilityVersion,
      agentSkillId: body.agentSkillId, name: body.name, description: body.description, tags: body.tags,
      examples: body.examples, inputModes: body.inputModes, outputModes: body.outputModes,
      requestSchema, resultSchema, visibility: body.visibility, requesterPolicy: requesterPolicy ?? {},
      readinessPublicationPolicy: body.readinessPublicationPolicy,
    }));
    return { method: input.operation.method, path: input.operation.path, body: { ...body, exposureHash }, responseKind: 'record', recordKind: 'a2aExposure' };
  }
  const { resourceId: exposureId, version } = versionedIdentity(input, 'A2A Exposure');
  return {
    method: input.operation.method,
    path: input.operation.path.replace('{exposureId}', encodeURIComponent(exposureId)).replace('{version}', String(version)),
    currentResourcePath: `/api/v1/a2a-exposures/${encodeURIComponent(exposureId)}/versions/${String(version)}`,
    body: { reason: requiredText(input.reason, 'reason') },
    responseKind: 'operation',
  };
}

function taskCommand(input: CommandInput): LiveCommandMapping {
  return {
    method: input.operation.method,
    path: input.operation.path.replace('{taskId}', encodeURIComponent(requiredText(input.target.id, 'taskId'))),
    body: { reason: requiredText(input.reason, 'reason'), ...(input.payload === undefined ? {} : { payload: input.payload }) },
    responseKind: 'operation',
  };
}

function supplyCommand(input: CommandInput): LiveCommandMapping {
  const operationId = input.operation.operationId;
  const payload = input.payload ?? {};
  if (operationId === 'createLlmProviderDraft') {
    return {
      method: input.operation.method, path: input.operation.path,
      body: {
        providerId: requiredText(payload.providerId ?? input.target.id, 'providerId'),
        providerType: requiredText(payload.providerType, 'providerType'),
        baseUrl: requiredText(payload.baseUrl, 'baseUrl'),
        credentialRef: requiredText(payload.credentialRef, 'credentialRef'),
        models: [{
          modelId: requiredText(payload.modelId, 'modelId'),
          capabilities: ['structured_output', 'tool_calling'],
          contextWindow: positiveInteger(payload.contextWindow, 32_768, 'contextWindow'), enabled: true,
        }],
        healthPolicy: { timeoutMs: 10_000, retryAttempts: 1, failureThreshold: 3, recoverySeconds: 60 },
        rateLimitPolicy: { requestsPerMinute: 60, tokensPerMinute: 100_000, maxConcurrent: 4 },
        status: 'draft', secretStatus: 'unknown', revision: 1,
      },
      responseKind: 'record', recordKind: 'llmProvider',
    };
  }
  if (operationId === 'createModelRouteDraft') {
    const fallbacks = Array.isArray(payload.fallbacks) ? payload.fallbacks.map((item) => providerModelRef(item, 'fallback')) : [];
    return {
      method: input.operation.method, path: input.operation.path,
      body: {
        routeId: requiredText(payload.routeId ?? input.target.id, 'routeId'),
        stage: requiredText(payload.stage, 'stage'),
        primary: providerModelRef(payload.primary, 'primary'),
        fallbacks,
        budgetPolicy: { selector: { scope: 'stage' }, timeoutMs: 30_000, maxAttempts: Math.min(2, fallbacks.length + 1), maxInputTokens: 32_768, maxOutputTokens: 8_192, maxCostUsd: 1, fallbackOn: ['unavailable', 'timeout', 'rate_limited', 'upstream_error'] },
        status: 'draft', revision: 1,
      },
      responseKind: 'record', recordKind: 'modelRoute',
    };
  }
  if (operationId === 'createSmppSourceDraft') {
    return {
      method: input.operation.method, path: input.operation.path,
      body: {
        smppSourceId: requiredText(payload.smppSourceId ?? input.target.id, 'smppSourceId'),
        ...(payload.name ? { name: requiredText(payload.name, 'name') } : {}),
        registryEndpoint: requiredText(payload.registryEndpoint, 'registryEndpoint'),
        credentialRef: requiredText(payload.credentialRef, 'credentialRef'),
        environment: requiredText(payload.environment ?? 'home_lab', 'environment'),
        syncMode: requiredText(payload.syncMode ?? 'manual', 'syncMode'),
        snapshotTtlSeconds: positiveInteger(payload.snapshotTtlSeconds, 3_600, 'snapshotTtlSeconds'),
        lkgPolicy: requiredText(payload.lkgPolicy ?? 'allow_unexpired', 'lkgPolicy'),
        status: 'draft', revision: 1,
      },
      responseKind: 'record', recordKind: 'smppSource',
    };
  }
  if (operationId === 'importMcpProviderBinding') {
    return {
      method: input.operation.method, path: input.operation.path,
      body: { reason: requiredText(input.reason, 'reason'), payload: {
        bindingId: requiredText(payload.bindingId ?? input.target.id, 'bindingId'),
        localServerId: requiredText(payload.localServerId, 'localServerId'),
        originType: requiredText(payload.originType, 'originType'),
        credentialRef: requiredText(payload.credentialRef, 'credentialRef'),
        ...(payload.endpointRef ? { endpointRef: requiredText(payload.endpointRef, 'endpointRef') } : {}),
        ...(payload.smppSourceId ? { smppSourceId: requiredText(payload.smppSourceId, 'smppSourceId') } : {}),
        ...(payload.externalProviderId ? { externalProviderId: requiredText(payload.externalProviderId, 'externalProviderId') } : {}),
        ...(payload.externalServerId ? { externalServerId: requiredText(payload.externalServerId, 'externalServerId') } : {}),
        ...(payload.registryRevision ? { registryRevision: positiveInteger(payload.registryRevision, 1, 'registryRevision') } : {}),
        ...(payload.registryChecksum ? { registryChecksum: requiredText(payload.registryChecksum, 'registryChecksum') } : {}),
      } },
      responseKind: 'operation',
    };
  }
  const resourceId = encodeURIComponent(input.target.id);
  const path = input.operation.path
    .replace('{providerId}', resourceId)
    .replace('{smppSourceId}', resourceId)
    .replace('{bindingId}', resourceId);
  return {
    method: input.operation.method, path,
    body: { reason: requiredText(input.reason, 'reason'), ...(input.expectedRevision === undefined ? {} : { expectedRevision: input.expectedRevision }), ...(input.payload === undefined ? {} : { payload: input.payload }) },
    responseKind: 'operation',
  };
}

function providerModelRef(value: unknown, field: string) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  const [providerId, modelId] = requiredText(value, field).split(':');
  if (!providerId || !modelId) throw invalidPayload(`${field} must use providerId:modelId.`);
  return { providerId, modelId };
}

function evidenceCommand(input: CommandInput): LiveCommandMapping {
  const operationId = input.operation.operationId;
  if (operationId === 'createEvidenceExportRevision') {
    const payload = input.payload ?? {};
    const includedFamilies = Array.isArray(payload.includedFamilies) ? payload.includedFamilies : REQUIRED_EVIDENCE_FAMILIES;
    if (REQUIRED_EVIDENCE_FAMILIES.some((family) => !includedFamilies.includes(family))) {
      throw invalidPayload('Evidence v1.4.1 required families cannot be disabled.');
    }
    return {
      method: input.operation.method,
      path: input.operation.path,
      body: {
        exportId: requiredText(payload.exportId ?? input.target.id, 'exportId'),
        endpointRef: requiredText(payload.endpointRef, 'endpointRef'),
        sourceId: requiredText(payload.sourceId, 'sourceId'),
        ...(payload.nodeId ? { nodeId: requiredText(payload.nodeId, 'nodeId') } : {}),
        credentialRef: requiredText(payload.credentialRef, 'credentialRef'),
        includedFamilies,
        excludedDiagnosticTypes: Array.isArray(payload.excludedDiagnosticTypes) ? payload.excludedDiagnosticTypes : [],
        batchPolicy: payload.batchPolicy ?? { maxRecords: 100, maxBytes: 262_144, flushIntervalMs: 1_000 },
        retryPolicy: payload.retryPolicy ?? { baseDelayMs: 1_000, maxDelayMs: 60_000, maxAttempts: 20 },
        outboxPolicy: payload.outboxPolicy ?? { maxPendingRecords: 100_000, retentionDays: 30 },
        redactionProfile: requiredText(payload.redactionProfile ?? 'default', 'redactionProfile'),
        artifactMode: requiredText(payload.artifactMode ?? 'reference', 'artifactMode'),
        status: 'draft',
        revision: positiveInteger(payload.revision, typeof input.target.revision === 'number' ? input.target.revision : 1, 'revision'),
        applyMode: requiredText(payload.applyMode ?? 'hot_reload', 'applyMode'),
      },
      responseKind: 'evidenceConfiguration',
    };
  }
  if (operationId === 'validateEvidenceExportRevision' || operationId === 'publishEvidenceExportRevision') {
    const revision = positiveInteger(input.target.revision, Number(input.payload?.revision ?? input.expectedRevision), 'revision');
    return {
      method: input.operation.method,
      path: input.operation.path.replace('{revision}', String(revision)),
      currentResourcePath: '/api/v1/evidence-export',
      body: { reason: requiredText(input.reason, 'reason'), expectedRevision: input.expectedRevision ?? revision },
      responseKind: operationId === 'validateEvidenceExportRevision' ? 'evidenceConfiguration' : 'operation',
    };
  }
  if (operationId === 'retryEvidenceDeadLetter') {
    return {
      method: input.operation.method,
      path: input.operation.path.replace('{deadLetterId}', encodeURIComponent(requiredText(input.target.id, 'deadLetterId'))),
      body: { reason: requiredText(input.reason, 'reason') },
      responseKind: 'operation',
    };
  }
  if (operationId === 'replayEvidence') {
    const payload = input.payload ?? {};
    const scope = requiredText(payload.scope, 'scope');
    const selector = scope === 'record'
      ? { recordId: requiredText(payload.recordId ?? input.target.id, 'recordId') }
      : scope === 'source_partition'
        ? { sourceFamily: requiredText(payload.sourceFamily, 'sourceFamily'), sourcePartition: requiredText(payload.sourcePartition, 'sourcePartition') }
        : scope === 'episode'
          ? { episodeId: requiredText(payload.episodeId ?? input.target.id, 'episodeId') }
          : undefined;
    if (!selector) throw invalidPayload('Evidence replay scope must be record, source_partition or episode.');
    return { method: input.operation.method, path: input.operation.path, body: { scope, ...selector, reason: requiredText(input.reason, 'reason') }, responseKind: 'operation' };
  }
  if (operationId === 'reconcileEvidenceCoverage') {
    return {
      method: input.operation.method,
      path: input.operation.path,
      body: { ...(input.payload?.episodeId ? { episodeId: requiredText(input.payload.episodeId, 'episodeId') } : {}), reason: requiredText(input.reason, 'reason') },
      responseKind: 'operation',
    };
  }
  return {
    method: input.operation.method,
    path: input.operation.path,
    body: { reason: requiredText(input.reason, 'reason'), ...(input.expectedRevision === undefined ? {} : { expectedRevision: input.expectedRevision }) },
    responseKind: 'operation',
  };
}

function configurationIdentity(input: CommandInput) {
  const separator = input.target.id.lastIndexOf('@');
  const configurationId = separator < 0 ? input.target.id : input.target.id.slice(0, separator);
  const revisionText = separator < 0 ? undefined : input.target.id.slice(separator + 1);
  const revision = input.target.revision ?? (revisionText === undefined ? undefined : Number(revisionText));
  if (!configurationId || typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 1) {
    throw invalidPayload('A Configuration command requires configurationId and a positive revision.');
  }
  return { configurationId, revision };
}

async function configurationDraft(input: CommandInput) {
  const payload = input.payload ?? {};
  const content = jsonContent(payload.content);
  const revision = positiveInteger(payload.revision, typeof input.target.revision === 'number' ? input.target.revision : 1, 'revision');
  const checksum = typeof payload.checksum === 'string' && /^[a-f0-9]{64}$/u.test(payload.checksum)
    ? payload.checksum
    : await sha256(canonicalJson(content));
  return {
    configurationId: requiredText(payload.configurationId ?? input.target.id, 'configurationId'),
    targetType: requiredText(payload.targetType, 'targetType'),
    targetId: requiredText(payload.targetId, 'targetId'),
    revision,
    status: 'draft',
    applyMode: requiredText(payload.applyMode, 'applyMode'),
    content,
    checksum,
    createdBy: requiredText(payload.createdBy ?? 'sdar-node-control-console', 'createdBy'),
    createdAt: typeof payload.createdAt === 'string' && Number.isFinite(Date.parse(payload.createdAt))
      ? payload.createdAt
      : new Date().toISOString(),
  };
}

function jsonContent(value: unknown): unknown {
  if (typeof value !== 'string') return value ?? {};
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw invalidPayload('Configuration content must be valid JSON.');
  }
}

function jsonValue(value: unknown, field: string): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw invalidPayload(`${field} must be valid JSON.`);
  }
}

function jsonObject(value: unknown, field: string): Record<string, unknown> {
  const parsed = jsonValue(value, field);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw invalidPayload(`${field} must be a JSON object.`);
  return parsed as Record<string, unknown>;
}

function jsonObjectArray(value: unknown, field: string, required = false): Record<string, unknown>[] {
  if (value === undefined || value === '') {
    if (required) throw invalidPayload(`${field} must contain at least one JSON object.`);
    return [];
  }
  const parsed = jsonValue(value, field);
  if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item !== 'object' || Array.isArray(item)) || (required && parsed.length === 0)) {
    throw invalidPayload(`${field} must be an array of JSON objects${required ? ' with at least one entry' : ''}.`);
  }
  return parsed as Record<string, unknown>[];
}

function textArray(value: unknown): string[] {
  if (value === undefined || value === '') return [];
  const values = Array.isArray(value) ? value : String(value).split(',');
  return values.map((item) => requiredText(item, 'list item'));
}

function versionedIdentity(input: CommandInput, label: string) {
  const separator = input.target.id.lastIndexOf('@');
  const resourceId = separator < 0 ? input.target.id : input.target.id.slice(0, separator);
  const version = positiveInteger(input.target.revision, separator < 0 ? Number.NaN : Number(input.target.id.slice(separator + 1)), 'version');
  if (!resourceId) throw invalidPayload(`${label} command requires an exact resource identity.`);
  return { resourceId, version };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(',')}}`;
}

async function sha256(value: string) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function positiveInteger(value: unknown, fallback: number, field: string) {
  const candidate = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isSafeInteger(candidate) || candidate < 1) throw invalidPayload(`${field} must be a positive integer.`);
  return candidate;
}

function optionalPositiveInteger(value: unknown, field: string) {
  if (value === undefined || value === '') return undefined;
  return positiveInteger(value, Number.NaN, field);
}

function nonNegativeInteger(value: unknown, fallback: number, field: string) {
  const candidate = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isSafeInteger(candidate) || candidate < 0) throw invalidPayload(`${field} must be a non-negative integer.`);
  return candidate;
}

function requiredText(value: unknown, field: string) {
  if (typeof value !== 'string' && typeof value !== 'number') throw invalidPayload(`${field} is required.`);
  const result = String(value).trim();
  if (!result) throw invalidPayload(`${field} is required.`);
  return result;
}

function invalidPayload(detail: string) {
  return new ConsoleError({
    status: 422,
    code: 'CONSOLE_COMMAND_PAYLOAD_INVALID',
    title: 'Command payload is invalid',
    detail,
    correlationId: 'console-local',
    retryable: false,
  });
}
