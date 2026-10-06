const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { formatStoredLogLine, parseArgs, readLastLines } = require('../scripts/view-logs');

test('parses log options and reads the requested number of lines', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mac-idle-keeper-log-'));
  const filePath = path.join(directory, 'app.log');
  fs.writeFileSync(filePath, 'one\ntwo\nthree\n');

  assert.deepEqual(parseArgs(['--follow', '--lines=2']), { follow: true, lines: 2 });
  assert.deepEqual(readLastLines(filePath, 2), ['two', 'three']);
  assert.equal(
    formatStoredLogLine('2026-01-15T15:04:05.123Z | two', 'America/New_York'),
    '2026-01-15T10:04:05.123 [America/New_York] | two',
  );
});
