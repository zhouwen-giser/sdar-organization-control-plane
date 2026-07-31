import type { ContractOperation, ManagementOperation, NodeEventEnvelope } from './api/generated/contract';

export type ScenarioId = 'healthy' | 'degraded' | 'empty' | 'network-error' | 'revision-conflict' | 'slow-network';
export type RoleId = 'node_admin' | 'configuration_operator' | 'provider_operator' | 'capability_operator' | 'task_operator' | 'auditor' | 'federation_reader';
export type Scope =
  | 'a2a.manage' | 'a2a.read' | 'artifact.manage' | 'artifact.read' | 'audit.read'
  | 'capability.manage' | 'capability.read' | 'configuration.manage' | 'events.read'
  | 'llm.manage' | 'mcp.manage' | 'node.read' | 'node.write' | 'operation.read'
  | 'skill.manage' | 'skill.read' | 'smpp.manage' | 'task.control' | 'task.read'
  | 'telemetry_export.manage';

export type RecordKind =
  | 'configuration' | 'llmProvider' | 'modelRoute' | 'smppSource' | 'mcpCandidate'
  | 'mcpBinding' | 'skill' | 'planTemplate' | 'capability' | 'readiness'
  | 'a2aExposure' | 'agentCard' | 'task' | 'operation' | 'audit' | 'event';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface ConsoleRecord {
  id: string;
  name: string;
  status: string;
  revision?: number | string;
  summary: string;
  updatedAt: string;
  tags?: string[];
  fields: Record<string, unknown>;
  relationRefs?: Array<{ label: string; value: string; href?: string }>;
}

export interface NodeSnapshot {
  profile: ConsoleRecord;
  health: {
    status: 'healthy' | 'degraded' | 'unavailable';
    observedAt: string;
    activeTasks: number;
    components: Array<{ name: string; status: string; detail: string; latencyMs?: number }>;
  };
  declaration: Record<string, unknown>;
}

export interface TelemetrySnapshot {
  configuration: ConsoleRecord;
  status: {
    status: 'healthy' | 'degraded' | 'blocked';
    activeRevision: number;
    pendingRecords: number;
    lastAcknowledgedSequence: number;
    lastAcknowledgedAt: string;
    oldestPendingAt?: string;
    lastErrorCode?: string;
    observedAt: string;
  };
}

export interface CommandInput {
  operation: ContractOperation;
  target: { type: string; id: string; revision?: number | string };
  reason: string;
  expectedRevision?: number;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
}

export interface CommandReceipt {
  mode: 'synchronous' | 'operation';
  acceptedAt: string;
  record?: ConsoleRecord;
  operation?: ManagementOperation;
}

export interface QueryOptions {
  search?: string;
  status?: string;
}

export interface ConsoleErrorShape {
  status: number;
  code: string;
  title: string;
  detail: string;
  correlationId: string;
  retryable: boolean;
}

export class ConsoleError extends Error implements ConsoleErrorShape {
  status: number;
  code: string;
  title: string;
  detail: string;
  correlationId: string;
  retryable: boolean;

  constructor(shape: ConsoleErrorShape) {
    super(shape.detail);
    this.name = 'ConsoleError';
    Object.assign(this, shape);
    this.status = shape.status;
    this.code = shape.code;
    this.title = shape.title;
    this.detail = shape.detail;
    this.correlationId = shape.correlationId;
    this.retryable = shape.retryable;
  }
}

export interface GatewaySnapshot {
  revision: number;
  node: NodeSnapshot;
  telemetry: TelemetrySnapshot;
  records: Record<RecordKind, ConsoleRecord[]>;
  nodeEvents: NodeEventEnvelope[];
}
