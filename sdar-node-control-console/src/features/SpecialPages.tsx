import { useMemo, useState } from 'react';
import { Activity, ArrowLeft, CheckCircle2, Download, Link2, LockKeyhole, Radio, RefreshCcw, ServerCog, ShieldCheck, Wifi } from '../components/icons';
import { CONTRACT_OPERATIONS, CONTRACT_STATUS, CONTRACT_VERSION, OPENAPI_SHA256 } from '../api/generated/contract';
import type { RecordKind, RoleId, Scope } from '../domain';
import { navigate } from '../routes';
import { ROLE_LABELS, ROLE_SCOPES, canInvoke, operationLabel, requiredScope } from '../gateways/operationPolicy';
import { getOperation, useConsole, useGatewaySnapshot, useRecord } from '../state/ConsoleState';
import { Badge, Button, Callout, DefinitionList, EmptyState, JsonViewer, MetricCard, OperationAction, Panel, SearchField, SelectField, Tabs, formatTime } from '../components/ui';
import { DetailPage } from './DetailPage';

export function TaskDetailPage({ id }: { id: string }) {
  const query = useRecord('task', id);
  const [tab, setTab] = useState('overview');
  if (!query.data) return <DetailPage kind="task" id={id} />;
  const task = query.data;
  const controlled = Array.isArray(task.fields.controlledActions) ? task.fields.controlledActions as string[] : [];
  return <div className="page-stack"><section className="detail-hero"><div className="detail-title"><Button variant="ghost" onClick={() => navigate('/tasks')}><ArrowLeft size={15} />返回</Button><span className="eyebrow">Runtime task projection · {task.id}</span><div><h2>{task.name}</h2><Badge value={task.status} /></div><p>{task.summary}</p><div className="hero-meta"><span>Phase <strong>{String(task.fields.phase)}</strong></span><span>Updated <strong>{formatTime(task.updatedAt)}</strong></span></div></div><div className="hero-actions">{controlled.includes('pause') && <OperationAction operationId="pauseTask" target={{ type: 'task', id: task.id }} />}{controlled.includes('resume') && <OperationAction operationId="resumeTask" target={{ type: 'task', id: task.id }} variant="primary" />}{controlled.includes('cancel') && <OperationAction operationId="cancelTask" target={{ type: 'task', id: task.id }} variant="danger" />}{controlled.includes('goal_patch') && <OperationAction operationId="submitTaskGoalPatch" target={{ type: 'task', id: task.id }} />}</div></section>
    <Callout title="Runtime Authority">任务 Phase 和执行事实由 Runtime 权威维护。控制台提交 Pause/Resume/Cancel/Goal Patch 请求，不直接写 Task 状态。</Callout>
    <Tabs active={tab} onChange={setTab} tabs={[{ id: 'overview', label: '任务投影' }, { id: 'binding', label: 'Capability Binding' }, { id: 'controls', label: '受控动作' }]} />
    {tab === 'overview' && <Panel title="任务投影"><DefinitionList fields={task.fields} /></Panel>}
    {tab === 'binding' && <TaskBindingPage id={id} embedded />}
    {tab === 'controls' && <Panel title="当前允许的控制动作"><div className="control-action-grid">{controlled.length ? controlled.map((action) => <article key={action}><ShieldCheck /><strong>{action}</strong><p>由 Runtime 投影声明，仍需 RBAC、Reason、幂等和 Operation 语义。</p></article>) : <EmptyState title="无可用控制动作" detail="任务已进入终态，冻结协议不允许继续控制。" />}</div></Panel>}
  </div>;
}

