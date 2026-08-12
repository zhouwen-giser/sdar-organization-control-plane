import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Check, ChevronDown, CircleAlert, Copy, LoaderCircle, RefreshCcw, Search, X } from './icons';
import type { ContractOperation } from '../api/generated/contract';
import type { CommandInput, ConsoleErrorShape, ConsoleRecord, Tone } from '../domain';
import { getOperation, useConsole } from '../state/ConsoleState';
import { isHighRisk, operationLabel, requiredScope } from '../gateways/operationPolicy';

export function Button({
  children, variant = 'secondary', loading = false, disabled = false, title, onClick, type = 'button',
}: {
  children: ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; loading?: boolean; disabled?: boolean;
  title?: string; onClick?: () => void; type?: 'button' | 'submit';
}) {
  return <button className={`button ${variant}`} disabled={disabled || loading} title={title} onClick={onClick} type={type}>
    {loading && <LoaderCircle className="spin" size={15} aria-hidden="true" />}{children}
  </button>;
}

export function Badge({ value, tone }: { value: string; tone?: Tone }) {
  const resolved = tone ?? toneForStatus(value);
  return <span className={`badge ${resolved}`}><span className="badge-dot" />{humanStatus(value)}</span>;
}

export function Panel({ title, subtitle, actions, children, className = '' }: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>
    {(title || actions) && <header className="panel-header"><div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="panel-actions">{actions}</div>}</header>}
    <div className="panel-body">{children}</div>
  </section>;
}

export function MetricCard({ label, value, detail, tone = 'neutral', icon }: { label: string; value: string | number; detail: string; tone?: Tone; icon?: ReactNode }) {
  return <article className={`metric-card ${tone}`}><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

export function SearchField({ value, onChange, placeholder = '搜索 ID、名称或标签' }: { value: string; onChange(value: string): void; placeholder?: string }) {
  return <label className="search-field"><Search size={16} aria-hidden="true" /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

export function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange(value: string): void; options: Array<{ value: string; label: string }> }) {
  return <label className="select-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={14} /></label>;
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return <div className="skeleton-list" aria-label="正在加载">{Array.from({ length: count }).map((_, index) => <div className="skeleton-row" key={index}><span /><span /><span /></div>)}</div>;
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">∅</div><h3>{title}</h3><p>{detail}</p>{action}</div>;
}

export function ErrorState({ error, onRetry }: { error: ConsoleErrorShape; onRetry(): void }) {
  return <div className="error-state"><CircleAlert size={34} /><div><h3>{error.title}</h3><p>{error.detail}</p><code>{error.code} · {error.correlationId}</code></div><Button onClick={onRetry}><RefreshCcw size={15} />重试</Button></div>;
}

export function DefinitionList({ fields }: { fields: ConsoleRecord['fields'] }) {
  return <dl className="definition-list">{Object.entries(fields).map(([key, value]) => <div key={key}><dt>{humanField(key)}</dt><dd>{renderValue(value)}</dd></div>)}</dl>;
}

export function JsonViewer({ value, label = 'JSON' }: { value: unknown; label?: string }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(value, null, 2);
  const copy = async () => {
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return <div className="code-viewer"><div className="code-toolbar"><span>{label}</span><Button variant="ghost" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? '已复制' : '复制'}</Button></div><pre>{text}</pre></div>;
}

