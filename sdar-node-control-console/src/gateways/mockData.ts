import type { GatewaySnapshot, ConsoleRecord, RecordKind } from '../domain';
import { mapContractResource } from '../mappers/recordMappers';
import type { NodeEventEnvelope } from '../api/generated/contract';

const NOW = '2026-07-31T06:30:00.000Z';
const AGO = {
  min4: '2026-07-31T06:26:00.000Z',
  min12: '2026-07-31T06:18:00.000Z',
  min27: '2026-07-31T06:03:00.000Z',
  hour2: '2026-07-31T04:30:00.000Z',
  day1: '2026-07-30T06:30:00.000Z',
  day3: '2026-07-28T06:30:00.000Z',
};

function record(
  id: string,
  name: string,
  status: string,
  summary: string,
  fields: ConsoleRecord['fields'],
  options: Partial<ConsoleRecord> = {},
): ConsoleRecord {
  return mapContractResource({
    id,
    name,
    status,
    summary,
    fields,
    updatedAt: options.updatedAt ?? AGO.min12,
    revision: options.revision,
    tags: options.tags,
    relationRefs: options.relationRefs,
  });
}

const configuration: ConsoleRecord[] = [
  record('node-defaults', '节点默认配置', 'applied', '节点级运行默认值，当前 Revision 已由 Runtime ACK。', {
    targetType: 'node', targetId: 'node-tokyo-01', applyMode: 'hot_reload', checksum: 'sha256:8d4c…12ef',
    desiredRevision: 12, observedRevision: 12, convergence: 'converged', createdBy: 'ops.yufen',
  }, { revision: 12, tags: ['node', 'hot_reload'], updatedAt: AGO.min4 }),
  record('runtime-policy', 'Runtime 执行策略', 'applying', '新 Revision 已发布，Runtime 正在进行 reconnect_required 应用。', {
    targetType: 'runtime', targetId: 'runtime-primary', applyMode: 'reconnect_required', checksum: 'sha256:b91a…7730',
    desiredRevision: 7, observedRevision: 6, convergence: 'progressing', createdBy: 'configuration.operator',
  }, { revision: 7, tags: ['runtime', 'reconnect_required'], updatedAt: AGO.min12 }),
  record('task-guardrails', '任务治理约束', 'validated', '候选配置已通过结构和业务规则校验，尚未发布。', {
    targetType: 'task_policy', targetId: 'global', applyMode: 'new_task_only', checksum: 'sha256:09ef…cf31',
    desiredRevision: 4, observedRevision: 3, convergence: 'pending_publish', createdBy: 'ops.yufen',
  }, { revision: 4, tags: ['task', 'new_task_only'], updatedAt: AGO.hour2 }),
];

const llmProvider: ConsoleRecord[] = [
  record('llm-openai-primary', 'OpenAI Primary', 'active', '生产主模型 Provider，凭据仅以 SecretRef 引用。', {
    providerType: 'openai-compatible', baseUrl: 'https://api.openai.com/v1', credentialRef: 'secret://llm/openai-primary',
    secretStatus: 'available', modelCount: 4, lastValidatedAt: AGO.min27, rateLimit: '1200 rpm',
  }, { revision: 8, tags: ['primary', 'production'] }),
  record('llm-local-fallback', 'Local Fallback', 'degraded', '本地兼容端点可用，但模型目录校验存在一个警告。', {
    providerType: 'openai-compatible', baseUrl: 'http://127.0.0.1:11434/v1', credentialRef: 'secret://llm/local-fallback',
    secretStatus: 'available', modelCount: 2, lastValidatedAt: AGO.hour2, warning: 'MODEL_CONTEXT_WINDOW_UNKNOWN',
  }, { revision: 3, tags: ['fallback', 'local'] }),
];

