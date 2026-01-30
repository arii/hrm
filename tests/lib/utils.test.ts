// tests/lib/utils.test.ts
import { formatDuration } from '../../lib/utils';

describe('formatDuration', () => {
  // Test cases for HH:MM:SS format
  it('should format duration from seconds to HH:MM:SS', () => {
    expect(formatDuration(3661, { unit: 'seconds', format: 'HH:MM:SS' })).toBe('01:01:01');
  });

  it('should format duration from milliseconds to HH:MM:SS', () => {
    expect(formatDuration(3661000, { unit: 'milliseconds', format: 'HH:MM:SS' })).toBe('01:01:01');
  });

  it('should handle zero duration in HH:MM:SS', () => {
    expect(formatDuration(0, { unit: 'seconds', format: 'HH:MM:SS' })).toBe('00:00:00');
  });

  it('should handle negative duration in HH:MM:SS', () => {
    expect(formatDuration(-10, { unit: 'seconds', format: 'HH:MM:SS' })).toBe('00:00:00');
  });

  it('should handle NaN duration in HH:MM:SS', () => {
    expect(formatDuration(NaN, { unit: 'seconds', format: 'HH:MM:SS' })).toBe('00:00:00');
  });

  // Test cases for MM:SS format
  it('should format duration from seconds to MM:SS', () => {
    expect(formatDuration(125, { unit: 'seconds', format: 'MM:SS' })).toBe('2:05');
  });

  it('should format duration from milliseconds to MM:SS', () => {
    expect(formatDuration(125000, { unit: 'milliseconds', format: 'MM:SS' })).toBe('2:05');
  });

  it('should handle duration over an hour in MM:SS', () => {
    expect(formatDuration(3661, { unit: 'seconds', format: 'MM:SS' })).toBe('61:01');
  });

  it('should handle zero duration in MM:SS', () => {
    expect(formatDuration(0, { unit: 'seconds', format: 'MM:SS' })).toBe('0:00');
  });

  it('should handle negative duration in MM:SS', () => {
    expect(formatDuration(-10, { unit: 'seconds', format: 'MM:SS' })).toBe('0:00');
  });

  it('should handle NaN duration in MM:SS', () => {
    expect(formatDuration(NaN, { unit: 'seconds', format: 'MM:SS' })).toBe('0:00');
  });

  // Default format test
  it('should default to HH:MM:SS format', () => {
    expect(formatDuration(3661, { unit: 'seconds' })).toBe('01:01:01');
  });
});