export function TaskBindingPage({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const { gatewayMode } = useConsole();
  const taskQuery = useRecord('task', id);
  const task = taskQuery.data;
  const liveBinding = task?.fields.capabilityBinding;
  const binding = liveBinding && typeof liveBinding === 'object' && !Array.isArray(liveBinding)
    ? liveBinding as Record<string, unknown>
    : task && gatewayMode === 'mock' ? {
    bindingId: String(task.fields.capabilityBindingId), taskId: task.id,
    requestedCapabilityId: task.name.includes('Weather') ? 'cap-weather-awareness' : 'cap-route-planning',
    capabilityVersion: task.name.includes('Weather') ? 2 : 1,
    exposureId: task.name.includes('Weather') ? 'exposure-weather' : 'exposure-route-plan', exposureVersion: task.name.includes('Weather') ? 2 : 3,
    inputSnapshot: { goalId: task.fields.goalId, contextId: task.fields.contextId },
    successCriteriaSnapshot: ['valid output', 'required evidence attached'], evidenceRequirementSnapshot: ['source_timestamp', 'execution_trace'],
    constraintSnapshot: { policyRevision: 12, budget: 'bounded' }, initialImplementationRefs: [String(task.fields.selectedSkillId)],
    providerPolicySnapshot: { route: 'route-planning', fallbackAllowed: true }, bindingHash: 'sha256:91e4…7ca0', boundAt: task.fields.createdAt ?? '2026-07-31T03:20:00.000Z',
  } : undefined;
  const body = !task || !binding ? <EmptyState title="Capability Binding 不可用" detail="未找到任务投影，无法组合不可变 Binding 视图。" /> : <><Callout title="接受时不可变" tone="warning">Capability Binding 在任务被接受时冻结。后续 Skill、Provider 或 Capability 变化不会重写该绑定。</Callout><div className="detail-grid"><Panel title="绑定身份"><DefinitionList fields={binding as never} /></Panel><Panel title="快照校验"><div className="binding-proof"><LockKeyhole /><strong>{String(binding.bindingHash ?? '')}</strong><p>该 Hash 覆盖输入、成功标准、证据、约束、实施引用和 Provider Policy 快照。</p></div></Panel></div><Panel title="完整 Binding DTO"><JsonViewer value={binding} label="TaskCapabilityBinding" /></Panel></>;
  if (embedded) return <>{body}</>;
  return <div className="page-stack"><section className="page-intro"><div><Button variant="ghost" onClick={() => navigate(`/tasks/${id}`)}><ArrowLeft size={15} />返回任务</Button><span className="eyebrow">GET /api/v1/tasks/{'{taskId}'}/capability-binding</span><h2>不可变 Capability Binding</h2><p>用于证明任务接受时实际绑定的能力定义和实施选择。</p></div></section>{body}</div>;
}

export function EvidenceExportPage({ edit = false }: { edit?: boolean }) {
  const snapshot = useGatewaySnapshot();
  const { execute, canInvoke } = useConsole();
  const [tab, setTab] = useState(edit ? 'edit' : 'overview');
  const [form, setForm] = useState({ endpointRef: String(snapshot.evidence.configuration.fields.endpointRef), credentialRef: String(snapshot.evidence.configuration.fields.credentialRef), sourceId: String(snapshot.evidence.configuration.fields.sourceId), applyMode: String(snapshot.evidence.configuration.fields.applyMode) });
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  const createOperation = getOperation('createEvidenceExportRevision');
  const submit = async () => { await execute({ operation: createOperation, target: { type: 'evidenceExport', id: snapshot.evidence.configuration.id, revision: Number(snapshot.evidence.configuration.revision) }, expectedRevision: Number(snapshot.evidence.configuration.revision), reason, idempotencyKey: `evidence-revision-${Date.now()}`, payload: { ...snapshot.evidence.configuration.fields, ...form } }); setDone(true); };
  return <div className="page-stack"><section className="detail-hero"><div className="detail-title"><span className="eyebrow">Evidence Export · sdar.evidence/v1</span><div><h2>Evidence Export</h2><Badge value={snapshot.evidence.status.status} /></div><p>配置 Canonical Evidence 出口和本地 Delivery State；不提供 Evidence Analytics、ClickHouse 或 Evaluation 查询代理。</p></div><div className="hero-actions"><OperationAction operationId="testEvidenceExportConnection" target={{ type: 'evidenceExport', id: snapshot.evidence.configuration.id, revision: Number(snapshot.evidence.configuration.revision) }} /><Button variant="primary" onClick={() => { setTab('edit'); if (!edit) navigate('/evidence-export/edit'); }}>创建 Revision</Button></div></section>
    <Callout title="Evidence 权威边界" tone="warning">控制台只管理 Export 配置、投递状态与恢复操作；Canonical Evidence 内容仍由正式 Evidence API 权威管理。</Callout>
    <div className="metric-grid four"><MetricCard label="出口状态" value={snapshot.evidence.status.status} detail={`Active Revision ${snapshot.evidence.status.activeRevision ?? '—'}`} tone="success" /><MetricCard label="Pending Records" value={snapshot.evidence.status.pendingRecords} detail={`Oldest ${formatTime(snapshot.evidence.status.oldestPendingAt ?? snapshot.evidence.status.observedAt)}`} /><MetricCard label="ACK Sequence" value={snapshot.evidence.status.lastAcknowledgedSequence ?? '—'} detail={snapshot.evidence.status.lastAcknowledgedAt ? formatTime(snapshot.evidence.status.lastAcknowledgedAt) : 'No ACK'} /><MetricCard label="Dead Letters" value={snapshot.evidence.status.deadLetterRecords} detail={`${snapshot.evidence.status.openProjectionIssues + snapshot.evidence.status.openQualityIssues} open issues`} tone="info" /></div>
    <Tabs active={tab} onChange={setTab} tabs={[{ id: 'overview', label: '配置与状态' }, { id: 'edit', label: 'Revision 草稿' }, { id: 'delivery', label: 'Delivery 语义' }]} />
    {tab === 'overview' && <div className="detail-grid"><Panel title="出口配置" className="span-2"><DefinitionList fields={snapshot.evidence.configuration.fields} /></Panel><Panel title="本地 Delivery State"><DefinitionList fields={snapshot.evidence.status as never} /></Panel></div>}
    {tab === 'edit' && <Panel title="创建 Evidence Export Revision" subtitle="Secret 只能使用 credentialRef。">{done ? <div className="completion-inline"><CheckCircle2 /><div><strong>Revision 草稿已创建</strong><p>下一步执行 Validate 和 Publish；Publish 后仍需 Runtime ACK。</p></div></div> : <><div className="form-grid"><label className="form-field full"><span>Endpoint Ref</span><input value={form.endpointRef} onChange={(event) => setForm({ ...form, endpointRef: event.target.value })} /></label><label className="form-field full"><span>Credential Ref</span><input value={form.credentialRef} onChange={(event) => setForm({ ...form, credentialRef: event.target.value })} /></label><label className="form-field"><span>Source ID</span><input value={form.sourceId} onChange={(event) => setForm({ ...form, sourceId: event.target.value })} /></label><label className="form-field"><span>Apply Mode</span><select value={form.applyMode} onChange={(event) => setForm({ ...form, applyMode: event.target.value })}><option>hot_reload</option><option>reconnect_required</option><option>restart_required</option></select></label><label className="form-field full"><span>变更原因</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label></div><div className="form-footer"><Button onClick={() => navigate('/evidence-export')}>取消</Button><Button variant="primary" disabled={!canInvoke(createOperation) || reason.trim().length < 5 || !form.credentialRef.startsWith('secret://')} onClick={submit}>创建 Revision</Button></div></>}</Panel>}
    {tab === 'delivery' && <Panel title="出口可靠性模型"><div className="timeline"><div className="complete"><span>1</span><div><strong>Runtime 产生 Canonical Evidence</strong><p>事实先进入事务 Outbox / WAL。</p></div></div><div className="complete"><span>2</span><div><strong>WAL fsync</strong><p>记录持久化完成后才允许向上游 ACK。</p></div></div><div><span>3</span><div><strong>批量投递与重试</strong><p>按 Batch、Retry、Redaction 与 CredentialRef 策略投递。</p></div></div><div><span>4</span><div><strong>组织平台独立消费</strong><p>SDAR Console 不提供 Evidence Analytics 查询。</p></div></div></div></Panel>}
  </div>;
}

export function EventsPage() {
  const snapshot = useGatewaySnapshot();
  const [connected, setConnected] = useState(true);
  return <div className="page-stack"><section className="page-intro"><div><span className="eyebrow">GET /api/v1/events · text/event-stream</span><h2>Node Event Stream</h2><p>节点事件用于提示 Aggregate 发生变化；消费者收到后应重新 GET 资源。</p></div><div className="stream-state"><span className={`health-orb ${connected ? 'healthy' : 'degraded'}`} /><strong>{connected ? 'SSE 已连接' : 'SSE 已断开'}</strong><Button variant="ghost" onClick={() => setConnected((value) => !value)}>{connected ? '断开模拟' : '重新连接'}</Button></div></section>
    <Callout title="Event is a hint">事件不是审计记录、遥测事实或资源完整快照。UI 只用它触发刷新和显示变化提示。</Callout>
    <Panel title="最近事件" subtitle={`${snapshot.nodeEvents.length} 条固定场景事件`} actions={<Button variant="ghost"><RefreshCcw size={15} />重新 GET 资源</Button>}><div className="event-stream">{snapshot.records.event.map((item) => <article key={item.id}><div className="event-rail"><span /><small>{formatTime(item.updatedAt)}</small></div><div className="event-card"><header><Radio size={16} /><strong>{item.name}</strong><Badge value={item.status} /></header><p>{item.summary}</p><div className="event-meta"><code>{String(item.fields.aggregateType)}:{String(item.fields.aggregateId)}@{String(item.fields.aggregateRevision)}</code><span>{String(item.fields.correlationId)}</span></div></div></article>)}</div></Panel>
  </div>;
}

export function AccessPage() {
  const { role, gatewayMode, securityClassification, setRole } = useConsole();
  const scopes = Array.from(new Set(Object.values(ROLE_SCOPES).flat())).sort() as Scope[];
  return <div className="page-stack"><section className="page-intro"><div><span className="eyebrow">Bearer / OIDC compatible</span><h2>RBAC 与安全边界</h2><p>角色和 Actor 从可信身份解析；控制台只模拟角色切换，不实现登录、Token 或 Session。</p></div>{gatewayMode === 'live' ? <div className="deployment-identity" aria-label="Active Deployment Identity"><span>Active Deployment Identity</span><strong>{ROLE_LABELS[role]}</strong><small>{securityClassification}</small></div> : <SelectField label="检查角色" value={role} onChange={(value) => setRole(value as RoleId)} options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))} />}</section>
    <Callout title="Fail Closed" tone="warning">未知角色、不合法 Scope、缺失 If-Match、幂等冲突、明文 Secret 或非 Loopback 未配置认证时必须拒绝。</Callout>
    <div className="metric-grid three"><MetricCard label="角色" value={Object.keys(ROLE_SCOPES).length} detail="冻结 RBAC Matrix" /><MetricCard label="Scopes" value={scopes.length} detail="读写能力边界" /><MetricCard label="Secret 明文" value="0" detail="仅 credentialRef" tone="success" /></div>
    <Panel title="角色 Scope Matrix"><div className="rbac-table"><div className="rbac-head"><span>Scope</span>{Object.keys(ROLE_SCOPES).map((item) => <span key={item}>{ROLE_LABELS[item as RoleId]}</span>)}</div>{scopes.map((scope) => <div className="rbac-row" key={scope}><strong>{scope}</strong>{Object.entries(ROLE_SCOPES).map(([roleId, roleScopes]) => <span key={roleId} className={roleScopes.includes(scope) ? 'allow' : 'deny'}>{roleScopes.includes(scope) ? '✓' : '—'}</span>)}</div>)}</div></Panel>
    <Panel title="Secret 展示策略"><div className="security-rules"><div><LockKeyhole /><strong>允许</strong><p>credentialRef、secretStatus、lastValidatedAt</p></div><div><ShieldCheck /><strong>禁止</strong><p>Token、Password、Private Key、完整 Connection String、Secret 文件路径</p></div><div><ServerCog /><strong>Runtime 内部</strong><p>独立 Service Credential，优先 mTLS；浏览器不可访问。</p></div></div></Panel>
  </div>;
}

