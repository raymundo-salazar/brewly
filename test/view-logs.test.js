const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseArgs, readLastLines } = require('../scripts/view-logs');

test('parses log options and reads the requested number of lines', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mac-idle-keeper-log-'));
  const filePath = path.join(directory, 'app.log');
  fs.writeFileSync(filePath, 'one\ntwo\nthree\n');

  assert.deepEqual(parseArgs(['--follow', '--lines=2']), { follow: true, lines: 2 });
  assert.deepEqual(readLastLines(filePath, 2), ['two', 'three']);
});