const modelRoute: ConsoleRecord[] = [
  record('route-planning', 'Planning Route', 'active', '规划阶段主路由，配置本地降级链路和预算上限。', {
    stage: 'planning', primary: 'llm-openai-primary:gpt-5.6', fallbacks: ['llm-local-fallback:qwen3'], budgetPolicy: 'medium',
  }, { revision: 5, tags: ['planning'] }),
  record('route-execution', 'Execution Route', 'draft', '执行阶段候选路由，尚未完成验证。', {
    stage: 'execution', primary: 'llm-openai-primary:gpt-5.6-mini', fallbacks: ['llm-local-fallback:qwen3'], budgetPolicy: 'low-latency',
  }, { revision: 2, tags: ['execution'] }),
];

const smppSource: ConsoleRecord[] = [
  record('smpp-main', 'SMPP Main Registry', 'active', '主 Registry Source，按计划同步并保留最后已知良好快照。', {
    registryEndpoint: 'https://smpp.internal.example/api/registry', credentialRef: 'secret://smpp/main', syncMode: 'scheduled',
    environment: 'production', activeSnapshotRevision: 184, activeSnapshotChecksum: 'sha256:f03d…b138', lastSyncAt: AGO.min27,
    lkgPolicy: 'retain_last_3', tenantId: 'tenant-sdar', projectId: 'provider-platform',
  }, { revision: 11, tags: ['production', 'scheduled'] }),
  record('smpp-lab', 'SMPP Lab Registry', 'degraded', '实验源最近同步失败，当前继续使用 LKG 快照。', {
    registryEndpoint: 'https://smpp-lab.internal.example/api/registry', credentialRef: 'secret://smpp/lab', syncMode: 'manual',
    environment: 'lab', activeSnapshotRevision: 29, activeSnapshotChecksum: 'sha256:7a71…2dd0', lastSyncAt: AGO.day1,
    lastErrorCode: 'SMPP_SOURCE_UNREACHABLE', lkgPolicy: 'retain_until_success',
  }, { revision: 6, tags: ['lab', 'lkg'] }),
];

const mcpCandidate: ConsoleRecord[] = [
  record('candidate-weather', 'Weather MCP Provider', 'ready', '来自 SMPP Main Registry 的可导入 Provider 候选。', {
    externalProviderId: 'provider-weather', externalServerId: 'weather-mcp', smppSourceId: 'smpp-main',
    registryRevision: 184, catalogChecksum: 'sha256:40a9…e712', operationCount: 6, compatibility: 'compatible',
  }, { tags: ['candidate', 'weather'] }),
  record('candidate-routing', 'Routing MCP Provider', 'review_required', '目录包含一个 Breaking Schema 变化，需要人工确认。', {
    externalProviderId: 'provider-routing', externalServerId: 'routing-mcp', smppSourceId: 'smpp-main',
    registryRevision: 184, catalogChecksum: 'sha256:71cc…a091', operationCount: 9, compatibility: 'breaking_change',
  }, { tags: ['candidate', 'routing', 'breaking'] }),
];

const mcpBinding: ConsoleRecord[] = [
  record('mcp-weather', 'Weather MCP Binding', 'active', '已导入并完成本地 Catalog Discovery。', {
    localServerId: 'weather-mcp-local', originType: 'smpp', smppSourceId: 'smpp-main', externalProviderId: 'provider-weather',
    catalogRevision: 12, catalogChecksum: 'sha256:40a9…e712', availabilityStatus: 'available', endpointRef: 'endpoint://mcp/weather',
  }, { revision: 12, tags: ['active', 'smpp'], relationRefs: [{ label: 'Source', value: 'SMPP Main Registry', href: '/smpp/sources/smpp-main' }] }),
  record('mcp-routing', 'Routing MCP Binding', 'suspended', '因目录不兼容而暂停，保留绑定证据和版本。', {
    localServerId: 'routing-mcp-local', originType: 'smpp', smppSourceId: 'smpp-main', externalProviderId: 'provider-routing',
    catalogRevision: 8, catalogChecksum: 'sha256:112c…996e', availabilityStatus: 'unavailable', endpointRef: 'endpoint://mcp/routing',
  }, { revision: 9, tags: ['suspended', 'breaking'] }),
];

