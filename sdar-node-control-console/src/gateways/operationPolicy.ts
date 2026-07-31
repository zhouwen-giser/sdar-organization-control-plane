import type { ContractOperation } from '../api/generated/contract';
import type { RoleId, Scope } from '../domain';

export const ROLE_SCOPES: Record<RoleId, readonly Scope[]> = {
  node_admin: [
    'a2a.manage', 'artifact.manage', 'audit.read', 'capability.manage', 'configuration.manage', 'events.read',
    'llm.manage', 'mcp.manage', 'node.read', 'node.write', 'operation.read', 'skill.manage', 'smpp.manage',
    'task.control', 'task.read', 'telemetry_export.manage',
  ],
  configuration_operator: ['configuration.manage', 'llm.manage', 'node.read', 'operation.read', 'telemetry_export.manage'],
  provider_operator: ['mcp.manage', 'node.read', 'operation.read', 'skill.manage', 'smpp.manage'],
  capability_operator: ['a2a.manage', 'artifact.read', 'capability.manage', 'node.read', 'operation.read', 'skill.read', 'task.read'],
  task_operator: ['node.read', 'operation.read', 'task.control', 'task.read'],
  auditor: ['audit.read', 'events.read', 'node.read', 'operation.read', 'task.read'],
  federation_reader: ['a2a.read', 'capability.read', 'events.read', 'node.read', 'operation.read', 'task.read'],
};

export const ROLE_LABELS: Record<RoleId, string> = {
  node_admin: '节点管理员',
  configuration_operator: '配置操作员',
  provider_operator: 'Provider 操作员',
  capability_operator: '能力治理员',
  task_operator: '任务操作员',
  auditor: '审计员',
  federation_reader: '组织读取方',
};

const readScopeByTag: Record<string, Scope> = {
  Discovery: 'node.read', Node: 'node.read', Configuration: 'configuration.manage', LLM: 'llm.manage',
  SMPP: 'smpp.manage', MCP: 'mcp.manage', Skills: 'skill.read', PlanTemplates: 'artifact.read',
  Capabilities: 'capability.read', A2A: 'a2a.read', Tasks: 'task.read', TelemetryExport: 'telemetry_export.manage',
  Operations: 'operation.read', Audit: 'audit.read', Events: 'events.read',
};

const manageScopeByTag: Record<string, Scope> = {
  Node: 'node.write', Configuration: 'configuration.manage', LLM: 'llm.manage', SMPP: 'smpp.manage', MCP: 'mcp.manage',
  Skills: 'skill.manage', PlanTemplates: 'artifact.manage', Capabilities: 'capability.manage', A2A: 'a2a.manage',
  Tasks: 'task.control', TelemetryExport: 'telemetry_export.manage', Operations: 'operation.read',
};

export function requiredScope(operation: ContractOperation): Scope {
  return operation.kind === 'query'
    ? readScopeByTag[operation.tag] ?? 'node.read'
    : manageScopeByTag[operation.tag] ?? 'node.write';
}

export function canInvoke(role: RoleId, operation: ContractOperation): boolean {
  return ROLE_SCOPES[role].includes(requiredScope(operation));
}

export function isHighRisk(operationId: string): boolean {
  return /publish|rollback|remove|retire|suspend|cancelTask|pauseTask|goalPatch|rebuildAgentCard/i.test(operationId);
}

export function operationLabel(operationId: string): string {
  const labels: Record<string, string> = {
    updateNodeProfileDraft: '更新节点草稿', validateNodeProfileDraft: '校验节点草稿', publishNodeProfileDraft: '发布节点配置',
    createConfigurationRevision: '创建配置 Revision', validateConfigurationRevision: '校验配置', publishConfigurationRevision: '发布配置', rollbackConfigurationRevision: '回滚配置',
    createLlmProviderDraft: '创建 LLM Provider', validateLlmProvider: '验证连接与模型目录', createModelRouteDraft: '创建模型路由',
    createSmppSourceDraft: '创建 SMPP Source', syncSmppSource: '同步 Registry 快照', importMcpProviderBinding: '导入 MCP Provider',
    refreshMcpProviderBinding: '刷新 MCP Binding', suspendMcpProviderBinding: '暂停 MCP Binding', removeMcpProviderBinding: '移除 MCP Binding',
    importSkillPackage: '导入 Skill 包', publishSkillVersion: '发布 Skill 版本', suspendSkillVersion: '暂停 Skill 版本', deprecateSkillVersion: '弃用 Skill 版本',
    publishPlanTemplateVersion: '发布 Plan Template', revalidatePlanTemplateVersion: '重新验证 Plan Template', suspendPlanTemplateVersion: '暂停 Plan Template',
    createNodeCapabilityDraft: '创建 Capability 草稿', validateNodeCapabilityVersion: '校验 Capability', publishNodeCapabilityVersion: '发布 Capability',
    suspendNodeCapabilityVersion: '暂停 Capability', deprecateNodeCapabilityVersion: '弃用 Capability', retireNodeCapabilityVersion: '退役 Capability',
    createCapabilityImplementation: '添加实施绑定', evaluateCapabilityReadiness: '请求 Runtime 重新评估',
    createA2aExposureDraft: '创建 A2A 暴露', publishA2aExposureVersion: '发布 A2A 暴露', suspendA2aExposureVersion: '暂停 A2A 暴露',
    retireA2aExposureVersion: '退役 A2A 暴露', rebuildAgentCardRevision: '重建 Agent Card',
    pauseTask: '暂停任务', resumeTask: '恢复任务', cancelTask: '取消任务', submitTaskGoalPatch: '提交 Goal Patch',
    createTelemetryExportRevision: '创建出口 Revision', validateTelemetryExportRevision: '校验出口配置', publishTelemetryExportRevision: '发布出口配置',
    testTelemetryExportConnection: '测试出口连接', cancelManagementOperation: '取消 Management Operation',
  };
  return labels[operationId] ?? operationId.replace(/([a-z])([A-Z])/g, '$1 $2');
}
