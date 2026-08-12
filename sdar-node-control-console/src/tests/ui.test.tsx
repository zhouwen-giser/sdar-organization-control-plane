import { describe, expect, it } from 'vitest';
import { formatTime } from '../components/ui';

describe('formatTime', () => {
  it('renders a valid authoritative timestamp', () => {
    expect(formatTime('2026-08-12T00:12:00.000Z')).not.toBe('—');
  });

  it.each(['', 'not-a-timestamp'])('does not crash on an absent or invalid timestamp: %j', (value) => {
    expect(formatTime(value)).toBe('—');
  });
});
