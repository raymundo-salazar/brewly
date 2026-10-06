const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { recordConfigChanges } = require('../src/config-history');

const config = {
  intervalMs: 300000,
  idleThresholdSeconds: 540,
  startTime: '07:00',
  endTime: '17:00',
  days: [1, 3, 4, 5],
  timezone: 'America/Monterrey',
  action: 'hid-event',
  logFile: null,
};

test('records initialization and effective configuration changes', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mac-idle-keeper-config-'));
  const historyFile = path.join(directory, 'nested', 'config-history.json');
  const messages = [];

  assert.deepEqual(recordConfigChanges(historyFile, config, (message) => messages.push(message)), {
    changed: true,
    changes: [],
  });
  assert.match(messages[0], /^configuration initialized; IDLE_CHECK_INTERVAL_MS=300000/);

  messages.length = 0;
  const changedConfig = { ...config, endTime: '17:30', idleThresholdSeconds: 600, days: [0, 6] };
  const result = recordConfigChanges(historyFile, changedConfig, (message) => messages.push(message));

  assert.deepEqual(result.changes, [
    'IDLE_THRESHOLD_SECONDS: 540 -> 600',
    'IDLE_END_TIME: 17:00 -> 17:30',
    'IDLE_DAYS: mon,wed,thu,fri -> sun,sat',
  ]);
  assert.equal(messages[0], 'configuration changed; IDLE_THRESHOLD_SECONDS: 540 -> 600; IDLE_END_TIME: 17:00 -> 17:30; IDLE_DAYS: mon,wed,thu,fri -> sun,sat');
});