const skill: ConsoleRecord[] = [
  record('skill-route-plan@2.4.0', 'Route Planning Skill 2.4.0', 'published', '根据目标、约束和地图上下文生成可执行路线计划。', {
    skillId: 'skill-route-plan', version: '2.4.0', checksum: 'sha256:779a…0c55', inputSchema: 'RoutePlanningInput',
    outputSchema: 'RoutePlan', evidencePolicy: 'route_validation', providerPolicy: 'mcp-routing preferred',
  }, { tags: ['routing', 'planning'], updatedAt: AGO.day1 }),
  record('skill-weather-check@1.3.2', 'Weather Check Skill 1.3.2', 'published', '查询目标区域天气并输出任务执行约束。', {
    skillId: 'skill-weather-check', version: '1.3.2', checksum: 'sha256:11de…a640', inputSchema: 'WeatherQuery',
    outputSchema: 'WeatherConstraint', evidencePolicy: 'source_timestamp', providerPolicy: 'mcp-weather required',
  }, { tags: ['weather', 'constraint'] }),
  record('skill-route-plan@2.5.0-rc1', 'Route Planning Skill 2.5.0-rc1', 'draft', '候选版本，加入动态禁行区约束。', {
    skillId: 'skill-route-plan', version: '2.5.0-rc1', checksum: 'sha256:c233…f870', inputSchema: 'RoutePlanningInputV2',
    outputSchema: 'RoutePlan', evidencePolicy: 'route_validation', providerPolicy: 'mcp-routing required',
  }, { tags: ['routing', 'candidate'] }),
];

const planTemplate: ConsoleRecord[] = [
  record('plan-urban-delivery@3.1.0', 'Urban Delivery Plan 3.1.0', 'active', '城市配送标准计划模板，绑定路线规划和天气约束能力。', {
    artifactId: 'plan-urban-delivery', version: '3.1.0', checksum: 'sha256:651e…4d29', validationSummary: 'passed', activePointer: true,
  }, { tags: ['delivery', 'active'] }),
  record('plan-emergency-response@1.8.0', 'Emergency Response Plan 1.8.0', 'draft', '应急响应候选模板，需要重新验证 Provider 可用性。', {
    artifactId: 'plan-emergency-response', version: '1.8.0', checksum: 'sha256:de77…530b', validationSummary: 'warning', activePointer: false,
  }, { tags: ['emergency', 'review'] }),
];

const capability: ConsoleRecord[] = [
  record('cap-route-planning@1', 'Route Planning Capability v1', 'published', '生成满足约束的路线计划，并提供验证证据。', {
    capabilityId: 'cap-route-planning', version: 1, domain: 'navigation', riskLevel: 'medium', definitionHash: 'sha256:42fd…998b',
    supportedModes: ['synchronous', 'long_running'], successCriteria: 'valid route with evidence', requiredEvidence: ['route_graph', 'constraint_check'],
  }, { tags: ['navigation', 'medium-risk'], relationRefs: [{ label: 'Primary Skill', value: 'Route Planning Skill 2.4.0', href: '/skills/skill-route-plan/versions/2.4.0' }] }),
  record('cap-weather-awareness@2', 'Weather Awareness Capability v2', 'published', '在任务规划和执行期间提供天气风险判定。', {
    capabilityId: 'cap-weather-awareness', version: 2, domain: 'situation-awareness', riskLevel: 'low', definitionHash: 'sha256:351d…ec08',
    supportedModes: ['synchronous'], successCriteria: 'fresh weather constraint', requiredEvidence: ['source_timestamp'],
  }, { tags: ['weather', 'low-risk'] }),
  record('cap-emergency-stop@1', 'Emergency Stop Capability v1', 'suspended', '高风险控制能力，因实施绑定不可用而暂停。', {
    capabilityId: 'cap-emergency-stop', version: 1, domain: 'safety', riskLevel: 'critical', definitionHash: 'sha256:b013…91ff',
    supportedModes: ['synchronous'], successCriteria: 'runtime stop acknowledgement', requiredEvidence: ['runtime_ack'],
  }, { tags: ['safety', 'critical'] }),
];

