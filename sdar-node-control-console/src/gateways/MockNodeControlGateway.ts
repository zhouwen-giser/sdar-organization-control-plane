import { CONTRACT_OPERATIONS, type ContractOperation, type ManagementOperation } from '../api/generated/contract';
import type {
  CommandInput, CommandReceipt, ConsoleRecord, GatewaySnapshot, QueryOptions, RecordKind, ScenarioId,
} from '../domain';
import { ConsoleError } from '../domain';
import type { NodeControlGateway } from './contracts';
import { cloneSnapshot } from './mockData';

const ASYNC_OPERATION_IDS = new Set([
  'publishNodeProfileDraft', 'publishConfigurationRevision', 'rollbackConfigurationRevision', 'validateLlmProvider',
  'syncSmppSource', 'importMcpProviderBinding', 'refreshMcpProviderBinding', 'suspendMcpProviderBinding', 'removeMcpProviderBinding',
  'importSkillPackage', 'publishSkillVersion', 'suspendSkillVersion', 'deprecateSkillVersion',
  'publishPlanTemplateVersion', 'revalidatePlanTemplateVersion', 'suspendPlanTemplateVersion',
  'publishNodeCapabilityVersion', 'suspendNodeCapabilityVersion', 'deprecateNodeCapabilityVersion', 'retireNodeCapabilityVersion',
  'evaluateCapabilityReadiness', 'publishA2aExposureVersion', 'suspendA2aExposureVersion', 'retireA2aExposureVersion',
  'rebuildAgentCardRevision', 'pauseTask', 'resumeTask', 'cancelTask', 'submitTaskGoalPatch',
  'publishEvidenceExportRevision', 'testEvidenceExportConnection', 'replayEvidence',
  'retryEvidenceDeadLetter', 'reconcileEvidenceCoverage', 'cancelManagementOperation',
]);

