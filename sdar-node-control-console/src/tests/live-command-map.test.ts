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
      operation: operation('importSkillPackage'), target: { type: 'skill', id: 'skill-1', revision: 1 },
      reason: 'Refresh readiness.', idempotencyKey: 'refresh-1',
    })).rejects.toEqual(expect.objectContaining({ status: 501, code: 'CONSOLE_LIVE_COMMAND_NOT_MAPPED' }));
  });

  it('builds the strict Evidence v1.4.1 configuration and keeps every required family', async () => {
    const mapping = await mapLiveCommand({
      operation: operation('createEvidenceExportRevision'),
      target: { type: 'evidenceExport', id: 'evidence-console-p06', revision: 1 },
      reason: 'Create the P06 Evidence export.',
      idempotencyKey: 'p06-evidence-create',
      payload: {
        endpointRef: 'http://127.0.0.1:18462/v1/evidence',
        credentialRef: 'secret:evidence/p06',
        sourceId: 'sdar-node',
      },
    });
    expect(mapping).toMatchObject({ method: 'POST', path: '/api/v1/evidence-export/revisions', responseKind: 'evidenceConfiguration' });
    expect(mapping.body).toMatchObject({
      exportId: 'evidence-console-p06', status: 'draft', revision: 1, artifactMode: 'reference',
      includedFamilies: ['runtime', 'skill', 'mcp_task', 'capability', 'experience', 'replay', 'artifact', 'node_control', 'evidence'],
    });
  });

  it('maps bounded Evidence recovery without inventing a synchronous result', async () => {
    await expect(mapLiveCommand({
      operation: operation('replayEvidence'),
      target: { type: 'evidenceRecord', id: 'evidence_deadbeef' },
      reason: 'Replay one retained record.',
      idempotencyKey: 'p06-replay',
      payload: { scope: 'record', recordId: 'evidence_deadbeef' },
    })).resolves.toEqual({
      method: 'POST', path: '/api/v1/evidence-export/replays',
      body: { scope: 'record', recordId: 'evidence_deadbeef', reason: 'Replay one retained record.' },
      responseKind: 'operation',
    });
  });

  it('maps real SMPP synchronization and MCP refresh to exact public commands', async () => {
    await expect(mapLiveCommand({
      operation: operation('syncSmppSource'), target: { type: 'smppSource', id: 'home-lab-smpp' },
      reason: 'Refresh the real SMPP registry snapshot.', idempotencyKey: 'p07-sync',
    })).resolves.toEqual({
      method: 'POST', path: '/api/v1/smpp-sources/home-lab-smpp/sync',
      body: { reason: 'Refresh the real SMPP registry snapshot.' }, responseKind: 'operation',
    });
    await expect(mapLiveCommand({
      operation: operation('refreshMcpProviderBinding'), target: { type: 'mcpBinding', id: 'mcp-binding-ha-light-lab' },
      reason: 'Refresh the governed MCP catalog.', idempotencyKey: 'p07-refresh',
    })).resolves.toEqual({
      method: 'POST', path: '/api/v1/mcp-provider-bindings/mcp-binding-ha-light-lab/refresh',
      body: { reason: 'Refresh the governed MCP catalog.' }, responseKind: 'operation',
    });
  });

  it('bounds a single-candidate Model Route to one attempt', async () => {
    await expect(mapLiveCommand({
      operation: operation('createModelRouteDraft'), target: { type: 'modelRoute', id: 'route-planning' },
      reason: 'Create a deterministic planning route.', idempotencyKey: 'p07-route',
      payload: { stage: 'planning', primary: 'provider-local:structured-fixture', fallbacks: [] },
    })).resolves.toMatchObject({
      body: {
        primary: { providerId: 'provider-local', modelId: 'structured-fixture' },
        fallbacks: [],
        budgetPolicy: { maxAttempts: 1 },
      },
    });
  });
});
