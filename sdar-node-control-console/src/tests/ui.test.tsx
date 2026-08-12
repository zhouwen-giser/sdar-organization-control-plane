import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DefinitionList, formatTime } from '../components/ui';

describe('formatTime', () => {
  it('renders a valid authoritative timestamp', () => {
    expect(formatTime('2026-08-12T00:12:00.000Z')).not.toBe('—');
  });

  it.each(['', 'not-a-timestamp'])('does not crash on an absent or invalid timestamp: %j', (value) => {
    expect(formatTime(value)).toBe('—');
  });
});

describe('authoritative field rendering', () => {
  it('renders structured readiness reasons without object string coercion', () => {
    render(<DefinitionList fields={{
      reasons: [{
        code: 'PROVIDER_AVAILABILITY_EXPIRED',
        severity: 'blocking',
        dependencyRef: 'home-lab-light-mcp/light_get_state',
      }],
    }} />);

    expect(screen.getByText(/"code":"PROVIDER_AVAILABILITY_EXPIRED"/)).toBeInTheDocument();
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
  });
});
