import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { recordConfigChanges } from '../../src/configHistory';

const config = {
  intervalMs: 300000,
  idleThresholdSeconds: 540,
  startTime: '07:00',
  endTime: '17:00',
  startMinutes: 420,
  endMinutes: 1020,
  days: [1, 3, 4, 5],
  timezone: 'America/Monterrey',
  action: 'hid-event',
  logFile: null,
  powerOnOffsetMinutes: 5,
};

describe('ConfigHistory', () => {
  test('records initialization and effective configuration changes', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'brewly-config-'));
    const historyFile = path.join(directory, 'nested', 'config-history.json');
    const messages: string[] = [];

    expect(recordConfigChanges(historyFile, config, (message) => messages.push(message))).toEqual({
      changed: true,
      changes: [],
    });
    expect(messages[0]).toMatch(/^configuration initialized; IDLE_CHECK_INTERVAL_MS=300000/);

    messages.length = 0;
    const changedConfig = { ...config, endTime: '17:30', idleThresholdSeconds: 600, days: [0, 6] };
    const result = recordConfigChanges(historyFile, changedConfig, (message) =>
      messages.push(message),
    );
    expect(result.changes).toEqual([
      'IDLE_THRESHOLD_SECONDS: 540 -> 600',
      'IDLE_END_TIME: 17:00 -> 17:30',
      'IDLE_DAYS: mon,wed,thu,fri -> sun,sat',
    ]);
    expect(messages[0]).toContain('configuration changed;');
  });

  test('handles unchanged, malformed, and non-default log paths', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'brewly-config-'));
    const historyFile = path.join(directory, 'config-history.json');
    const messages: string[] = [];
    const configured = { ...config, logFile: '/tmp/brewly.log' };

    recordConfigChanges(historyFile, configured, (message) => messages.push(message));
    messages.length = 0;
    expect(
      recordConfigChanges(historyFile, configured, (message) => messages.push(message)),
    ).toEqual({ changed: false, changes: [] });
    expect(messages).toHaveLength(0);

    fs.writeFileSync(historyFile, '{not valid json');
    expect(
      recordConfigChanges(historyFile, config, (message) => messages.push(message)).changed,
    ).toBe(true);
    expect(messages.at(-1)).toContain('configuration initialized;');
  });

  test('renders unknown day numbers without losing their value', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'brewly-config-'));
    const historyFile = path.join(directory, 'config-history.json');
    const messages: string[] = [];
    recordConfigChanges(historyFile, { ...config, days: [9] }, (message) => messages.push(message));
    expect(messages[0]).toContain('IDLE_DAYS=9');
  });
});