const readiness: ConsoleRecord[] = [
  record('cap-route-planning@1', 'Route Planning Readiness', 'degraded', '主 Skill 可用，但替代实现因 MCP Binding 暂停而不可用。', {
    capabilityId: 'cap-route-planning', capabilityVersion: 1, snapshotVersion: 34, validUntil: '2026-07-31T07:00:00.000Z',
    availableImplementations: ['skill-route-plan@2.4.0'], unavailableImplementations: ['plan-emergency-response@1.8.0'],
    reasons: ['ALTERNATIVE_IMPLEMENTATION_UNAVAILABLE'], catalogHash: 'sha256:4ab3…22d0', policyHash: 'sha256:799d…cc11',
  }, { revision: 34, tags: ['runtime-authoritative', 'degraded'], updatedAt: AGO.min4 }),
  record('cap-weather-awareness@2', 'Weather Awareness Readiness', 'available', '所有必需实施与 Provider 均可用。', {
    capabilityId: 'cap-weather-awareness', capabilityVersion: 2, snapshotVersion: 21, validUntil: '2026-07-31T07:00:00.000Z',
    availableImplementations: ['skill-weather-check@1.3.2'], unavailableImplementations: [], reasons: [],
    catalogHash: 'sha256:4ab3…22d0', policyHash: 'sha256:799d…cc11',
  }, { revision: 21, tags: ['runtime-authoritative', 'available'], updatedAt: AGO.min4 }),
  record('cap-emergency-stop@1', 'Emergency Stop Readiness', 'suspended', 'Capability 已暂停，不参与新任务绑定。', {
    capabilityId: 'cap-emergency-stop', capabilityVersion: 1, snapshotVersion: 9, validUntil: '2026-07-31T07:00:00.000Z',
    availableImplementations: [], unavailableImplementations: ['runtime-emergency-stop'], reasons: ['CAPABILITY_SUSPENDED'],
  }, { revision: 9, tags: ['runtime-authoritative', 'suspended'] }),
];

const a2aExposure: ConsoleRecord[] = [
  record('exposure-route-plan@3', 'A2A Route Planning v3', 'published', '向组织域暴露路线规划能力，发布状态包含 Readiness。', {
    exposureId: 'exposure-route-plan', version: 3, capabilityId: 'cap-route-planning', capabilityVersion: 1,
    agentSkillId: 'route_planning', visibility: 'organization', readinessPublicationPolicy: 'publish_degraded', exposureHash: 'sha256:f951…a0dd',
    inputModes: ['application/json'], outputModes: ['application/json'],
  }, { tags: ['organization', 'published'] }),
  record('exposure-weather@2', 'A2A Weather Awareness v2', 'published', '公开天气风险评估能力。', {
    exposureId: 'exposure-weather', version: 2, capabilityId: 'cap-weather-awareness', capabilityVersion: 2,
    agentSkillId: 'weather_awareness', visibility: 'public', readinessPublicationPolicy: 'publish_when_available', exposureHash: 'sha256:6a01…901c',
    inputModes: ['application/json', 'text/plain'], outputModes: ['application/json'],
  }, { tags: ['public', 'published'] }),
];

const agentCard: ConsoleRecord[] = [
  record('agent-card-18', 'Agent Card Revision 18', 'active', '当前对外生效的 Agent Card。', {
    revision: 18, nodeId: 'node-tokyo-01', exposureRefs: ['exposure-route-plan@3', 'exposure-weather@2'],
    contentHash: 'sha256:8b1a…20a9', capabilityCatalogHash: 'sha256:4ab3…22d0', generatedAt: AGO.day1, activatedAt: AGO.day1,
  }, { revision: 18, tags: ['active'] }),
  record('agent-card-19', 'Agent Card Revision 19', 'candidate', '包含最新 Readiness 状态的候选卡片。', {
    revision: 19, nodeId: 'node-tokyo-01', exposureRefs: ['exposure-route-plan@3', 'exposure-weather@2'],
    contentHash: 'sha256:88fa…0d72', capabilityCatalogHash: 'sha256:4ab3…22d0', generatedAt: AGO.min27,
  }, { revision: 19, tags: ['candidate'] }),
];

