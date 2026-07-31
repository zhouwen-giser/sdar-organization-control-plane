import { useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, RefreshCcw } from '../components/icons';
import type { RecordKind } from '../domain';
import { navigate } from '../routes';
import { useRecord } from '../state/ConsoleState';
import { Badge, Button, Callout, DefinitionList, EmptyState, ErrorState, JsonViewer, OperationAction, Panel, SkeletonRows, Tabs, formatTime } from '../components/ui';
import { RESOURCE_CONFIG } from './resourceConfig';

export function DetailPage({ kind, id }: { kind: RecordKind; id: string }) {
  const config = RESOURCE_CONFIG[kind];
  const query = useRecord(kind, id);
  const [tab, setTab] = useState('overview');
  const record = query.data;
  const targetType = kind === 'task' ? 'task' : kind;
  const actionIds = useMemo(() => actionsForRecord(kind, record?.status, config.actions), [kind, record?.status, config.actions]);

  if (query.loading) return <Panel><SkeletonRows count={7} /></Panel>;
  if (query.error) return <ErrorState error={query.error} onRetry={query.refresh} />;
  if (!record) return <EmptyState title={`${config.singular} 不存在`} detail={`未找到 ID 为 ${id} 的资源。它可能已被移除，或当前列表 Cache 不包含该对象。`} action={<Button onClick={() => navigate(config.listPath)}><ArrowLeft size={15} />返回列表</Button>} />;

  return <div className="page-stack">
    <section className="detail-hero"><div className="detail-title"><Button variant="ghost" onClick={() => navigate(config.listPath)}><ArrowLeft size={15} />返回</Button><span className="eyebrow">{config.singular} · {record.id}</span><div><h2>{record.name}</h2><Badge value={record.status} /></div><p>{record.summary}</p><div className="hero-meta"><span>Revision <strong>{record.revision ?? 'N/A'}</strong></span><span>更新时间 <strong>{formatTime(record.updatedAt)}</strong></span>{record.tags?.map((tag) => <span className="soft-tag" key={tag}>{tag}</span>)}</div></div><div className="hero-actions"><Button variant="ghost" loading={query.refreshing} onClick={query.refresh}><RefreshCcw size={15} />刷新</Button>{actionIds.slice(0, 4).map((operationId, index) => <OperationAction key={operationId} operationId={operationId} target={{ type: targetType, id: record.id, revision: typeof record.revision === 'number' ? record.revision : undefined }} variant={index === 0 ? 'primary' : operationId.match(/remove|retire|cancel/i) ? 'danger' : 'secondary'} />)}</div></section>
    <Callout title="产品边界">{config.boundary}</Callout>
    {config.highRiskNote && <Callout title="变更影响" tone="warning">{config.highRiskNote}</Callout>}
    <Tabs tabs={[{ id: 'overview', label: '概览' }, { id: 'relations', label: '关系与依赖' }, { id: 'contract', label: '合同 DTO' }, { id: 'activity', label: '变更语义' }]} active={tab} onChange={setTab} />
    {tab === 'overview' && <div className="detail-grid"><Panel title="关键字段" className="span-2"><DefinitionList fields={record.fields} /></Panel><Panel title="状态解释"><StatusNarrative kind={kind} status={record.status} /></Panel></div>}
    {tab === 'relations' && <Panel title="关系与依赖" subtitle="所有链接均通过 Node Control 资源或前端组合视图解析。">{record.relationRefs?.length ? <div className="relation-list">{record.relationRefs.map((relation) => <button key={`${relation.label}-${relation.value}`} onClick={() => relation.href && navigate(relation.href)}><span>{relation.label}</span><strong>{relation.value}</strong>{relation.href && <ExternalLink size={14} />}</button>)}</div> : <EmptyState title="没有显式关系" detail="冻结对象未提供该资源的直接关系字段；控制台不会猜测后端关联。" />}</Panel>}
    {tab === 'contract' && <Panel title="Contract DTO 投影视图" subtitle="页面使用 ViewModel；该面板用于检查底层冻结字段。"><JsonViewer value={{ id: record.id, status: record.status, revision: record.revision, ...record.fields }} label={`${config.singular} DTO`} /></Panel>}
    {tab === 'activity' && <Panel title="Revision 与并发语义"><div className="timeline"><div className="complete"><span>1</span><div><strong>读取当前 Revision</strong><p>GET 结果是后续命令的并发基线。</p></div></div><div className="complete"><span>2</span><div><strong>提交 Reason 与 Idempotency Key</strong><p>所有写操作记录 Actor、Reason、输入 Hash 和幂等键 Hash。</p></div></div><div><span>3</span><div><strong>Operation / 新 Revision</strong><p>202 命令创建 Management Operation；同步创建返回新资源。</p></div></div><div><span>4</span><div><strong>重新 GET 权威状态</strong><p>Node Event 只提示变化，控制台必须刷新 GET 结果。</p></div></div></div></Panel>}
  </div>;
}

function actionsForRecord(kind: RecordKind, status: string | undefined, all: string[]) {
  if (!status) return all;
  if (kind === 'task') {
    if (status === 'running') return ['pauseTask', 'cancelTask', 'submitTaskGoalPatch'];
    if (status === 'paused') return ['resumeTask', 'cancelTask', 'submitTaskGoalPatch'];
    return [];
  }
  if (kind === 'operation') return ['accepted', 'running'].includes(status) ? all : [];
  return all;
}

function StatusNarrative({ kind, status }: { kind: RecordKind; status: string }) {
  const descriptions: Partial<Record<RecordKind, string>> = {
    configuration: 'Desired 与 Observed 的 Revision 必须收敛；Published 不等于 Runtime 已应用。',
    readiness: '该状态由 Runtime 计算并带有效期，Node Control 不直接修改。',
    task: 'Phase 来自 Runtime 任务投影，控制命令只能请求状态转换。',
    operation: 'Operation 是异步控制事实，终态为 succeeded、failed 或 canceled。',
    event: '事件只是变化提示，不能替代资源 GET。',
  };
  return <div className="status-narrative"><Badge value={status} /><p>{descriptions[kind] ?? '状态来自冻结领域对象，控制台不引入页面专用业务枚举。'}</p></div>;
}
