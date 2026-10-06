const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readRuntimeState, removeRuntimeState, writeRuntimeState } = require('../src/runtime-state');

test('writes, reads, and removes runtime state', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mac-idle-keeper-'));
  const filePath = path.join(directory, 'nested', 'runtime-state.json');
  writeRuntimeState(filePath, { pid: 123, config: { action: 'hid-event' } });

  const state = readRuntimeState(filePath);
  assert.equal(state.pid, 123);
  assert.equal(state.config.action, 'hid-event');
  assert.ok(state.updatedAt);

  removeRuntimeState(filePath);
  assert.equal(readRuntimeState(filePath), null);
});