export function ContractCoveragePage({ search = '' }: { search?: string }) {
  const { role } = useConsole();
  const [query, setQuery] = useState(search);
  const [tag, setTag] = useState('all');
  const tags = Array.from(new Set(CONTRACT_OPERATIONS.map((item) => item.tag)));
  const filtered = CONTRACT_OPERATIONS.filter((operation) => (tag === 'all' || operation.tag === tag) && `${operation.operationId} ${operation.path} ${operation.tag}`.toLowerCase().includes(query.toLowerCase()));
  const commandCount = CONTRACT_OPERATIONS.filter((item) => item.kind === 'command').length;
  return <div className="page-stack"><section className="page-intro"><div><span className="eyebrow">Frozen backend protocol baseline</span><h2>协议能力映射</h2><p>前端所有数据和命令均追溯至 Node Control API Operation；未引入 Runtime 内部 API 或 Telemetry Query。</p></div><Badge value="published" /></section>
    <div className="metric-grid four"><MetricCard label="Contract Version" value={CONTRACT_VERSION} detail={CONTRACT_STATUS} /><MetricCard label="Operations" value={CONTRACT_OPERATIONS.length} detail={`${commandCount} commands / ${CONTRACT_OPERATIONS.length - commandCount} queries`} /><MetricCard label="Tags" value={tags.length} detail="公开领域边界" /><MetricCard label="OpenAPI SHA" value={OPENAPI_SHA256.slice(0, 12)} detail="冻结文件 SHA-256" tone="info" /></div>
    <Panel title="Operation Traceability" actions={<div className="toolbar compact"><SearchField value={query} onChange={setQuery} placeholder="Operation ID 或路径" /><SelectField label="Tag" value={tag} onChange={setTag} options={[{ value: 'all', label: '全部 Tag' }, ...tags.map((item) => ({ value: item, label: item }))]} /></div>}><div className="operation-catalog">{filtered.map((operation) => <article key={operation.operationId}><div><Badge value={operation.kind === 'command' ? 'accepted' : 'info'} /><code>{operation.method}</code><strong>{operation.operationId}</strong></div><code>{operation.path}</code><span>{operation.tag}</span><span>{requiredScope(operation)}</span><span className={canInvoke(role, operation) ? 'allowed' : 'blocked'}>{canInvoke(role, operation) ? '当前角色允许' : '当前角色无 Scope'}</span></article>)}</div></Panel>
  </div>;
}

