import type { ConsoleRecord, Tone } from '../domain';
import type { ConvergenceViewModel, ResourceSummaryViewModel, StatusViewModel } from '../view-models';

export interface ContractResourceEnvelope {
  id: string;
  name: string;
  status: string;
  summary: string;
  revision?: number | string;
  updatedAt: string;
  tags?: string[];
  fields: Record<string, unknown>;
  relationRefs?: ConsoleRecord['relationRefs'];
}

export function mapContractResource(dto: ContractResourceEnvelope): ConsoleRecord {
  return {
    id: dto.id,
    name: dto.name,
    status: dto.status,
    summary: dto.summary,
    revision: dto.revision,
    updatedAt: dto.updatedAt,
    tags: dto.tags ? [...dto.tags] : undefined,
    fields: structuredClone(dto.fields),
    relationRefs: dto.relationRefs ? structuredClone(dto.relationRefs) : undefined,
  };
}

export function mapResourceSummary(record: ConsoleRecord): ResourceSummaryViewModel {
  return {
    id: record.id,
    name: record.name,
    summary: record.summary,
    revision: record.revision,
    updatedAt: record.updatedAt,
    status: mapStatus(record.status),
    tags: record.tags ?? [],
    fields: record.fields,
  };
}

export function mapStatus(value: string): StatusViewModel {
  const tone = statusTone(value);
  return {
    value,
    label: value.replaceAll('_', ' '),
    tone,
    explanation: tone === 'success' ? '资源处于健康或有效状态。' : tone === 'warning' ? '资源需要观察或正在转换。' : tone === 'danger' ? '资源不可用、失败或已停止参与运行。' : '资源处于中性生命周期状态。',
  };
}

export function mapConvergence(fields: Record<string, unknown>): ConvergenceViewModel {
  const desiredRevision = numberOrUndefined(fields.desiredRevision);
  const observedRevision = numberOrUndefined(fields.observedRevision);
  const raw = String(fields.convergence ?? 'unknown');
  const state: ConvergenceViewModel['state'] = raw === 'converged' ? 'converged' : raw === 'progressing' || raw === 'applying' ? 'progressing' : raw === 'blocked' || raw === 'rejected' ? 'blocked' : 'unknown';
  return {
    desiredRevision,
    observedRevision,
    state,
    explanation: state === 'converged' ? 'Desired 与 Observed 已一致。' : state === 'progressing' ? 'Runtime 正在应用期望 Revision。' : state === 'blocked' ? '收敛被错误或策略阻断。' : '缺少足够事实判断收敛。',
  };
}

function numberOrUndefined(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function statusTone(status: string): Tone {
  if (['active', 'healthy', 'available', 'published', 'applied', 'completed', 'succeeded', 'success', 'ready', 'converged'].includes(status)) return 'success';
  if (['degraded', 'warning', 'applying', 'running', 'accepted', 'candidate', 'validated', 'review_required', 'paused', 'progressing'].includes(status)) return 'warning';
  if (['failed', 'failure', 'unavailable', 'rejected', 'suspended', 'retired', 'canceled', 'blocked'].includes(status)) return 'danger';
  if (['draft', 'info', 'staged'].includes(status)) return 'info';
  return 'neutral';
}
