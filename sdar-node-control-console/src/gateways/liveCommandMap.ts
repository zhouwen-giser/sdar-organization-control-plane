import type { CommandInput } from '../domain';
import { ConsoleError } from '../domain';

const CONFIGURATION_OPERATIONS = new Set([
  'createConfigurationRevision',
  'validateConfigurationRevision',
  'publishConfigurationRevision',
  'rollbackConfigurationRevision',
]);
const READINESS_OPERATION = 'evaluateCapabilityReadiness';

export interface LiveCommandMapping {
  method: string;
  path: string;
  body: unknown;
  currentResourcePath?: string;
  responseKind?: 'configuration' | 'operation';
}

export async function mapLiveCommand(input: CommandInput): Promise<LiveCommandMapping> {
  if (!CONFIGURATION_OPERATIONS.has(input.operation.operationId) && input.operation.operationId !== READINESS_OPERATION) {
    throw new ConsoleError({
      status: 501,
      code: 'CONSOLE_LIVE_COMMAND_NOT_MAPPED',
      title: 'Live command mapping is not ready',
      detail: `${input.operation.operationId} has no operation-specific live request mapping.`,
      correlationId: 'console-local',
      retryable: false,
    });
  }

  if (input.operation.operationId === READINESS_OPERATION) {
    const separator = input.target.id.lastIndexOf('@');
    const capabilityId = separator < 0 ? input.target.id : input.target.id.slice(0, separator);
    const version = input.target.revision ?? (separator < 0 ? undefined : Number(input.target.id.slice(separator + 1)));
    if (!capabilityId || typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
      throw invalidPayload('A Capability Readiness command requires capabilityId and a positive version.');
    }
    return {
      method: input.operation.method,
      path: input.operation.path.replace('{capabilityId}', encodeURIComponent(capabilityId)).replace('{version}', String(version)),
      body: { reason: requiredText(input.reason, 'reason') },
      responseKind: 'operation',
    };
  }

  if (input.operation.operationId === 'createConfigurationRevision') {
    return {
      method: input.operation.method,
      path: input.operation.path,
      body: await configurationDraft(input),
      responseKind: 'configuration',
    };
  }

  const { configurationId, revision } = configurationIdentity(input);
  const currentResourcePath = `/api/v1/configuration-revisions/${encodeURIComponent(configurationId)}/${String(revision)}`;
  const path = input.operation.path
    .replace('{configurationId}', encodeURIComponent(configurationId))
    .replace('{revision}', String(revision));
  return {
    method: input.operation.method,
    path,
    currentResourcePath,
    body: {
      reason: requiredText(input.reason, 'reason'),
      ...(input.payload === undefined ? {} : { payload: input.payload }),
      expectedRevision: input.expectedRevision ?? revision,
    },
    responseKind: input.operation.operationId === 'validateConfigurationRevision' ? 'configuration' : 'operation',
  };
}

function configurationIdentity(input: CommandInput) {
  const separator = input.target.id.lastIndexOf('@');
  const configurationId = separator < 0 ? input.target.id : input.target.id.slice(0, separator);
  const revisionText = separator < 0 ? undefined : input.target.id.slice(separator + 1);
  const revision = input.target.revision ?? (revisionText === undefined ? undefined : Number(revisionText));
  if (!configurationId || typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 1) {
    throw invalidPayload('A Configuration command requires configurationId and a positive revision.');
  }
  return { configurationId, revision };
}

async function configurationDraft(input: CommandInput) {
  const payload = input.payload ?? {};
  const content = jsonContent(payload.content);
  const revision = positiveInteger(payload.revision, typeof input.target.revision === 'number' ? input.target.revision : 1, 'revision');
  const checksum = typeof payload.checksum === 'string' && /^[a-f0-9]{64}$/u.test(payload.checksum)
    ? payload.checksum
    : await sha256(canonicalJson(content));
  return {
    configurationId: requiredText(payload.configurationId ?? input.target.id, 'configurationId'),
    targetType: requiredText(payload.targetType, 'targetType'),
    targetId: requiredText(payload.targetId, 'targetId'),
    revision,
    status: 'draft',
    applyMode: requiredText(payload.applyMode, 'applyMode'),
    content,
    checksum,
    createdBy: requiredText(payload.createdBy ?? 'sdar-node-control-console', 'createdBy'),
    createdAt: typeof payload.createdAt === 'string' && Number.isFinite(Date.parse(payload.createdAt))
      ? payload.createdAt
      : new Date().toISOString(),
  };
}

function jsonContent(value: unknown): unknown {
  if (typeof value !== 'string') return value ?? {};
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw invalidPayload('Configuration content must be valid JSON.');
  }
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(',')}}`;
}

async function sha256(value: string) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function positiveInteger(value: unknown, fallback: number, field: string) {
  const candidate = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isSafeInteger(candidate) || candidate < 1) throw invalidPayload(`${field} must be a positive integer.`);
  return candidate;
}

function requiredText(value: unknown, field: string) {
  if (typeof value !== 'string' && typeof value !== 'number') throw invalidPayload(`${field} is required.`);
  const result = String(value).trim();
  if (!result) throw invalidPayload(`${field} is required.`);
  return result;
}

function invalidPayload(detail: string) {
  return new ConsoleError({
    status: 422,
    code: 'CONSOLE_COMMAND_PAYLOAD_INVALID',
    title: 'Command payload is invalid',
    detail,
    correlationId: 'console-local',
    retryable: false,
  });
}
