import type { RecordKind } from '../domain';

export interface ResourceConfig {
  title: string;
  singular: string;
  description: string;
  boundary: string;
  listPath: string;
  createPath?: string;
  detailPath(record: { id: string; revision?: number | string; fields: Record<string, unknown> }): string;
  columns: Array<{ key: string; label: string }>;
  metricLabels: [string, string, string];
  createOperationId?: string;
  actions: string[];
  highRiskNote?: string;
}

export const RESOURCE_CONFIG: Record<RecordKind, ResourceConfig> = {
  configuration: {
    title: '配置 Revision', singular: '配置 Revision', listPath: '/configuration', createPath: '/configuration/new',
    description: '按 Draft → Validate → Publish → Apply → Ack → Active/LKG 管理节点配置。',
    boundary: 'Publish 仅表示期望状态已发布；Runtime ACK 与 Observed State 才能证明应用。',
    detailPath: (record) => `/configuration/${record.id}/${record.revision ?? 1}`,
    columns: [{ key: 'name', label: '配置' }, { key: 'targetType', label: '目标类型' }, { key: 'applyMode', label: '应用模式' }, { key: 'status', label: '状态' }, { key: 'revision', label: 'Revision' }, { key: 'updatedAt', label: '更新时间' }],
    metricLabels: ['配置总数', '已收敛', '待应用'], createOperationId: 'createConfigurationRevision',
    actions: ['validateConfigurationRevision', 'publishConfigurationRevision', 'rollbackConfigurationRevision'], highRiskNote: '发布和回滚均要求 Expected Revision，并产生可审计 Operation。',
  },
  llmProvider: {
    title: 'LLM Provider', singular: 'LLM Provider', listPath: '/llm/providers', createPath: '/llm/providers/new',
    description: '管理模型 Provider 元数据、CredentialRef、模型目录和验证状态。', boundary: '前端不接收 Secret 明文，只保存 credentialRef 和 Secret 状态。',
    detailPath: (record) => `/llm/providers/${record.id}`,
    columns: [{ key: 'name', label: 'Provider' }, { key: 'providerType', label: '类型' }, { key: 'baseUrl', label: 'Base URL' }, { key: 'secretStatus', label: 'Secret' }, { key: 'status', label: '状态' }, { key: 'revision', label: 'Revision' }],
    metricLabels: ['Provider 总数', '活跃', '需关注'], createOperationId: 'createLlmProviderDraft', actions: ['validateLlmProvider'],
  },
  modelRoute: {
    title: '模型路由', singular: '模型路由', listPath: '/llm/routes', createPath: '/llm/routes/new',
    description: '按运行阶段配置主模型、Fallback 链和预算策略。', boundary: '路由只引用已治理 Provider 和模型，不在前端直接调用模型。',
    detailPath: (record) => `/llm/routes/${record.id}`,
    columns: [{ key: 'name', label: '路由' }, { key: 'stage', label: '阶段' }, { key: 'primary', label: '主模型' }, { key: 'budgetPolicy', label: '预算策略' }, { key: 'status', label: '状态' }, { key: 'revision', label: 'Revision' }],
    metricLabels: ['路由总数', '活跃', '草稿'], createOperationId: 'createModelRouteDraft', actions: [],
  },
  smppSource: {
    title: 'SMPP Registry Source', singular: 'SMPP Source', listPath: '/smpp/sources', createPath: '/smpp/sources/new',
    description: '治理外部 SMPP Registry Source、同步策略、快照和 LKG。', boundary: 'Source 仅提供 Registry 快照；同步失败时保留最后已知良好版本。',
    detailPath: (record) => `/smpp/sources/${record.id}`,
    columns: [{ key: 'name', label: 'Source' }, { key: 'environment', label: '环境' }, { key: 'syncMode', label: '同步模式' }, { key: 'activeSnapshotRevision', label: '快照 Revision' }, { key: 'status', label: '状态' }, { key: 'lastSyncAt', label: '最后同步' }],
    metricLabels: ['Source 总数', '正常', '使用 LKG'], createOperationId: 'createSmppSourceDraft', actions: ['syncSmppSource'],
  },
  mcpCandidate: {
    title: 'MCP Provider 候选', singular: 'MCP 候选', listPath: '/mcp/candidates',
    description: '从 SMPP Registry 快照读取可导入的 Provider 候选。', boundary: '候选不是本地 Binding；导入会触发 Discovery 并创建 Management Operation。',
    detailPath: (record) => `/mcp/candidates/${record.id}`,
    columns: [{ key: 'name', label: '候选 Provider' }, { key: 'smppSourceId', label: '来源' }, { key: 'registryRevision', label: 'Registry Revision' }, { key: 'operationCount', label: 'Operation 数' }, { key: 'compatibility', label: '兼容性' }, { key: 'status', label: '状态' }],
    metricLabels: ['候选总数', '可导入', '需评审'], actions: ['importMcpProviderBinding'],
  },
  mcpBinding: {
    title: 'MCP Provider Binding', singular: 'MCP Binding', listPath: '/mcp/bindings',
    description: '管理本地 MCP Server Binding、Catalog Revision 和 Availability。', boundary: 'Binding 不复制外部权威；本地保存来源、Catalog Checksum 和 LKG 证据。',
    detailPath: (record) => `/mcp/bindings/${record.id}`,
    columns: [{ key: 'name', label: 'Binding' }, { key: 'originType', label: '来源类型' }, { key: 'catalogRevision', label: 'Catalog Revision' }, { key: 'availabilityStatus', label: '可用性' }, { key: 'status', label: '状态' }, { key: 'revision', label: 'Revision' }],
    metricLabels: ['Binding 总数', '可用', '暂停/异常'], actions: ['refreshMcpProviderBinding', 'suspendMcpProviderBinding', 'removeMcpProviderBinding'], highRiskNote: '暂停和移除会影响依赖 Capability Readiness。',
  },
  skill: {
    title: 'Skill 注册表', singular: 'Skill 版本', listPath: '/skills', createPath: '/skills/import',
    description: '管理不可变 Skill 版本、Schema、Outcome、Evidence 和 Provider Policy。', boundary: 'A2A AgentSkill 不是内部 Skill；Skill 也不是 Capability 权威。',
    detailPath: (record) => { const [id, version] = record.id.split('@'); return `/skills/${id}/versions/${version}`; },
    columns: [{ key: 'name', label: 'Skill 版本' }, { key: 'skillId', label: 'Skill ID' }, { key: 'version', label: '版本' }, { key: 'checksum', label: 'Checksum' }, { key: 'status', label: '状态' }, { key: 'updatedAt', label: '更新时间' }],
    metricLabels: ['版本总数', '已发布', '候选/草稿'], createOperationId: 'importSkillPackage', actions: ['publishSkillVersion', 'suspendSkillVersion', 'deprecateSkillVersion'], highRiskNote: '发布后版本内容不可变；变更必须产生新版本。',
  },
  planTemplate: {
    title: 'Plan Template', singular: 'Plan Template 版本', listPath: '/plans',
    description: '治理可复用计划模板版本、校验状态和 Active Pointer。', boundary: '模板是受治理工件，不替代 Runtime 的动态 Planning 权威。',
    detailPath: (record) => { const [id, version] = record.id.split('@'); return `/plans/${id}/versions/${version}`; },
    columns: [{ key: 'name', label: 'Plan Template' }, { key: 'artifactId', label: 'Artifact ID' }, { key: 'version', label: '版本' }, { key: 'validationSummary', label: '校验' }, { key: 'status', label: '状态' }, { key: 'updatedAt', label: '更新时间' }],
    metricLabels: ['版本总数', 'Active', '待验证'], actions: ['publishPlanTemplateVersion', 'revalidatePlanTemplateVersion', 'suspendPlanTemplateVersion'],
  },
  capability: {
    title: 'Node Capability', singular: 'Capability 版本', listPath: '/capabilities', createPath: '/capabilities/new',
    description: '定义节点正式能力、成功标准、证据要求、风险和实施绑定。', boundary: 'Capability 是能力权威；Skill 与 Plan Template 仅作为实施。',
    detailPath: (record) => { const [id, version] = record.id.split('@'); return `/capabilities/${id}/${version}`; },
    columns: [{ key: 'name', label: 'Capability' }, { key: 'domain', label: '领域' }, { key: 'version', label: '版本' }, { key: 'riskLevel', label: '风险' }, { key: 'status', label: '状态' }, { key: 'updatedAt', label: '更新时间' }],
    metricLabels: ['能力版本', '已发布', '不可用/暂停'], createOperationId: 'createNodeCapabilityDraft',
    actions: ['validateNodeCapabilityVersion', 'publishNodeCapabilityVersion', 'suspendNodeCapabilityVersion', 'deprecateNodeCapabilityVersion', 'retireNodeCapabilityVersion'], highRiskNote: 'Capability 生命周期会影响新任务绑定和 A2A 暴露。',
  },
  readiness: {
    title: 'Capability Readiness', singular: 'Readiness Snapshot', listPath: '/readiness',
    description: '展示 Runtime 权威的 Capability 可用性快照与原因。', boundary: 'Readiness 由 Runtime 评估；Node Control 只能请求重新评估，不能直接写状态。',
    detailPath: (record) => { const [id, version] = record.id.split('@'); return `/readiness/${id}/${version}`; },
    columns: [{ key: 'name', label: 'Capability' }, { key: 'snapshotVersion', label: 'Snapshot' }, { key: 'availableImplementations', label: '可用实施' }, { key: 'validUntil', label: '有效期' }, { key: 'status', label: '状态' }, { key: 'updatedAt', label: '评估时间' }],
    metricLabels: ['快照总数', '可用', '降级/不可用'], actions: ['evaluateCapabilityReadiness'],
  },
  a2aExposure: {
    title: 'A2A Capability Exposure', singular: 'A2A 暴露版本', listPath: '/a2a/exposures', createPath: '/a2a/exposures/new',
    description: '将正式 Capability 映射为 A2A AgentSkill Exposure。', boundary: 'A2A 暴露引用 Capability；不会把内部 Skill 直接公开为 AgentSkill。',
    detailPath: (record) => { const [id, version] = record.id.split('@'); return `/a2a/exposures/${id}/${version}`; },
    columns: [{ key: 'name', label: 'A2A Exposure' }, { key: 'capabilityId', label: 'Capability' }, { key: 'visibility', label: '可见性' }, { key: 'readinessPublicationPolicy', label: 'Readiness 策略' }, { key: 'status', label: '状态' }, { key: 'revision', label: '版本' }],
    metricLabels: ['暴露版本', '已发布', '组织/公开'], createOperationId: 'createA2aExposureDraft', actions: ['publishA2aExposureVersion', 'suspendA2aExposureVersion', 'retireA2aExposureVersion'],
  },
  agentCard: {
    title: 'Agent Card Revision', singular: 'Agent Card', listPath: '/a2a/agent-card',
    description: '查看由 A2A 暴露和 Capability Catalog 构建的 Agent Card Revision。', boundary: 'Card 由收口流程构建；GET 是展示依据，Node Event 只提示变化。',
    detailPath: (record) => `/a2a/agent-card/${record.id}`,
    columns: [{ key: 'name', label: 'Revision' }, { key: 'revision', label: 'Revision' }, { key: 'contentHash', label: 'Content Hash' }, { key: 'capabilityCatalogHash', label: 'Catalog Hash' }, { key: 'status', label: '状态' }, { key: 'generatedAt', label: '生成时间' }],
    metricLabels: ['Revision 总数', 'Active', '候选'], actions: ['rebuildAgentCardRevision'],
  },
  task: {
    title: '运行任务', singular: '任务', listPath: '/tasks',
    description: '展示 Runtime 提供的有界任务投影，并执行受治理的控制命令。', boundary: '任务执行状态由 Runtime 权威维护；接受时 Capability Binding 不可变。',
    detailPath: (record) => `/tasks/${record.id}`,
    columns: [{ key: 'name', label: '任务' }, { key: 'phase', label: 'Phase' }, { key: 'selectedSkillId', label: '选中 Skill' }, { key: 'capabilityBindingId', label: 'Capability Binding' }, { key: 'status', label: '状态' }, { key: 'updatedAt', label: '更新时间' }],
    metricLabels: ['任务总数', '运行中', '需干预'], actions: ['pauseTask', 'resumeTask', 'cancelTask', 'submitTaskGoalPatch'], highRiskNote: 'Pause、Cancel 和 Goal Patch 均是受控请求，不直接修改 Runtime 数据库。',
  },
  operation: {
    title: 'Management Operations', singular: 'Management Operation', listPath: '/operations',
    description: '跟踪所有异步控制命令的接受、运行、成功、失败与取消。', boundary: 'Operation 保存 Actor、Reason、Idempotency Key Hash、输入 Hash、结果或错误。',
    detailPath: (record) => `/operations/${record.id}`,
    columns: [{ key: 'name', label: 'Operation' }, { key: 'operationType', label: '类型' }, { key: 'target', label: '目标' }, { key: 'actorId', label: 'Actor' }, { key: 'status', label: '状态' }, { key: 'updatedAt', label: '更新时间' }],
    metricLabels: ['Operation 总数', '运行/接受', '失败'], actions: ['cancelManagementOperation'],
  },
  audit: {
    title: '审计事件', singular: '审计事件', listPath: '/audit',
    description: '查询不可变的控制平面 Audit Event。', boundary: '审计记录只读；导出仅发生在浏览器，不创建后台 Export API。',
    detailPath: () => '/audit',
    columns: [{ key: 'name', label: '动作' }, { key: 'actorId', label: 'Actor' }, { key: 'target', label: '目标' }, { key: 'correlationId', label: 'Correlation ID' }, { key: 'status', label: '结果' }, { key: 'updatedAt', label: '时间' }],
    metricLabels: ['事件总数', '成功', '失败'], actions: [],
  },
  event: {
    title: 'Node Event Stream', singular: 'Node Event', listPath: '/events',
    description: '订阅节点变化提示；收到事件后必须重新 GET 权威资源。', boundary: 'Event 是 Hint，不是完整事实，也不是遥测时间线。',
    detailPath: () => '/events',
    columns: [{ key: 'name', label: 'Event Type' }, { key: 'aggregateType', label: 'Aggregate' }, { key: 'aggregateId', label: 'Aggregate ID' }, { key: 'aggregateRevision', label: 'Revision' }, { key: 'correlationId', label: 'Correlation ID' }, { key: 'updatedAt', label: '发生时间' }],
    metricLabels: ['事件提示', '配置/能力', '任务'], actions: [],
  },
};
