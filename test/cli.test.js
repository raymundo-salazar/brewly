const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('global CLI prints help without starting Electron', () => {
  const cli = path.join(__dirname, '..', 'bin', 'mac-idle-keeper.js');
  const output = execFileSync(process.execPath, [cli, 'help'], { encoding: 'utf8' });

  assert.match(output, /mac-idle-keeper start/);
  assert.match(output, /launch-agent/);
  assert.match(output, /--env-file PATH/);
});