function wait(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function now() { return new Date().toISOString(); }
function compactId(prefix: string) { return `${prefix}-${Date.now().toString(36)}`; }

export class MockNodeControlGateway implements NodeControlGateway {
  private snapshot: GatewaySnapshot = cloneSnapshot();
  private scenario: ScenarioId = 'healthy';
  private listeners = new Set<() => void>();

  getSnapshot() { return this.snapshot; }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private emit() { this.snapshot.revision += 1; this.listeners.forEach((listener) => listener()); }

  setScenario(scenario: ScenarioId) {
    this.scenario = scenario;
    this.snapshot = cloneSnapshot();
    if (scenario === 'degraded') {
      this.snapshot.node.health.status = 'degraded';
      this.snapshot.evidence.status.status = 'degraded';
      this.snapshot.evidence.status.pendingRecords = 1842;
      this.snapshot.evidence.status.lastErrorCode = 'EVIDENCE_EXPORT_TIMEOUT';
    }
    if (scenario === 'empty') {
      for (const kind of Object.keys(this.snapshot.records) as RecordKind[]) this.snapshot.records[kind] = [];
    }
    this.emit();
  }

  reset() { this.setScenario('healthy'); }
  async getEvidenceManifest(episodeId: string) {
    await this.latency();
    return { episodeId, status: 'complete', expectedFamilies: ['runtime', 'skill'], completedFamilies: ['runtime', 'skill'], missingFamilies: [] };
  }

  operationById(operationId: string): ContractOperation | undefined {
    return CONTRACT_OPERATIONS.find((operation) => operation.operationId === operationId);
  }

  private async latency() {
    if (this.scenario === 'network-error') {
      await wait(120);
      throw new ConsoleError({ status: 503, code: 'NODE_CONTROL_UNAVAILABLE', title: '节点控制服务不可用', detail: '模拟网络错误：无法读取节点控制状态。', correlationId: compactId('corr'), retryable: true });
    }
    await wait(this.scenario === 'slow-network' ? 900 : 80);
  }

  async list(kind: RecordKind, options: QueryOptions = {}): Promise<ConsoleRecord[]> {
    await this.latency();
    let items = this.snapshot.records[kind] ?? [];
    if (options.search) {
      const query = options.search.toLowerCase();
      items = items.filter((item) => `${item.id} ${item.name} ${item.summary} ${(item.tags ?? []).join(' ')}`.toLowerCase().includes(query));
    }
    if (options.status && options.status !== 'all') items = items.filter((item) => item.status === options.status);
    return structuredClone(items);
  }

  async get(kind: RecordKind, id: string): Promise<ConsoleRecord | undefined> {
    await this.latency();
    return structuredClone(this.snapshot.records[kind].find((item) => item.id === id));
  }

  async execute(input: CommandInput): Promise<CommandReceipt> {
    await this.latency();
    const targetRecord = this.findTarget(input.target.id);
    if (this.scenario === 'revision-conflict' || (targetRecord?.revision && input.expectedRevision != null && Number(targetRecord.revision) !== input.expectedRevision)) {
      throw new ConsoleError({
        status: 412, code: 'REVISION_PRECONDITION_FAILED', title: 'Revision 冲突',
        detail: `期望 Revision ${input.expectedRevision ?? '未提供'}，当前为 ${targetRecord?.revision ?? 'unknown'}。请刷新后重新确认。`,
        correlationId: compactId('corr'), retryable: true,
      });
    }

    if (!ASYNC_OPERATION_IDS.has(input.operation.operationId)) {
      const result = this.applySynchronousMutation(input, targetRecord);
      this.appendAudit(input, 'success');
      this.emit();
      return { mode: 'synchronous', acceptedAt: now(), record: structuredClone(result ?? targetRecord) };
    }

    const operationId = compactId('op');
    const operation: ManagementOperation = {
      operationId,
      operationType: input.operation.operationId,
      target: { type: input.target.type, id: input.target.id, revision: typeof input.target.revision === 'number' ? input.target.revision : undefined },
      status: 'accepted',
      actorId: 'console.actor',
      reason: input.reason,
      idempotencyKeyHash: `sha256:${input.idempotencyKey.slice(-12)}`,
      inputHash: `sha256:${JSON.stringify(input.payload ?? {}).length.toString(16).padStart(12, '0')}`,
      createdAt: now(),
    };
    this.snapshot.records.operation.unshift({
      id: operationId,
      name: `${input.operation.operationId} · ${input.target.id}`,
      status: 'accepted', summary: '命令已接受，等待后台 Operation 执行。', updatedAt: operation.createdAt,
      tags: [input.operation.tag, 'accepted'], fields: { ...operation, target: { ...operation.target } },
    });
    this.appendAudit(input, 'accepted', operationId);
    this.emit();
    setTimeout(() => this.progressOperation(operationId, input, targetRecord), 260);
    return { mode: 'operation', acceptedAt: operation.createdAt, operation };
  }

  private findTarget(id: string): ConsoleRecord | undefined {
    for (const records of Object.values(this.snapshot.records)) {
      const found = records.find((record) => record.id === id || String(record.fields.taskId ?? '') === id);
      if (found) return found;
    }
    if (this.snapshot.node.profile.id === id) return this.snapshot.node.profile;
    if (this.snapshot.evidence.configuration.id === id) return this.snapshot.evidence.configuration;
    return undefined;
  }

  private applySynchronousMutation(input: CommandInput, target?: ConsoleRecord): ConsoleRecord | undefined {
    if (target) {
      target.revision = Number(target.revision ?? 0) + 1;
      target.updatedAt = now();
      if (/validate/i.test(input.operation.operationId)) target.status = 'validated';
    }
    if (/create|import/i.test(input.operation.operationId) && !target) {
      const kind = kindForOperation(input.operation.operationId);
      if (kind) {
        const id = String(input.payload?.id ?? input.payload?.providerId ?? input.payload?.routeId ?? input.payload?.configurationId ?? compactId(kind));
        const created: ConsoleRecord = {
          id, name: String(input.payload?.name ?? input.payload?.displayName ?? `新建 ${input.operation.tag} 草稿`), status: 'draft',
          revision: 1, summary: '由本地 Contract-first Mock Gateway 创建的草稿。', updatedAt: now(), tags: ['draft'], fields: { ...input.payload },
        };
        this.snapshot.records[kind].unshift(created);
        return created;
      }
    }
    return target;
  }

  private progressOperation(operationId: string, input: CommandInput, target?: ConsoleRecord) {
    const op = this.snapshot.records.operation.find((item) => item.id === operationId);
    if (!op) return;
    op.status = 'running'; op.summary = 'Operation 正在执行。'; op.updatedAt = now(); op.fields.status = 'running'; op.fields.startedAt = now();
    this.emit();
    setTimeout(() => {
      op.status = 'succeeded'; op.summary = 'Operation 已成功完成。'; op.updatedAt = now(); op.fields.status = 'succeeded'; op.fields.completedAt = now();
      if (target) {
        target.updatedAt = now();
        target.revision = Number(target.revision ?? 0) + 1;
        const id = input.operation.operationId;
        if (/publish/i.test(id)) target.status = 'published';
        if (/suspend|pause/i.test(id)) target.status = 'suspended';
        if (/retire|remove/i.test(id)) target.status = 'retired';
        if (/deprecate/i.test(id)) target.status = 'deprecated';
        if (/resume/i.test(id)) target.status = 'running';
        if (/cancelTask/i.test(id)) target.status = 'canceled';
        if (/rollback/i.test(id)) target.status = 'rolled_back';
      }
      this.appendEvent(input, operationId);
      this.emit();
    }, 500);
  }

  private appendAudit(input: CommandInput, result: string, operationId?: string) {
    const id = compactId('audit');
    this.snapshot.records.audit.unshift({
      id, name: input.operation.operationId.toUpperCase(), status: result === 'success' ? 'success' : 'accepted',
      summary: `${input.operation.operationId} 已由 console.actor 提交。`, updatedAt: now(), tags: [input.operation.tag, input.operation.kind],
      fields: { actorId: 'console.actor', actorRole: 'selected-role', target: `${input.target.type}:${input.target.id}`, correlationId: compactId('corr'), operationId, reason: input.reason, result },
    });
  }

  private appendEvent(input: CommandInput, operationId: string) {
    const id = compactId('evt');
    this.snapshot.records.event.unshift({
      id, name: `${input.operation.tag.toLowerCase()}.changed`, status: 'info',
      summary: `${input.target.type} ${input.target.id} 因 ${input.operation.operationId} 发生变化。`, updatedAt: now(), tags: [input.operation.tag, 'hint'],
      fields: { eventType: `${input.operation.tag.toLowerCase()}.changed`, aggregateType: input.target.type, aggregateId: input.target.id, aggregateRevision: input.target.revision ?? 1, correlationId: operationId, dataClassification: 'internal', payloadSummary: input.operation.operationId },
    });
  }
}

function kindForOperation(operationId: string): RecordKind | undefined {
  if (operationId.includes('Configuration')) return 'configuration';
  if (operationId.includes('LlmProvider')) return 'llmProvider';
  if (operationId.includes('ModelRoute')) return 'modelRoute';
  if (operationId.includes('SmppSource')) return 'smppSource';
  if (operationId.includes('McpProviderBinding')) return 'mcpBinding';
  if (operationId.includes('Skill')) return 'skill';
  if (operationId.includes('PlanTemplate')) return 'planTemplate';
  if (operationId.includes('Capability')) return 'capability';
  if (operationId.includes('A2aExposure')) return 'a2aExposure';
  if (operationId.includes('EvidenceExport')) return undefined;
  return undefined;
}
