const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');

/**
 * Requests a short user-activity assertion from macOS. It does not move the
 * pointer or type; macOS's built-in caffeinate utility performs the action.
 */
function caffeinate(options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/caffeinate', ['-u', '-t', '1'], {
      stdio: 'ignore',
    });
    child.once('error', reject);
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`caffeinate exited with code ${code}`))));
  });
}

function ensureHidEventHelper() {
  if (process.platform !== 'darwin') throw new Error('IDLE_ACTION=hid-event is only supported on macOS.');

  const source = path.join(__dirname, '..', 'scripts', 'idle-reset.m');
  const output = path.join(os.tmpdir(), 'mac-idle-keeper-hid-event-v5');
  if (!fs.existsSync(output)) execFileSync('/usr/bin/clang', ['-framework', 'ApplicationServices', source, '-o', output], { stdio: 'ignore' });
  return output;
}

function hidEvent() {
  return runHidEvent([]);
}

function hidEventStatic() {
  return runHidEvent(['--static']);
}

function runHidEvent(argumentsList) {
  return new Promise((resolve, reject) => {
    let helper;
    try { helper = ensureHidEventHelper(); } catch (error) { reject(error); return; }
    const child = spawn(helper, argumentsList, { stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`hid-event exited with code ${code}`))));
  });
}

function createAction(name) {
  if (name === 'none') return async () => {};
  if (name === 'caffeinate') return caffeinate;
  if (name === 'hid-event') return hidEvent;
  if (name === 'hid-event-static') return hidEventStatic;
  throw new Error(`Unsupported IDLE_ACTION: ${name}. Use "hid-event", "hid-event-static", "caffeinate", or "none".`);
}

module.exports = { caffeinate, createAction, hidEvent, hidEventStatic };
