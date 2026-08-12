import { describe, expect, it } from 'vitest';
import { CONTRACT_OPERATIONS } from '../api/generated/contract';
import type { CommandInput } from '../domain';
import { mapLiveCommand } from '../gateways/liveCommandMap';

function operation(operationId: string) {
  const result = CONTRACT_OPERATIONS.find((item) => item.operationId === operationId);
  if (!result) throw new Error(`missing ${operationId}`);
  return result;
}

describe('live command map', () => {
  it('builds a strict Configuration draft and hashes canonical JSON', async () => {
    const mapping = await mapLiveCommand({
      operation: operation('createConfigurationRevision'),
      target: { type: 'configuration', id: 'console-p04' },
      reason: 'Create an inert P04 configuration.',
      idempotencyKey: 'p04-create-1',
      payload: {
        configurationId: 'console-p04', targetType: 'runtime_policy', targetId: 'console-p04-target',
        applyMode: 'new_task_only', content: '{"b":2,"a":1}', createdBy: 'console-test',
      },
    });

    expect(mapping).toMatchObject({ method: 'POST', path: '/api/v1/configuration-revisions', responseKind: 'configuration' });
    expect(mapping.body).toMatchObject({
      configurationId: 'console-p04', revision: 1, status: 'draft', content: { b: 2, a: 1 },
      checksum: '43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777',
    });
  });

  it('maps lifecycle commands to the exact versioned path and CommandRequest', async () => {
    const input: CommandInput = {
      operation: operation('publishConfigurationRevision'),
      target: { type: 'configuration', id: 'console-p04@3', revision: 3 },
      reason: 'Publish after validation.', expectedRevision: 3, idempotencyKey: 'p04-publish-3',
      payload: { source: 'sdar-node-control-console' },
    };
    await expect(mapLiveCommand(input)).resolves.toEqual({
      method: 'POST',
      path: '/api/v1/configuration-revisions/console-p04/3/publish',
      currentResourcePath: '/api/v1/configuration-revisions/console-p04/3',
      body: { reason: 'Publish after validation.', expectedRevision: 3, payload: { source: 'sdar-node-control-console' } },
      responseKind: 'operation',
    });
  });

  it('fails closed for commands without an operation-specific live mapping', async () => {
    await expect(mapLiveCommand({
      operation: operation('createLlmProviderDraft'), target: { type: 'llmProvider', id: 'provider-1', revision: 1 },
      reason: 'Refresh readiness.', idempotencyKey: 'refresh-1',
    })).rejects.toEqual(expect.objectContaining({ status: 501, code: 'CONSOLE_LIVE_COMMAND_NOT_MAPPED' }));
  });
});