const task: ConsoleRecord[] = [
  record('task-20260731-1042', 'Tokyo Delivery Mission', 'running', '长时配送任务，Capability Binding 在接受时已冻结。', {
    taskId: 'task-20260731-1042', goalId: 'goal-delivery-77', planId: 'plan-urban-delivery@3.1.0', contextId: 'ctx-tokyo-west',
    phase: 'executing', selectedSkillId: 'skill-route-plan@2.4.0', capabilityBindingId: 'binding-task-1042', controlledActions: ['pause', 'cancel', 'goal_patch'],
  }, { tags: ['long-running', 'delivery'], updatedAt: AGO.min4, relationRefs: [{ label: 'Capability Binding', value: 'binding-task-1042', href: '/tasks/task-20260731-1042/binding' }] }),
  record('task-20260731-1038', 'Weather Constraint Check', 'completed', '天气约束检查已完成，结果由 Runtime 权威维护。', {
    taskId: 'task-20260731-1038', goalId: 'goal-weather-31', planId: 'plan-urban-delivery@3.1.0', contextId: 'ctx-tokyo-west',
    phase: 'completed', selectedSkillId: 'skill-weather-check@1.3.2', capabilityBindingId: 'binding-task-1038', controlledActions: [],
  }, { tags: ['weather', 'completed'], updatedAt: AGO.min27 }),
  record('task-20260731-1021', 'Emergency Route Replan', 'paused', '任务因 Provider 不可用而暂停，可提交 Goal Patch 或恢复。', {
    taskId: 'task-20260731-1021', goalId: 'goal-replan-19', planId: 'plan-emergency-response@1.8.0', contextId: 'ctx-shinjuku',
    phase: 'paused', selectedSkillId: 'skill-route-plan@2.4.0', capabilityBindingId: 'binding-task-1021', controlledActions: ['resume', 'cancel', 'goal_patch'],
  }, { tags: ['paused', 'recovery'], updatedAt: AGO.hour2 }),
];

const operation: ConsoleRecord[] = [
  record('op-sync-smpp-441', '同步 SMPP Main Registry', 'succeeded', 'Registry 快照同步并激活完成。', {
    operationType: 'syncSmppSource', target: 'smppSource:smpp-main', actorId: 'ops.yufen', reason: '刷新 Provider Catalog',
    idempotencyKeyHash: 'sha256:5bc9…20f1', inputHash: 'sha256:ed2a…11cd', startedAt: AGO.min27, completedAt: AGO.min27,
  }, { tags: ['SMPP', 'succeeded'], updatedAt: AGO.min27 }),
  record('op-publish-config-440', '发布 Runtime 执行策略', 'running', 'Configuration Revision 已发布，等待 Runtime ACK。', {
    operationType: 'publishConfigurationRevision', target: 'configuration:runtime-policy@7', actorId: 'configuration.operator', reason: '应用 reconnect 策略',
    idempotencyKeyHash: 'sha256:3fa1…e8b9', inputHash: 'sha256:b71d…88a0', startedAt: AGO.min12,
  }, { tags: ['Configuration', 'running'], updatedAt: AGO.min12 }),
  record('op-refresh-mcp-439', '刷新 Routing MCP Binding', 'failed', 'Catalog Discovery 返回 Breaking Change。', {
    operationType: 'refreshMcpProviderBinding', target: 'mcpBinding:mcp-routing', actorId: 'provider.operator', reason: '验证最新目录',
    errorCode: 'MCP_CATALOG_BREAKING_CHANGE', startedAt: AGO.hour2, completedAt: AGO.hour2,
  }, { tags: ['MCP', 'failed'], updatedAt: AGO.hour2 }),
];

