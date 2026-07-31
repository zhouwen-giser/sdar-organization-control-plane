import { useMemo, useState } from 'react';
import { Download, Plus, RefreshCcw } from '../components/icons';
import type { RecordKind } from '../domain';
import { navigate } from '../routes';
import { useCollection } from '../state/ConsoleState';
import { Badge, Button, Callout, DataTable, EmptyState, ErrorState, MetricCard, Panel, SearchField, SelectField, SkeletonRows } from '../components/ui';
import { RESOURCE_CONFIG } from './resourceConfig';

export function CollectionPage({ kind, filterPrefix }: { kind: RecordKind; filterPrefix?: string }) {
  const config = RESOURCE_CONFIG[kind];
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const query = useCollection(kind, search, status);
  const records = useMemo(() => filterPrefix ? (query.data ?? []).filter((record) => record.id.startsWith(`${filterPrefix}@`)) : (query.data ?? []), [query.data, filterPrefix]);
  const statuses = useMemo(() => Array.from(new Set((query.data ?? []).map((record) => record.status))).sort(), [query.data]);
  const healthy = records.filter((record) => ['active', 'healthy', 'available', 'published', 'applied', 'completed', 'succeeded', 'success', 'ready'].includes(record.status)).length;
  const attention = records.filter((record) => ['degraded', 'failed', 'failure', 'unavailable', 'suspended', 'review_required', 'paused', 'applying'].includes(record.status)).length;

  const exportAudit = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `sdar-${kind}-export.json`; anchor.click(); URL.revokeObjectURL(url);
  };

  return <div className="page-stack">
    <section className="page-intro"><div><span className="eyebrow">{kind === 'readiness' ? 'Runtime authoritative' : 'Node Control API 1.0.0'}</span><h2>{filterPrefix ? `${filterPrefix} 的版本` : config.title}</h2><p>{config.description}</p></div><div className="page-actions">{kind === 'audit' && <Button onClick={exportAudit}><Download size={15} />导出当前结果</Button>}{config.createPath && !filterPrefix && <Button variant="primary" onClick={() => navigate(config.createPath!)}><Plus size={15} />{config.singular}</Button>}</div></section>
    <Callout title="权威边界">{config.boundary}</Callout>
    <div className="metric-grid three"><MetricCard label={config.metricLabels[0]} value={records.length} detail="当前筛选范围" /><MetricCard label={config.metricLabels[1]} value={healthy} detail="健康或有效状态" tone="success" /><MetricCard label={config.metricLabels[2]} value={attention} detail="需要运维关注" tone={attention ? 'warning' : 'neutral'} /></div>
    <Panel title="资源清单" subtitle={filterPrefix ? `只展示 ${filterPrefix} 的不可变版本` : '支持搜索、状态筛选、刷新和深链接。'} actions={<Button variant="ghost" loading={query.refreshing} onClick={query.refresh}><RefreshCcw size={15} />刷新</Button>}>
      <div className="toolbar"><SearchField value={search} onChange={setSearch} /><SelectField label="状态" value={status} onChange={setStatus} options={[{ value: 'all', label: '全部状态' }, ...statuses.map((item) => ({ value: item, label: item }))]} /><span className="result-count">{records.length} 项</span></div>
      {query.loading && <SkeletonRows />}
      {query.error && <ErrorState error={query.error} onRetry={query.refresh} />}
      {!query.loading && !query.error && records.length === 0 && <EmptyState title="当前没有符合条件的数据" detail="尝试清除筛选条件，或切换到标准运行场景。" action={search || status !== 'all' ? <Button onClick={() => { setSearch(''); setStatus('all'); }}>清除筛选</Button> : undefined} />}
      {!query.loading && !query.error && records.length > 0 && <DataTable records={records} selectable columns={config.columns} onOpen={(record) => navigate(config.detailPath(record))} />}
    </Panel>
  </div>;
}
