import { formatStoredLogLine, formatTimestampForDisplay } from '../../src/time';

describe('Time', () => {
  test('formats UTC timestamps in the configured timezone', () => {
    const timestamp = '2026-01-15T15:04:05.123Z';
    expect(formatTimestampForDisplay(timestamp, 'America/New_York')).toBe(
      '2026-01-15T10:04:05.123 [America/New_York]',
    );
    expect(formatStoredLogLine(`${timestamp} | configuration changed`, 'America/New_York')).toBe(
      '2026-01-15T10:04:05.123 [America/New_York] | configuration changed',
    );
    expect(formatTimestampForDisplay(new Date(timestamp), 'UTC')).toBe(
      '2026-01-15T15:04:05.123 [UTC]',
    );
    expect(formatTimestampForDisplay(timestamp)).toContain('[America/Monterrey]');
    expect(formatStoredLogLine(`${timestamp} | default timezone`)).toContain('[America/Monterrey]');
  });

  test('leaves non-log lines unchanged and invalid dates readable', () => {
    expect(formatStoredLogLine('not a log line', 'UTC')).toBe('not a log line');
    expect(formatTimestampForDisplay('invalid', 'UTC')).toBe('invalid');
  });
});