const audit: ConsoleRecord[] = [
  record('audit-90012', 'CONFIGURATION_REVISION_PUBLISHED', 'success', 'Runtime 执行策略 Revision 7 已发布。', {
    actorId: 'configuration.operator', actorRole: 'configuration_operator', target: 'configuration:runtime-policy@7',
    correlationId: 'corr-config-7', operationId: 'op-publish-config-440', reason: '应用 reconnect 策略', result: 'accepted',
  }, { tags: ['Configuration', 'publish'], updatedAt: AGO.min12 }),
  record('audit-90011', 'MCP_BINDING_REFRESH_FAILED', 'failure', 'Routing MCP Binding 刷新失败。', {
    actorId: 'provider.operator', actorRole: 'provider_operator', target: 'mcpBinding:mcp-routing',
    correlationId: 'corr-mcp-439', operationId: 'op-refresh-mcp-439', reason: '验证最新目录', result: 'MCP_CATALOG_BREAKING_CHANGE',
  }, { tags: ['MCP', 'failure'], updatedAt: AGO.hour2 }),
  record('audit-90010', 'TASK_PAUSED', 'success', 'Emergency Route Replan 被运维人员暂停。', {
    actorId: 'task.operator', actorRole: 'task_operator', target: 'task:task-20260731-1021',
    correlationId: 'corr-task-1021', reason: '等待 Provider 恢复', result: 'accepted',
  }, { tags: ['Task', 'control'], updatedAt: AGO.hour2 }),
];

const event: ConsoleRecord[] = [
  record('evt-7103', 'configuration.revision.acknowledged', 'info', 'Runtime 已确认节点默认配置 Revision 12。', {
    eventType: 'configuration.revision.acknowledged', aggregateType: 'configuration', aggregateId: 'node-defaults', aggregateRevision: 12,
    correlationId: 'corr-config-12', dataClassification: 'internal', payloadSummary: 'status=applied',
  }, { tags: ['configuration', 'ack'], updatedAt: AGO.min4 }),
  record('evt-7102', 'capability.readiness.changed', 'warning', 'Route Planning Readiness 从 available 变为 degraded。', {
    eventType: 'capability.readiness.changed', aggregateType: 'capability', aggregateId: 'cap-route-planning', aggregateRevision: 34,
    correlationId: 'corr-ready-34', dataClassification: 'internal', payloadSummary: 'available → degraded',
  }, { tags: ['capability', 'readiness'], updatedAt: AGO.min12 }),
  record('evt-7101', 'task.phase.changed', 'info', 'Tokyo Delivery Mission 进入 executing。', {
    eventType: 'task.phase.changed', aggregateType: 'task', aggregateId: 'task-20260731-1042', aggregateRevision: 18,
    correlationId: 'corr-task-1042', dataClassification: 'internal', payloadSummary: 'planning → executing',
  }, { tags: ['task', 'phase'], updatedAt: AGO.min27 }),
];

const nodeEvents: NodeEventEnvelope[] = event.map((item, index) => ({
  eventId: item.id,
  eventType: String(item.fields.eventType),
  occurredAt: item.updatedAt,
  recordedAt: item.updatedAt,
  nodeId: 'node-tokyo-01',
  aggregateType: String(item.fields.aggregateType),
  aggregateId: String(item.fields.aggregateId),
  aggregateRevision: Number(item.fields.aggregateRevision),
  correlationId: String(item.fields.correlationId),
  actorId: index === 0 ? 'runtime-primary' : 'system',
  dataClassification: 'internal',
  payload: { summary: String(item.fields.payloadSummary) },
}));

