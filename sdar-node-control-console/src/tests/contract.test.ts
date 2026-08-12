import { describe, expect, it } from 'vitest';
import { CONTRACT_OPERATIONS, CONTRACT_STATUS, CONTRACT_VERSION, OPENAPI_SHA256, type EvidenceExportStatus, type EvidenceOperations } from '../api/generated/contract';
import { requiredScope } from '../gateways/operationPolicy';
import { ROUTE_DEFINITIONS, parseHash } from '../routes';

const forbiddenPaths = ['/telemetry/query', '/runtime/internal', '/api/v1/telemetry/query'];

describe('frozen contract integration', () => {
  it('pins the frozen version and SHA', () => {
    expect(CONTRACT_VERSION).toBe('1.0.0');
    expect(CONTRACT_STATUS).toBe('PROTOCOL_DESIGN_FROZEN_IMPLEMENTATION_PENDING');
    expect(OPENAPI_SHA256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('maps all 94 public operations exactly once', () => {
    expect(CONTRACT_OPERATIONS).toHaveLength(94);
    expect(new Set(CONTRACT_OPERATIONS.map((operation) => operation.operationId)).size).toBe(94);
    expect(CONTRACT_OPERATIONS.filter((operation) => operation.kind === 'command').length).toBeGreaterThan(40);
  });

  it('replaces Telemetry Export operations with the complete Evidence Export surface', () => {
    const operationIds = new Set<string>(CONTRACT_OPERATIONS.map((operation) => operation.operationId));
    expect(operationIds.has('getTelemetryExportConfiguration')).toBe(false);
    expect(operationIds.has('publishTelemetryExportRevision')).toBe(false);
    expect(operationIds.has('getEvidenceExportConfiguration')).toBe(true);
    expect(operationIds.has('listEvidenceOutbox')).toBe(true);
    expect(operationIds.has('reconcileEvidenceCoverage')).toBe(true);
  });

  it('preserves Evidence decimal sequences as strings', () => {
    const legacyStatusSequence: EvidenceExportStatus['lastAcknowledgedSequence'] = '90071992547409931234';
    const currentStatusSequence: EvidenceOperations['globalAcknowledgedFrontier'] = '90071992547409931234';
    expect(legacyStatusSequence).toBe('90071992547409931234');
    expect(currentStatusSequence).toBe('90071992547409931234');
  });

  it('does not reintroduce forbidden telemetry or runtime paths', () => {
    const paths = CONTRACT_OPERATIONS.map((operation) => operation.path);
    for (const forbidden of forbiddenPaths) expect(paths).not.toContain(forbidden);
  });

  it('assigns a stable scope to every operation', () => {
    for (const operation of CONTRACT_OPERATIONS) expect(requiredScope(operation)).toMatch(/^[a-z0-9_]+\.(read|write|manage|control|recover)$/);
  });
});

describe('route inventory', () => {
  it('contains no placeholder route and every route parses', () => {
    expect(ROUTE_DEFINITIONS.length).toBeGreaterThanOrEqual(50);
    expect(ROUTE_DEFINITIONS.some((route) => route.id.includes('placeholder'))).toBe(false);
    for (const definition of ROUTE_DEFINITIONS) {
      const concrete = definition.pattern.replace(':id', 'sample').replace(':version', '1').replace(':revision', '1');
      expect(parseHash(`#${concrete}`).id).not.toBe('not-found');
    }
  });
});
