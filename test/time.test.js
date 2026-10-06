const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createLogger } = require('../src/logger');
const { formatStoredLogLine, formatTimestampForDisplay } = require('../src/time');

test('formats UTC timestamps in the configured timezone', () => {
  const timestamp = '2026-01-15T15:04:05.123Z';
  assert.equal(
    formatTimestampForDisplay(timestamp, 'America/New_York'),
    '2026-01-15T10:04:05.123 [America/New_York]',
  );
  assert.equal(
    formatStoredLogLine(`${timestamp} | configuration changed`, 'America/New_York'),
    '2026-01-15T10:04:05.123 [America/New_York] | configuration changed',
  );
});

test('stores logger timestamps in UTC and displays them in the configured timezone', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mac-idle-keeper-time-'));
  const logFile = path.join(directory, 'app.log');
  const output = [];
  const log = createLogger(logFile, { log: (line) => output.push(line) }, { timezone: 'UTC' });

  log('test message');

  assert.match(fs.readFileSync(logFile, 'utf8'), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \| test message\n$/);
  assert.match(output[0], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3} \[UTC\] \| test message$/);
});