export const healthySnapshot: GatewaySnapshot = {
  revision: 1,
  node: {
    profile: record('node-tokyo-01', 'SDAR Tokyo Node 01', 'active', '单节点 SDAR v1.4 控制平面。', {
      nodeId: 'node-tokyo-01', nodeType: 'sdar-runtime', environment: 'production', description: 'Tokyo single-node runtime',
      authorityScopes: ['node', 'configuration', 'capability', 'task'], runtimeEndpointRef: 'runtime://primary', telemetrySourceId: 'sdar-node-tokyo-01',
    }, { revision: 14, tags: ['production', 'single-node'], updatedAt: AGO.min4 }),
    health: {
      status: 'degraded', observedAt: NOW, activeTasks: 2,
      components: [
        { name: 'Node Control Backend', status: 'healthy', detail: 'API ready', latencyMs: 18 },
        { name: 'SDAR Runtime', status: 'healthy', detail: 'Runtime Contract 1.0.0', latencyMs: 23 },
        { name: 'MCP Catalog', status: 'degraded', detail: '1 binding suspended', latencyMs: 41 },
        { name: 'Evidence Export', status: 'healthy', detail: 'Canonical Evidence delivery current', latencyMs: 29 },
      ],
    },
    declaration: {
      schemaVersion: '1.0.0', nodeId: 'node-tokyo-01', nodeType: 'sdar-runtime', displayName: 'SDAR Tokyo Node 01', environment: 'production',
      nodeControlApi: { baseUrl: 'https://127.0.0.1:10080/api/v1', version: '1.0.0' },
      nodeEvents: { endpoint: '/api/v1/events', transport: 'sse' }, a2aAgentCard: { endpoint: '/.well-known/agent-card.json', revision: 18 },
      contractVersions: { nodeControl: '1.0.0', runtimeControl: '1.0.0', nodeEvents: '1.0.0', evidenceExport: 'sdar.evidence/v1' },
      features: ['capability_governance', 'a2a_exposure', 'evidence_export'],
    },
  },
  evidence: {
    configuration: record('evidence-export-primary', 'Evidence Export Primary', 'active', '管理 Canonical Evidence 出口与本地 Delivery State，不提供 Evidence 查询代理。', {
      exportId: 'evidence-export-primary', endpointRef: 'evidence://organization-platform/ingest', sourceId: 'sdar-node-tokyo-01', nodeId: 'node-tokyo-01',
      credentialRef: 'secret://evidence/export-primary', includedFamilies: ['runtime', 'skill', 'mcp_task', 'capability', 'evidence'],
      excludedDiagnosticTypes: [], batchPolicy: { maxRecords: 500, maxBytes: 1048576, flushIntervalMs: 2000 },
      retryPolicy: { baseDelayMs: 1000, maxDelayMs: 30000, maxAttempts: 10 }, outboxPolicy: { maxPendingRecords: 100000, retentionDays: 30 },
      redactionProfile: 'organization-default', artifactMode: 'reference', applyMode: 'hot_reload',
    }, { revision: 5, tags: ['production', 'WAL'] }),
    status: {
      status: 'healthy', activeRevision: 5, pendingRecords: 14, deadLetterRecords: 0, openProjectionIssues: 0,
      openQualityIssues: 0, highWatermarkActive: false, lastAcknowledgedSequence: '90071992547409931234',
      lastAcknowledgedAt: AGO.min4, oldestPendingAt: AGO.min4, observedAt: NOW,
    },
    operations: {
      outbox: [], sourceCheckpoints: [], projectionIssues: [], qualityIssues: [], deadLetters: [],
      hasMore: { outbox: false, sourceCheckpoints: false, projectionIssues: false, qualityIssues: false, deadLetters: false },
      loaded: true,
    },
  },
  records: {
    configuration, llmProvider, modelRoute, smppSource, mcpCandidate, mcpBinding, skill, planTemplate,
    capability, readiness, a2aExposure, agentCard, task, operation, audit, event,
  },
  nodeEvents,
  eventStream: { status: 'connected', reconnectAttempts: 0, lastEventId: nodeEvents[0]?.eventId },
};

export function cloneSnapshot(): GatewaySnapshot {
  return structuredClone(healthySnapshot);
}

export const recordKindOrder: RecordKind[] = [
  'configuration', 'llmProvider', 'modelRoute', 'smppSource', 'mcpCandidate', 'mcpBinding', 'skill',
  'planTemplate', 'capability', 'readiness', 'a2aExposure', 'agentCard', 'task', 'operation', 'audit', 'event',
];
