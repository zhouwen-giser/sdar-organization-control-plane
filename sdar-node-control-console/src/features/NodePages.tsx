import { useState } from 'react';
import { Activity, ArrowLeft, CheckCircle2, Database, Edit3, HeartPulse, Radio, ShieldCheck } from '../components/icons';
import { navigate } from '../routes';
import { getOperation, useConsole, useGatewaySnapshot } from '../state/ConsoleState';
import { Badge, Button, Callout, DefinitionList, JsonViewer, MetricCard, OperationAction, Panel } from '../components/ui';

export function NodePage() {
  const { node } = useGatewaySnapshot();
  return <div className="page-stack"><section className="detail-hero"><div className="detail-title"><span className="eyebrow">GET /api/v1/node</span><div><h2>{node.profile.name}</h2><Badge value={node.profile.status} /></div><p>{node.profile.summary}</p><div className="hero-meta"><span>Revision <strong>{node.profile.revision}</strong></span><span>{String(node.profile.fields.environment)}</span></div></div><div className="hero-actions"><Button variant="primary" onClick={() => navigate('/node/edit')}><Edit3 size={15} />编辑草稿</Button><OperationAction operationId="validateNodeProfileDraft" target={{ type: 'node', id: node.profile.id, revision: Number(node.profile.revision) }} /><OperationAction operationId="publishNodeProfileDraft" target={{ type: 'node', id: node.profile.id, revision: Number(node.profile.revision) }} /></div></section>
    <Callout title="Headless Backend">该控制台只消费 Node Control API；浏览器不会直接调用 Runtime 内部接口，也不会读取 Runtime 数据库。</Callout>
    <div className="detail-grid"><Panel title="节点档案" className="span-2"><DefinitionList fields={node.profile.fields} /></Panel><Panel title="协议声明"><JsonViewer value={node.declaration} label="/.well-known/sdar-node" /></Panel></div>
    <Panel title="稳定协议版本"><div className="contract-version-grid">{Object.entries((node.declaration.contractVersions ?? {}) as Record<string, string>).map(([name, version]) => <div key={name}><ShieldCheck /><span>{name}</span><strong>{version}</strong></div>)}</div></Panel>
  </div>;
}

export function NodeEditPage() {
  const snapshot = useGatewaySnapshot();
  const { execute, canInvoke } = useConsole();
  const operation = getOperation('updateNodeProfileDraft');
  const [form, setForm] = useState({ displayName: snapshot.node.profile.name, description: String(snapshot.node.profile.fields.description ?? ''), environment: String(snapshot.node.profile.fields.environment ?? ''), runtimeEndpointRef: String(snapshot.node.profile.fields.runtimeEndpointRef ?? '') });
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async () => { setSubmitting(true); try { await execute({ operation, target: { type: 'node', id: snapshot.node.profile.id, revision: Number(snapshot.node.profile.revision) }, expectedRevision: Number(snapshot.node.profile.revision), reason, idempotencyKey: `node-draft-${Date.now()}`, payload: { ...snapshot.node.profile.fields, ...form, nodeId: snapshot.node.profile.id, revision: snapshot.node.profile.revision } }); setDone(true); } finally { setSubmitting(false); } };
  if (done) return <div className="completion-card"><CheckCircle2 size={48} /><h2>节点草稿已更新</h2><p>当前只完成 Draft 更新。请返回节点档案执行 Validate 和 Publish。</p><Button variant="primary" onClick={() => navigate('/node')}>返回节点档案</Button></div>;
  return <div className="page-stack"><section className="page-intro"><div><Button variant="ghost" onClick={() => navigate('/node')}><ArrowLeft size={15} />返回</Button><span className="eyebrow">PUT /api/v1/node/draft</span><h2>编辑节点档案草稿</h2><p>更新节点描述性档案，不修改 Runtime 运行权威。</p></div></section><Callout title="并发控制">提交使用当前 Revision {snapshot.node.profile.revision} 作为 If-Match。冲突时必须刷新，不自动覆盖。</Callout><Panel title="节点草稿"><div className="form-grid"><label className="form-field"><span>显示名称</span><input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label><label className="form-field"><span>环境</span><input value={form.environment} onChange={(event) => setForm({ ...form, environment: event.target.value })} /></label><label className="form-field full"><span>描述</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label className="form-field full"><span>Runtime Endpoint Ref</span><input value={form.runtimeEndpointRef} onChange={(event) => setForm({ ...form, runtimeEndpointRef: event.target.value })} /></label><label className="form-field full"><span>变更原因</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="至少 5 个字符" /></label></div><div className="form-footer"><Button onClick={() => navigate('/node')}>取消</Button><Button variant="primary" loading={submitting} disabled={!canInvoke(operation) || reason.trim().length < 5} onClick={submit}>保存 Draft</Button></div></Panel></div>;
}

export function NodeHealthPage() {
  const { node, evidence, records } = useGatewaySnapshot();
  return <div className="page-stack"><section className="page-intro"><div><span className="eyebrow">GET /api/v1/node/health</span><h2>节点健康与收敛</h2><p>聚合控制后台、Runtime、Catalog 和 Evidence Export 的当前健康事实。</p></div><Badge value={node.health.status} /></section>
    <div className="metric-grid four"><MetricCard icon={<HeartPulse />} label="节点状态" value={node.health.status} detail="当前综合判断" tone={node.health.status === 'healthy' ? 'success' : 'warning'} /><MetricCard icon={<Activity />} label="活动任务" value={node.health.activeTasks} detail={`${records.task.length} 个任务投影`} /><MetricCard icon={<Database />} label="待收敛配置" value={records.configuration.filter((item) => item.fields.convergence !== 'converged').length} detail="Desired ≠ Observed" tone="warning" /><MetricCard icon={<Radio />} label="待发送 Evidence" value={evidence.status.pendingRecords} detail="Evidence Outbox" tone="info" /></div>
    <Panel title="组件检查"><div className="health-grid">{node.health.components.map((component) => <article key={component.name}><div><span className={`health-orb ${component.status}`} /><strong>{component.name}</strong></div><Badge value={component.status} /><p>{component.detail}</p><small>Latency {component.latencyMs ?? '—'} ms</small></article>)}</div></Panel>
    <Panel title="配置收敛"><div className="convergence-table"><div className="convergence-head"><span>配置</span><span>Desired</span><span>Observed</span><span>Apply Mode</span><span>状态</span></div>{records.configuration.map((item) => <button key={item.id} onClick={() => navigate(`/configuration/${item.id}/${item.revision}`)}><strong>{item.name}</strong><span>{String(item.fields.desiredRevision)}</span><span>{String(item.fields.observedRevision)}</span><span>{String(item.fields.applyMode)}</span><Badge value={String(item.fields.convergence)} /></button>)}</div></Panel>
  </div>;
}
