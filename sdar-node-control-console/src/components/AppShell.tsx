import { useMemo, useState, type ReactNode } from 'react';
import {
  Activity, Bot, Boxes, BrainCircuit, Cable, ChevronRight, CircleGauge, ClipboardCheck, Database,
  FileClock, FileJson, GitBranch, HeartPulse, Network, Radio, Search, Settings2, ShieldCheck, Sparkles,
  SquareFunction, Waypoints, Workflow,
} from './icons';
import type { RouteMatch } from '../routes';
import { navigate } from '../routes';
import { ROLE_LABELS } from '../gateways/operationPolicy';
import type { RoleId, ScenarioId } from '../domain';
import { useConsole, useGatewaySnapshot } from '../state/ConsoleState';
import { Badge, Button, Toast } from './ui';

const navigation = [
  { label: '', items: [{ label: '节点总览', path: '/overview', icon: CircleGauge }] },
  { label: '节点', items: [{ label: '节点档案', path: '/node', icon: Database }, { label: '节点健康', path: '/node/health', icon: HeartPulse }] },
  { label: '配置与模型', items: [
    { label: '配置 Revision', path: '/configuration', icon: GitBranch },
    { label: 'LLM Provider', path: '/llm/providers', icon: BrainCircuit },
    { label: '模型路由', path: '/llm/routes', icon: Waypoints },
  ] },
  { label: 'Provider 供给', items: [
    { label: 'SMPP Source', path: '/smpp/sources', icon: Radio },
    { label: 'MCP 候选', path: '/mcp/candidates', icon: Boxes },
    { label: 'MCP Binding', path: '/mcp/bindings', icon: Cable },
  ] },
  { label: '能力治理', items: [
    { label: 'Skill', path: '/skills', icon: Sparkles },
    { label: 'Plan Template', path: '/plans', icon: Workflow },
    { label: 'Capability', path: '/capabilities', icon: SquareFunction },
    { label: 'Readiness', path: '/readiness', icon: ClipboardCheck },
  ] },
  { label: 'A2A 与 Runtime', items: [
    { label: 'A2A 暴露', path: '/a2a/exposures', icon: Network },
    { label: 'Agent Card', path: '/a2a/agent-card', icon: Bot },
    { label: '运行任务', path: '/tasks', icon: Activity },
    { label: 'Telemetry Export', path: '/telemetry-export', icon: FileJson },
  ] },
  { label: '运维审计', items: [
    { label: 'Management Operation', path: '/operations', icon: FileClock },
    { label: '审计事件', path: '/audit', icon: ShieldCheck },
    { label: 'Node Events', path: '/events', icon: Radio },
  ] },
  { label: '系统', items: [
    { label: 'RBAC 与安全', path: '/access', icon: ShieldCheck },
    { label: '协议能力映射', path: '/contract', icon: Settings2 },
  ] },
];

const scenarioLabels: Record<ScenarioId, string> = {
  healthy: '标准运行', degraded: '节点降级', empty: '空节点', 'network-error': '网络错误', 'revision-conflict': 'Revision 冲突', 'slow-network': '慢网络',
};

export function AppShell({ route, children }: { route: RouteMatch; children: ReactNode }) {
  const { role, scenario, setRole, setScenario, toast, clearToast } = useConsole();
  const snapshot = useGatewaySnapshot();
  const [navOpen, setNavOpen] = useState(false);
  const [search, setSearch] = useState('');
  const breadcrumbs = useMemo(() => [route.section, route.title].filter((value, index, all) => all.indexOf(value) === index), [route]);
  const active = route.path;
  const runSearch = () => { if (search.trim()) navigate(`/contract?search=${encodeURIComponent(search.trim())}`); };

  return <div className="app-shell">
    <a href="#main-content" className="skip-link">跳到主要内容</a>
    <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark"><ShieldCheck /></span><span><strong>SDAR Node</strong><small>单节点控制台 · v1.4</small></span></div>
      <nav aria-label="主导航">{navigation.map((group) => <div className="nav-group" key={group.label || 'overview'}>{group.label && <span className="nav-group-label">{group.label}</span>}{group.items.map((item) => { const Icon = item.icon; const selected = active === item.path || (item.path !== '/overview' && active.startsWith(`${item.path}/`)); return <a key={item.path} href={`#${item.path}`} className={selected ? 'active' : ''} onClick={() => setNavOpen(false)}><Icon size={17} /><span>{item.label}</span></a>; })}</div>)}</nav>
      <div className="sidebar-node"><div><span className={`health-orb ${snapshot.node.health.status}`} /><strong>{snapshot.node.profile.name}</strong></div><small>{snapshot.node.profile.id}</small><Badge value={snapshot.node.health.status} /></div>
      <div className="contract-chip"><span>Node Control API</span><strong>1.0.0 · Frozen</strong></div>
    </aside>
    <main id="main-content" className="workspace" tabIndex={-1}>
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setNavOpen((value) => !value)} aria-label="切换导航">☰</button>
        <div className="page-identity"><div className="breadcrumbs"><span>控制台</span>{breadcrumbs.map((item) => <span key={item}><ChevronRight size={12} />{item}</span>)}</div><h1>{route.title}</h1></div>
        <div className="topbar-tools">
          <label className="global-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="搜索协议 Operation" /></label>
          <label className="compact-select"><span>角色</span><select value={role} onChange={(event) => setRole(event.target.value as RoleId)}>{Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="compact-select"><span>场景</span><select value={scenario} onChange={(event) => setScenario(event.target.value as ScenarioId)}>{Object.entries(scenarioLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
      </header>
      <div className="content">{children}</div>
    </main>
    {toast && <Toast {...toast} onClose={clearToast} />}
  </div>;
}
