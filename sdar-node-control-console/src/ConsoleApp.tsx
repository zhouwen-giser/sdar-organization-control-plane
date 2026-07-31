import { useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { parseHash, type RouteMatch } from './routes';
import { CollectionPage } from './features/CollectionPage';
import { CreatePage } from './features/CreatePage';
import { DetailPage } from './features/DetailPage';
import { OverviewPage } from './features/OverviewPage';
import { NodeEditPage, NodeHealthPage, NodePage } from './features/NodePages';
import {
  AccessPage, CapabilityImplementationsPage, ContractCoveragePage, EventsPage, SystemStatePage,
  TaskBindingPage, TaskDetailPage, TelemetryPage,
} from './features/SpecialPages';

export function ConsoleApp() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    if (!window.location.hash) window.location.hash = '/overview';
    const update = () => setHash(window.location.hash);
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const route = useMemo(() => parseHash(hash), [hash]);
  return <AppShell route={route}>{renderRoute(route)}</AppShell>;
}

function renderRoute(route: RouteMatch) {
  switch (route.id) {
    case 'overview': return <OverviewPage />;
    case 'node': return <NodePage />;
    case 'node-edit': return <NodeEditPage />;
    case 'node-health': return <NodeHealthPage />;
    case 'collection': return <CollectionPage kind={route.kind!} />;
    case 'skill-versions': return <CollectionPage kind="skill" filterPrefix={route.params.id} />;
    case 'plan-versions': return <CollectionPage kind="planTemplate" filterPrefix={route.params.id} />;
    case 'create': return <CreatePage kind={route.kind!} />;
    case 'detail': return <DetailPage kind={route.kind!} id={lookupId(route)} />;
    case 'implementations': return <CapabilityImplementationsPage id={route.params.id} version={route.params.version} />;
    case 'task-detail': return <TaskDetailPage id={route.params.id} />;
    case 'task-binding': return <TaskBindingPage id={route.params.id} />;
    case 'telemetry': return <TelemetryPage />;
    case 'telemetry-edit': return <TelemetryPage edit />;
    case 'events': return <EventsPage />;
    case 'access': return <AccessPage />;
    case 'contract': return <ContractCoveragePage search={route.query.get('search') ?? ''} />;
    case 'state-403': return <SystemStatePage kind="403" />;
    case 'state-500': return <SystemStatePage kind="500" />;
    case 'maintenance': return <SystemStatePage kind="maintenance" />;
    default: return <SystemStatePage kind="404" />;
  }
}

function lookupId(route: RouteMatch) {
  const id = route.params.id ?? '';
  const version = route.params.version;
  if (version && ['skill', 'planTemplate', 'capability', 'readiness', 'a2aExposure'].includes(route.kind ?? '')) return `${id}@${version}`;
  return id;
}
