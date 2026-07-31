# Page Completion Matrix

| Route | Page | Domain | Classification | Required states | Required interactions | Status |
|---|---|---|---|---|---|---|
| `` |  |  | FROZEN_API | success, degraded/error recovery | domain-specific review, recovery navigation | COMPLETE |
| `/` | 节点总览 | 总览 | WEB_COMPOSED | success, degraded/error recovery | read-model navigation, scenario review | COMPLETE |
| `/overview` | 节点总览 | 总览 | WEB_COMPOSED | success, degraded/error recovery | read-model navigation, scenario review | COMPLETE |
| `/node` | 节点档案 | 节点 | FROZEN_API | success, degraded/error recovery | domain-specific review, recovery navigation | COMPLETE |
| `/node/edit` | 编辑节点草稿 | 节点 | FROZEN_API | ready, submitting, accepted/succeeded, failed, conflict | draft edit, reason, If-Match, submit | COMPLETE |
| `/node/health` | 节点健康 | 节点 | FROZEN_API | success, degraded/error recovery | read-model navigation, scenario review | COMPLETE |
| `/configuration` | 配置 Revision | 配置与模型 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/configuration/new` | 创建配置 Revision | 配置与模型 | FROZEN_API | ready, submitting, accepted/succeeded, failed, conflict | form validation, SecretRef validation, submit, result navigation | COMPLETE |
| `/configuration/:id/:revision` | 配置 Revision 详情 | 配置与模型 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | refresh, tabs, contract command, reason, revision conflict | COMPLETE |
| `/llm/providers` | LLM Provider | 配置与模型 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/llm/providers/new` | 创建 LLM Provider | 配置与模型 | FROZEN_API | ready, submitting, accepted/succeeded, failed, conflict | form validation, SecretRef validation, submit, result navigation | COMPLETE |
| `/llm/providers/:id` | LLM Provider 详情 | 配置与模型 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | refresh, tabs, contract command, reason, revision conflict | COMPLETE |
| `/llm/routes` | 模型路由 | 配置与模型 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/llm/routes/new` | 创建模型路由 | 配置与模型 | FROZEN_API | ready, submitting, accepted/succeeded, failed, conflict | form validation, SecretRef validation, submit, result navigation | COMPLETE |
| `/llm/routes/:id` | 模型路由详情 | 配置与模型 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | refresh, tabs, contract command, reason, revision conflict | COMPLETE |
| `/smpp/sources` | SMPP Registry Source | Provider 供给 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/smpp/sources/new` | 创建 SMPP Source | Provider 供给 | FROZEN_API | ready, submitting, accepted/succeeded, failed, conflict | form validation, SecretRef validation, submit, result navigation | COMPLETE |
| `/smpp/sources/:id` | SMPP Source 详情 | Provider 供给 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | refresh, tabs, contract command, reason, revision conflict | COMPLETE |
| `/mcp/candidates` | MCP Provider 候选 | Provider 供给 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/mcp/candidates/:id` | MCP Provider 候选详情 | Provider 供给 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | refresh, tabs, contract command, reason, revision conflict | COMPLETE |
| `/mcp/bindings` | MCP Provider Binding | Provider 供给 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/mcp/bindings/:id` | MCP Binding 详情 | Provider 供给 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | refresh, tabs, contract command, reason, revision conflict | COMPLETE |
| `/skills` | Skill 注册表 | 能力治理 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/skills/import` | 导入 Skill Package | 能力治理 | FROZEN_API | ready, submitting, accepted/succeeded, failed, conflict | form validation, SecretRef validation, submit, result navigation | COMPLETE |
| `/skills/:id/versions` | Skill 版本 | 能力治理 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/skills/:id/versions/:version` | Skill 版本详情 | 能力治理 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | refresh, tabs, contract command, reason, revision conflict | COMPLETE |
| `/plans` | Plan Template | 能力治理 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/plans/:id/versions` | Plan Template 版本 | 能力治理 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/plans/:id/versions/:version` | Plan Template 详情 | 能力治理 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | refresh, tabs, contract command, reason, revision conflict | COMPLETE |
| `/capabilities` | Node Capability | 能力治理 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/capabilities/new` | 创建 Capability 草稿 | 能力治理 | FROZEN_API | ready, submitting, accepted/succeeded, failed, conflict | form validation, SecretRef validation, submit, result navigation | COMPLETE |
| `/capabilities/:id/:version` | Capability 详情 | 能力治理 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | refresh, tabs, contract command, reason, revision conflict | COMPLETE |
| `/capabilities/:id/:version/implementations` | Capability 实施绑定 | 能力治理 | FROZEN_API | success, degraded/error recovery | domain-specific review, recovery navigation | COMPLETE |
| `/readiness` | Capability Readiness | 能力治理 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/readiness/:id/:version` | Readiness 详情 | 能力治理 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | refresh, tabs, contract command, reason, revision conflict | COMPLETE |
| `/a2a/exposures` | A2A Capability Exposure | A2A | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/a2a/exposures/new` | 创建 A2A 暴露 | A2A | FROZEN_API | ready, submitting, accepted/succeeded, failed, conflict | form validation, SecretRef validation, submit, result navigation | COMPLETE |
| `/a2a/exposures/:id/:version` | A2A 暴露详情 | A2A | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | refresh, tabs, contract command, reason, revision conflict | COMPLETE |
| `/a2a/agent-card` | Agent Card Revision | A2A | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/a2a/agent-card/:id` | Agent Card 详情 | A2A | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | refresh, tabs, contract command, reason, revision conflict | COMPLETE |
| `/tasks` | 运行任务 | Runtime | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/tasks/:id` | 任务详情 | Runtime | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | domain-specific review, recovery navigation | COMPLETE |
| `/tasks/:id/binding` | 不可变 Capability Binding | Runtime | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | domain-specific review, recovery navigation | COMPLETE |
| `/telemetry-export` | Telemetry Export | Runtime | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | domain-specific review, recovery navigation | COMPLETE |
| `/telemetry-export/edit` | 编辑 Telemetry Export Revision | Runtime | FROZEN_API | ready, submitting, accepted/succeeded, failed, conflict | draft edit, reason, If-Match, submit | COMPLETE |
| `/operations` | Management Operations | 运维审计 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/operations/:id` | Operation 详情 | 运维审计 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | refresh, tabs, contract command, reason, revision conflict | COMPLETE |
| `/audit` | 审计事件 | 运维审计 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | search, filter, refresh, deep-link | COMPLETE |
| `/events` | Node Event Stream | 运维审计 | FROZEN_API | loading, success, empty/not-found, error, refreshing/stale | domain-specific review, recovery navigation | COMPLETE |
| `/access` | RBAC 与安全边界 | 系统 | CLIENT_ONLY | success, degraded/error recovery | domain-specific review, recovery navigation | COMPLETE |
| `/contract` | 冻结协议能力映射 | 系统 | CLIENT_ONLY | success, degraded/error recovery | domain-specific review, recovery navigation | COMPLETE |
| `/403` | 访问被拒绝 | 系统 | CLIENT_ONLY | success, degraded/error recovery | domain-specific review, recovery navigation | COMPLETE |
| `/500` | 服务错误 | 系统 | CLIENT_ONLY | success, degraded/error recovery | domain-specific review, recovery navigation | COMPLETE |
| `/maintenance` | 维护模式 | 系统 | CLIENT_ONLY | success, degraded/error recovery | domain-specific review, recovery navigation | COMPLETE |
| `` |  |  | FROZEN_API | success, degraded/error recovery | domain-specific review, recovery navigation | COMPLETE |
