import { Activity, AlertTriangle, Boxes, CheckCircle2, FileClock, GitBranch, HeartPulse, Network, Radio, Sparkles } from '../components/icons';
import { navigate } from '../routes';
import { useGatewaySnapshot } from '../state/ConsoleState';
import { Badge, Button, Callout, MetricCard, Panel, formatTime } from '../components/ui';

export function OverviewPage() {
  const snapshot = useGatewaySnapshot();
  const records = snapshot.records;
  const activeTasks = records.task.filter((item) => ['running', 'paused'].includes(item.status));
  const attention = [
    ...records.configuration.filter((item) => ['applying', 'partially_applied', 'rejected'].includes(item.status)).map((item) => ({ ...item, route: `/configuration/${item.id}/${item.revision}` })),
    ...records.mcpBinding.filter((item) => item.status !== 'active').map((item) => ({ ...item, route: `/mcp/bindings/${item.id}` })),
    ...records.readiness.filter((item) => item.status !== 'available').map((item) => ({ ...item, route: `/readiness/${item.id.replace('@', '/')}` })),
    ...records.operation.filter((item) => ['failed', 'running', 'accepted'].includes(item.status)).map((item) => ({ ...item, route: `/operations/${item.id}` })),
  ];
  const publishedCapabilities = records.capability.filter((item) => item.status === 'published').length;
  const availableReadiness = records.readiness.filter((item) => item.status === 'available').length;

  return <div className="page-stack">
    <section className="overview-hero"><div><span className="eyebrow">SDAR v1.4 · Single Node Control Plane</span><h2>{snapshot.node.profile.name}</h2><p>以 Desired / Observed / Convergence 为核心的单节点治理视图。Runtime 保持运行权威，Node Events 只提示变化。</p><div className="hero-meta"><Badge value={snapshot.node.health.status} /><span>{snapshot.node.profile.id}</span><span>Observed {formatTime(snapshot.node.health.observedAt)}</span></div></div><div className="hero-actions"><Button variant="primary" onClick={() => navigate('/node/health')}><HeartPulse size={15} />查看节点健康</Button><Button onClick={() => navigate('/operations')}><FileClock size={15} />Operation</Button></div></section>
    {snapshot.node.health.status !== 'healthy' && <Callout title="节点处于降级状态" tone="warning">控制后台和 Runtime 可用，但 MCP Catalog 存在暂停 Binding。当前任务不会因控制后台状态而自动停止。</Callout>}
    <div className="metric-grid four"><MetricCard icon={<Activity />} label="活动任务" value={activeTasks.length} detail={`${records.task.length} 个任务投影`} tone="info" /><MetricCard icon={<Sparkles />} label="已发布 Capability" value={publishedCapabilities} detail={`${availableReadiness}/${records.readiness.length} Readiness 可用`} tone="success" /><MetricCard icon={<Boxes />} label="MCP Binding" value={records.mcpBinding.length} detail={`${records.mcpBinding.filter((item) => item.status === 'active').length} 个 Active`} /><MetricCard icon={<GitBranch />} label="配置待收敛" value={records.configuration.filter((item) => item.fields.convergence !== 'converged').length} detail="Published 不等于 Applied" tone="warning" /></div>
    <div className="dashboard-grid"><Panel title="组件健康" subtitle="GET /api/v1/node/health" className="span-2"><div className="component-list">{snapshot.node.health.components.map((component) => <div key={component.name}><span className={`health-orb ${component.status}`} /><div><strong>{component.name}</strong><small>{component.detail}</small></div><Badge value={component.status} /><span className="latency">{component.latencyMs ? `${component.latencyMs} ms` : '—'}</span></div>)}</div></Panel>
      <Panel title="节点权威边界"><div className="authority-list"><div><CheckCircle2 /><span><strong>Control Plane</strong><small>定义期望状态与治理策略</small></span></div><div><Activity /><span><strong>Runtime</strong><small>维护任务、Readiness 与运行事实</small></span></div><div><Radio /><span><strong>Node Events</strong><small>只提示变化，GET 才是展示依据</small></span></div><div><Network /><span><strong>Telemetry Platform</strong><small>独立观察，不由 SDAR 提供 Query API</small></span></div></div></Panel>
      <Panel title="待处理事项" subtitle={`${attention.length} 项需要关注`} className="span-2"><div className="attention-list">{attention.slice(0, 6).map((item) => <button key={`${item.id}-${item.route}`} onClick={() => navigate(item.route)}><AlertTriangle size={17} /><div><strong>{item.name}</strong><small>{item.summary}</small></div><Badge value={item.status} /></button>)}</div></Panel>
      <Panel title="最近控制活动" subtitle="Audit Event + Management Operation"><div className="activity-feed">{records.audit.slice(0, 4).map((item) => <div key={item.id}><span className={`activity-dot ${item.status}`} /><div><strong>{item.name}</strong><small>{item.summary}</small><time>{formatTime(item.updatedAt)}</time></div></div>)}</div><Button variant="ghost" onClick={() => navigate('/audit')}>查看全部审计</Button></Panel>
    </div>
  </div>;
}