export function DataTable({ records, columns, onOpen, selectable = false }: {
  records: ConsoleRecord[]; columns: Array<{ key: string; label: string; render?: (record: ConsoleRecord) => ReactNode }>;
  onOpen(record: ConsoleRecord): void; selectable?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  return <div className="table-wrap"><table className="data-table"><thead><tr>{selectable && <th className="check-col"><input aria-label="全选" type="checkbox" checked={selected.size === records.length && records.length > 0} onChange={(event) => setSelected(event.target.checked ? new Set(records.map((r) => r.id)) : new Set())} /></th>}{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th className="action-col">操作</th></tr></thead><tbody>{records.map((record) => <tr key={record.id} onDoubleClick={() => onOpen(record)}>{selectable && <td><input aria-label={`选择 ${record.name}`} type="checkbox" checked={selected.has(record.id)} onChange={(event) => { const next = new Set(selected); event.target.checked ? next.add(record.id) : next.delete(record.id); setSelected(next); }} /></td>}{columns.map((column) => <td key={column.key}>{column.render ? column.render(record) : renderColumn(record, column.key)}</td>)}<td><Button variant="ghost" onClick={() => onOpen(record)}>查看</Button></td></tr>)}</tbody></table>{selectable && selected.size > 0 && <div className="selection-bar">已选择 {selected.size} 项。批量写操作未在冻结协议中定义，因此仅支持本地选择。</div>}</div>;
}

export function Tabs({ tabs, active, onChange }: { tabs: Array<{ id: string; label: string }>; active: string; onChange(id: string): void }) {
  return <div className="tabs" role="tablist">{tabs.map((tab) => <button role="tab" aria-selected={active === tab.id} className={active === tab.id ? 'active' : ''} key={tab.id} onClick={() => onChange(tab.id)}>{tab.label}</button>)}</div>;
}

export function Callout({ title, children, tone = 'info' }: { title: string; children: ReactNode; tone?: Tone }) {
  return <div className={`callout ${tone}`}><AlertTriangle size={18} /><div><strong>{title}</strong><p>{children}</p></div></div>;
}

export function OperationAction({ operationId, target, label, variant = 'secondary', onAccepted }: {
  operationId: string; target: { type: string; id: string; revision?: number | string; etag?: string }; label?: string; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; onAccepted?(): void;
}) {
  const operation = getOperation(operationId);
  const { canInvoke } = useConsole();
  const [open, setOpen] = useState(false);
  const allowed = canInvoke(operation);
  return <>
    <Button variant={variant} disabled={!allowed} title={allowed ? `${operation.method} ${operation.path}` : `当前角色缺少 ${requiredScope(operation)} Scope`} onClick={() => setOpen(true)}>{label ?? operationLabel(operationId)}</Button>
    {open && <CommandDialog operation={operation} target={target} onClose={() => setOpen(false)} onAccepted={onAccepted} />}
  </>;
}

export function CommandDialog({ operation, target, onClose, onAccepted }: {
  operation: ContractOperation; target: { type: string; id: string; revision?: number | string; etag?: string }; onClose(): void; onAccepted?(): void;
}) {
  const { execute } = useConsole();
  const highRisk = isHighRisk(operation.operationId);
  const confirmationText = highRisk ? target.id : '';
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState('');
  const [expectedRevision, setExpectedRevision] = useState(String(target.revision ?? ''));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ConsoleErrorShape>();
  const idempotencyKey = useMemo(() => `console-${operation.operationId}-${crypto.randomUUID?.() ?? Date.now()}`, [operation.operationId]);
  const valid = reason.trim().length >= 5 && (!highRisk || confirm === confirmationText);
  const submit = async () => {
    setSubmitting(true); setError(undefined);
    const input: CommandInput = {
      operation, target, reason: reason.trim(), expectedRevision: expectedRevision ? Number(expectedRevision) : undefined,
      idempotencyKey, payload: { source: 'sdar-node-console' },
    };
    try {
      await execute(input); onAccepted?.(); onClose();
    } catch (caught) { setError(caught as ConsoleErrorShape); }
    finally { setSubmitting(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="command-title"><header><div><span className="eyebrow">{operation.method} · {operation.tag}</span><h2 id="command-title">{operationLabel(operation.operationId)}</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭"><X /></button></header><div className="modal-body">
    {highRisk && <Callout title="高风险控制操作" tone="warning">该命令可能改变对外能力、任务或运行状态。请核对目标 Revision，并输入目标 ID 二次确认。</Callout>}
    <div className="impact-grid"><div><span>目标</span><strong>{target.type}:{target.id}</strong></div><div><span>当前 Revision</span><strong>{target.revision ?? 'N/A'}</strong></div><div><span>所需 Scope</span><strong>{requiredScope(operation)}</strong></div><div><span>Idempotency</span><strong className="mono">{idempotencyKey.slice(0, 22)}…</strong></div></div>
    <label className="form-field"><span>操作原因 <em>必填，至少 5 个字符</em></span><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="说明业务原因、影响和恢复计划" /></label>
    {target.revision != null && <label className="form-field"><span>Expected Revision / If-Match</span><input type="number" value={expectedRevision} onChange={(event) => setExpectedRevision(event.target.value)} /></label>}
    {highRisk && <label className="form-field"><span>输入 <code>{confirmationText}</code> 确认</span><input value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>}
    {error && <ErrorState error={error} onRetry={submit} />}
  </div><footer><Button onClick={onClose}>取消</Button><Button variant={highRisk ? 'danger' : 'primary'} loading={submitting} disabled={!valid} onClick={submit}>确认提交</Button></footer></div></div>;
}

export function Toast({ tone, message, onClose }: { tone: 'success' | 'danger' | 'info'; message: string; onClose(): void }) {
  useEffect(() => { const id = setTimeout(onClose, 3600); return () => clearTimeout(id); }, [onClose]);
  return <div className={`toast ${tone}`} role="status"><span>{tone === 'success' ? '✓' : tone === 'danger' ? '!' : 'i'}</span><p>{message}</p><button onClick={onClose} aria-label="关闭"><X size={15} /></button></div>;
}

export function humanStatus(value: string) {
  const map: Record<string, string> = {
    active: '已激活', healthy: '健康', degraded: '降级', unavailable: '不可用', draft: '草稿', validated: '已验证', published: '已发布',
    applying: '应用中', applied: '已应用', partially_applied: '部分应用', rejected: '已拒绝', rolled_back: '已回滚', suspended: '已暂停', retired: '已退役',
    deprecated: '已弃用', ready: '可导入', review_required: '需评审', running: '运行中', completed: '已完成', paused: '已暂停', canceled: '已取消',
    accepted: '已接受', succeeded: '已成功', failed: '失败', success: '成功', failure: '失败', info: '提示', warning: '警告', candidate: '候选',
    staged: '已暂存', superseded: '已替代', blocked: '阻塞', available: '可用', progressing: '推进中', converged: '已收敛', pending_publish: '待发布',
  };
  return map[value] ?? value;
}

export function humanField(value: string) {
  const labels: Record<string, string> = {
    nodeId: '节点 ID', nodeType: '节点类型', environment: '环境', authorityScopes: '权威 Scope', runtimeEndpointRef: 'Runtime Endpoint Ref', telemetrySourceId: 'Telemetry Source ID',
    targetType: '目标类型', targetId: '目标 ID', applyMode: '应用模式', checksum: 'Checksum', desiredRevision: '期望 Revision', observedRevision: '观测 Revision', convergence: '收敛状态', createdBy: '创建者',
    providerType: 'Provider 类型', baseUrl: 'Base URL', credentialRef: 'Credential Ref', secretStatus: 'Secret 状态', modelCount: '模型数量', lastValidatedAt: '最后验证', rateLimit: '速率限制',
    stage: '阶段', primary: '主路由', fallbacks: '降级链', budgetPolicy: '预算策略', registryEndpoint: 'Registry Endpoint', syncMode: '同步模式', activeSnapshotRevision: '活跃快照 Revision', activeSnapshotChecksum: '快照 Checksum', lastSyncAt: '最后同步', lastErrorCode: '最后错误码', lkgPolicy: 'LKG 策略',
    status: '状态', revision: 'Revision', operationType: 'Operation 类型', target: '目标', actorId: 'Actor', reason: '原因', correlationId: 'Correlation ID', operationId: 'Operation ID',
  };
  return labels[value] ?? value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
}

function renderColumn(record: ConsoleRecord, key: string): ReactNode {
  if (key === 'name') return <div className="primary-cell"><strong>{record.name}</strong><small>{record.id}</small></div>;
  if (key === 'status') return <Badge value={record.status} />;
  if (key === 'revision') return record.revision ?? '—';
  if (key === 'updatedAt') return formatTime(record.updatedAt);
  if (key === 'summary') return <span className="summary-cell">{record.summary}</span>;
  return renderValue(record.fields[key]);
}

function renderValue(value: unknown): ReactNode {
  if (value == null || value === '') return <span className="muted">—</span>;
  if (Array.isArray(value)) return <div className="tag-list">{value.map((item, index) => {
    const rendered = typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item);
    return <span key={`${index}:${rendered}`}>{rendered}</span>;
  })}</div>;
  if (typeof value === 'object') return <code>{JSON.stringify(value)}</code>;
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatTime(value);
  return String(value);
}

function toneForStatus(status: string): Tone {
  if (['active', 'healthy', 'available', 'published', 'applied', 'completed', 'succeeded', 'success', 'ready', 'converged'].includes(status)) return 'success';
  if (['degraded', 'warning', 'applying', 'running', 'accepted', 'candidate', 'validated', 'review_required', 'paused', 'progressing'].includes(status)) return 'warning';
  if (['failed', 'failure', 'unavailable', 'rejected', 'suspended', 'retired', 'canceled', 'blocked'].includes(status)) return 'danger';
  if (['draft', 'info', 'staged'].includes(status)) return 'info';
  return 'neutral';
}

export function formatTime(value: string) {
  const timestamp = new Date(value);
  if (!value || Number.isNaN(timestamp.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(timestamp);
}
