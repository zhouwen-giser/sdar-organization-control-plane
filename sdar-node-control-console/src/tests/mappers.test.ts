import { describe, expect, it } from 'vitest';
import { mapContractResource, mapConvergence, mapResourceSummary, mapStatus } from '../mappers/recordMappers';

describe('contract DTO to view model mappers', () => {
  it('clones contract data and preserves revision semantics', () => {
    const dto = { id: 'cfg', name: 'Config', status: 'applied', summary: 'ok', revision: 3, updatedAt: '2026-07-31T00:00:00Z', fields: { desiredRevision: 3, observedRevision: 3, convergence: 'converged' } };
    const record = mapContractResource(dto);
    const view = mapResourceSummary(record);
    expect(view.status.tone).toBe('success');
    expect(view.revision).toBe(3);
    expect(view.fields).not.toBe(dto.fields);
  });

  it('maps convergence without inventing state', () => {
    expect(mapConvergence({ desiredRevision: 8, observedRevision: 7, convergence: 'progressing' })).toEqual(expect.objectContaining({ state: 'progressing', desiredRevision: 8, observedRevision: 7 }));
    expect(mapConvergence({})).toEqual(expect.objectContaining({ state: 'unknown' }));
  });

  it('keeps lifecycle status domain-specific while deriving presentation tone', () => {
    expect(mapStatus('suspended')).toEqual(expect.objectContaining({ value: 'suspended', tone: 'danger' }));
    expect(mapStatus('candidate')).toEqual(expect.objectContaining({ value: 'candidate', tone: 'warning' }));
  });
});
