import type { RecordKind } from './domain';

export interface RouteMatch {
  id: string;
  path: string;
  title: string;
  section: string;
  params: Record<string, string>;
  query: URLSearchParams;
  kind?: RecordKind;
}

interface RouteDefinition {
  id: string;
  pattern: string;
  title: string;
  section: string;
  kind?: RecordKind;
}

export const ROUTE_DEFINITIONS: RouteDefinition[] = [
  { id: 'overview', pattern: '/', title: '节点总览', section: '总览' },
  { id: 'overview', pattern: '/overview', title: '节点总览', section: '总览' },
  { id: 'node', pattern: '/node', title: '节点档案', section: '节点' },
  { id: 'node-edit', pattern: '/node/edit', title: '编辑节点草稿', section: '节点' },
  { id: 'node-health', pattern: '/node/health', title: '节点健康', section: '节点' },
  { id: 'collection', pattern: '/configuration', title: '配置 Revision', section: '配置与模型', kind: 'configuration' },
  { id: 'create', pattern: '/configuration/new', title: '创建配置 Revision', section: '配置与模型', kind: 'configuration' },
  { id: 'detail', pattern: '/configuration/:id/:revision', title: '配置 Revision 详情', section: '配置与模型', kind: 'configuration' },
  { id: 'collection', pattern: '/llm/providers', title: 'LLM Provider', section: '配置与模型', kind: 'llmProvider' },
  { id: 'create', pattern: '/llm/providers/new', title: '创建 LLM Provider', section: '配置与模型', kind: 'llmProvider' },
  { id: 'detail', pattern: '/llm/providers/:id', title: 'LLM Provider 详情', section: '配置与模型', kind: 'llmProvider' },
  { id: 'collection', pattern: '/llm/routes', title: '模型路由', section: '配置与模型', kind: 'modelRoute' },
  { id: 'create', pattern: '/llm/routes/new', title: '创建模型路由', section: '配置与模型', kind: 'modelRoute' },
  { id: 'detail', pattern: '/llm/routes/:id', title: '模型路由详情', section: '配置与模型', kind: 'modelRoute' },
  { id: 'collection', pattern: '/smpp/sources', title: 'SMPP Registry Source', section: 'Provider 供给', kind: 'smppSource' },
  { id: 'create', pattern: '/smpp/sources/new', title: '创建 SMPP Source', section: 'Provider 供给', kind: 'smppSource' },
  { id: 'detail', pattern: '/smpp/sources/:id', title: 'SMPP Source 详情', section: 'Provider 供给', kind: 'smppSource' },
  { id: 'collection', pattern: '/mcp/candidates', title: 'MCP Provider 候选', section: 'Provider 供给', kind: 'mcpCandidate' },
  { id: 'detail', pattern: '/mcp/candidates/:id', title: 'MCP Provider 候选详情', section: 'Provider 供给', kind: 'mcpCandidate' },
  { id: 'collection', pattern: '/mcp/bindings', title: 'MCP Provider Binding', section: 'Provider 供给', kind: 'mcpBinding' },
  { id: 'detail', pattern: '/mcp/bindings/:id', title: 'MCP Binding 详情', section: 'Provider 供给', kind: 'mcpBinding' },
  { id: 'collection', pattern: '/skills', title: 'Skill 注册表', section: '能力治理', kind: 'skill' },
  { id: 'create', pattern: '/skills/import', title: '导入 Skill Package', section: '能力治理', kind: 'skill' },
  { id: 'skill-versions', pattern: '/skills/:id/versions', title: 'Skill 版本', section: '能力治理', kind: 'skill' },
  { id: 'detail', pattern: '/skills/:id/versions/:version', title: 'Skill 版本详情', section: '能力治理', kind: 'skill' },
  { id: 'collection', pattern: '/plans', title: 'Plan Template', section: '能力治理', kind: 'planTemplate' },
  { id: 'plan-versions', pattern: '/plans/:id/versions', title: 'Plan Template 版本', section: '能力治理', kind: 'planTemplate' },
  { id: 'detail', pattern: '/plans/:id/versions/:version', title: 'Plan Template 详情', section: '能力治理', kind: 'planTemplate' },
  { id: 'collection', pattern: '/capabilities', title: 'Node Capability', section: '能力治理', kind: 'capability' },
  { id: 'create', pattern: '/capabilities/new', title: '创建 Capability 草稿', section: '能力治理', kind: 'capability' },
  { id: 'detail', pattern: '/capabilities/:id/:version', title: 'Capability 详情', section: '能力治理', kind: 'capability' },
  { id: 'implementations', pattern: '/capabilities/:id/:version/implementations', title: 'Capability 实施绑定', section: '能力治理', kind: 'capability' },
  { id: 'collection', pattern: '/readiness', title: 'Capability Readiness', section: '能力治理', kind: 'readiness' },
  { id: 'detail', pattern: '/readiness/:id/:version', title: 'Readiness 详情', section: '能力治理', kind: 'readiness' },
  { id: 'collection', pattern: '/a2a/exposures', title: 'A2A Capability Exposure', section: 'A2A' , kind: 'a2aExposure' },
  { id: 'create', pattern: '/a2a/exposures/new', title: '创建 A2A 暴露', section: 'A2A', kind: 'a2aExposure' },
  { id: 'detail', pattern: '/a2a/exposures/:id/:version', title: 'A2A 暴露详情', section: 'A2A', kind: 'a2aExposure' },
  { id: 'collection', pattern: '/a2a/agent-card', title: 'Agent Card Revision', section: 'A2A', kind: 'agentCard' },
  { id: 'detail', pattern: '/a2a/agent-card/:id', title: 'Agent Card 详情', section: 'A2A', kind: 'agentCard' },
  { id: 'collection', pattern: '/tasks', title: '运行任务', section: 'Runtime', kind: 'task' },
  { id: 'task-detail', pattern: '/tasks/:id', title: '任务详情', section: 'Runtime', kind: 'task' },
  { id: 'task-binding', pattern: '/tasks/:id/binding', title: '不可变 Capability Binding', section: 'Runtime', kind: 'task' },
  { id: 'evidence-export', pattern: '/evidence-export', title: 'Evidence Export', section: 'Runtime' },
  { id: 'evidence-export-edit', pattern: '/evidence-export/edit', title: '编辑 Evidence Export Revision', section: 'Runtime' },
  { id: 'collection', pattern: '/operations', title: 'Management Operations', section: '运维审计', kind: 'operation' },
  { id: 'detail', pattern: '/operations/:id', title: 'Operation 详情', section: '运维审计', kind: 'operation' },
  { id: 'collection', pattern: '/audit', title: '审计事件', section: '运维审计', kind: 'audit' },
  { id: 'events', pattern: '/events', title: 'Node Event Stream', section: '运维审计', kind: 'event' },
  { id: 'access', pattern: '/access', title: 'RBAC 与安全边界', section: '系统' },
  { id: 'contract', pattern: '/contract', title: '冻结协议能力映射', section: '系统' },
  { id: 'state-403', pattern: '/403', title: '访问被拒绝', section: '系统' },
  { id: 'state-500', pattern: '/500', title: '服务错误', section: '系统' },
  { id: 'maintenance', pattern: '/maintenance', title: '维护模式', section: '系统' },
];

export function parseHash(hash: string): RouteMatch {
  const raw = hash.replace(/^#/, '') || '/overview';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = normalizePath(pathPart);
  for (const route of ROUTE_DEFINITIONS) {
    const match = matchPattern(route.pattern, path);
    if (match) return { ...route, path, params: match, query: new URLSearchParams(queryPart) };
  }
  return { id: 'not-found', path, title: '页面不存在', section: '系统', params: {}, query: new URLSearchParams(queryPart) };
}

function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const patternParts = normalizePath(pattern).split('/').filter(Boolean);
  const pathParts = normalizePath(path).split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const expected = patternParts[index];
    const actual = pathParts[index];
    if (expected.startsWith(':')) params[expected.slice(1)] = decodeURIComponent(actual);
    else if (expected !== actual) return null;
  }
  return params;
}

export function normalizePath(path: string) {
  if (!path || path === '/') return '/';
  return `/${path.split('/').filter(Boolean).join('/')}`;
}

export function navigate(path: string) {
  window.location.hash = normalizePath(path);
}