export function SystemStatePage({ kind }: { kind: '403' | '500' | 'maintenance' | '404' }) {
  const content = {
    '403': { title: '访问被拒绝', detail: '当前角色缺少访问该资源所需的 Scope。控制台不会自动提升权限。', action: '/access' },
    '500': { title: '节点控制服务错误', detail: '服务返回不可恢复错误。请记录 Correlation ID 并查看 Management Operation 或 Audit。', action: '/operations' },
    maintenance: { title: '控制后台维护中', detail: 'Runtime 保持独立运行；控制台不可用不会导致 Runtime 停止。', action: '/node/health' },
    '404': { title: '页面不存在', detail: '该路由不属于当前单节点控制台，或资源路径参数无效。', action: '/overview' },
  }[kind];
  return <div className="system-state"><div className="state-code">{kind === 'maintenance' ? 'M' : kind}</div><h2>{content.title}</h2><p>{content.detail}</p><Button variant="primary" onClick={() => navigate(content.action)}>恢复导航</Button></div>;
}

export function CapabilityImplementationsPage({ id, version }: { id: string; version: string }) {
  const { gatewayMode } = useConsole();
  const capabilityId = `${id}@${version}`;
  const query = useRecord('capability', capabilityId);
  const liveBindings = query.data?.fields.implementationBindings;
  const bindings = Array.isArray(liveBindings) ? liveBindings : gatewayMode === 'mock' ? [
    { bindingId: 'impl-route-skill-primary', implementationType: 'skill', implementationId: 'skill-route-plan', implementationVersion: '2.4.0', role: 'primary', priority: 10, status: 'active', revision: 4 },
    { bindingId: 'impl-route-plan-alternative', implementationType: 'plan_template', implementationId: 'plan-urban-delivery', implementationVersion: '3.1.0', role: 'alternative', priority: 20, status: 'active', revision: 2 },
  ] : [];
  if (!query.data) return <EmptyState title="Capability 不存在" detail={`未找到 ${capabilityId}`} action={<Button onClick={() => navigate('/capabilities')}>返回 Capability</Button>} />;
  return <div className="page-stack"><section className="page-intro"><div><Button variant="ghost" onClick={() => navigate(`/capabilities/${id}/${version}`)}><ArrowLeft size={15} />返回 Capability</Button><span className="eyebrow">Capability implementation bindings</span><h2>{query.data.name} · 实施绑定</h2><p>Skill 与 Plan Template 作为 Capability 的可选择实施，不改变 Capability 定义权威。</p></div><OperationAction operationId="createCapabilityImplementation" target={{ type: 'capability', id: capabilityId, revision: Number(query.data.revision ?? 1) }} label="添加实施绑定" /></section><Callout title="绑定语义">每个绑定具有角色、优先级、激活条件和 Provider Policy Override。Runtime Readiness 根据绑定和 Provider 状态计算。</Callout><Panel title="当前实施绑定"><div className="implementation-grid">{bindings.map((binding) => <article key={binding.bindingId}><header><Badge value={binding.status} /><strong>{binding.role}</strong><span>Priority {binding.priority}</span></header><h3>{binding.implementationId}@{binding.implementationVersion}</h3><p>{binding.implementationType === 'skill' ? '不可变 Skill 版本' : '受治理 Plan Template 版本'}</p><small>Binding Revision {binding.revision}</small></article>)}</div></Panel><Panel title="Implementation Binding DTO"><JsonViewer value={bindings} label="CapabilityImplementationBinding[]" /></Panel></div>;
}
