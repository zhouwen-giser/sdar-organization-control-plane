import { describe, expect, it } from 'vitest';
import { MockNodeControlGateway } from '../gateways/MockNodeControlGateway';
import { CONTRACT_OPERATIONS } from '../api/generated/contract';

function operation(operationId: string) {
  const found = CONTRACT_OPERATIONS.find((item) => item.operationId === operationId);
  if (!found) throw new Error(operationId);
  return found;
}

describe('contract-first mock gateway', () => {
  it('queries deterministic records', async () => {
    const gateway = new MockNodeControlGateway();
    const first = await gateway.list('capability');
    const second = await gateway.list('capability');
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(2);
  });

  it('returns 202-style operation receipts for asynchronous commands', async () => {
    const gateway = new MockNodeControlGateway();
    const receipt = await gateway.execute({
      operation: operation('syncSmppSource'), target: { type: 'smppSource', id: 'smpp-main', revision: 11 },
      expectedRevision: 11, reason: '刷新测试快照', idempotencyKey: 'test-sync-1',
    });
    expect(receipt.mode).toBe('operation');
    expect(receipt.operation?.status).toBe('accepted');
    expect(gateway.getSnapshot().records.operation[0].id).toBe(receipt.operation?.operationId);
  });

  it('fails closed on revision conflict', async () => {
    const gateway = new MockNodeControlGateway();
    await expect(gateway.execute({
      operation: operation('publishConfigurationRevision'), target: { type: 'configuration', id: 'runtime-policy', revision: 7 },
      expectedRevision: 6, reason: '测试冲突处理', idempotencyKey: 'test-conflict-1',
    })).rejects.toEqual(expect.objectContaining({ status: 412, code: 'REVISION_PRECONDITION_FAILED' }));
  });

  it('supports explicit error and empty scenarios', async () => {
    const gateway = new MockNodeControlGateway();
    gateway.setScenario('empty');
    expect(await gateway.list('task')).toHaveLength(0);
    gateway.setScenario('network-error');
    await expect(gateway.list('task')).rejects.toEqual(expect.objectContaining({ status: 503, retryable: true }));
  });
});
