const { spawn } = require('node:child_process');

/** Keeps macOS awake while the monitor is inside its active schedule. */
function createAwakeGuard({ spawnProcess = spawn, log = () => {} } = {}) {
  let processHandle = null;

  function start() {
    if (processHandle) return;
    processHandle = spawnProcess('/usr/bin/caffeinate', ['-dimsu'], { stdio: 'ignore' });
    processHandle.once('error', (error) => log(`caffeinate failed: ${error.message}`));
    processHandle.once('exit', () => { processHandle = null; });
    log('awake guard started');
  }

  function stop() {
    if (!processHandle) return;
    processHandle.kill('SIGTERM');
    processHandle = null;
    log('awake guard stopped');
  }

  function setActive(active) {
    if (active) start();
    else stop();
  }

  return { setActive, stop };
}

module.exports = { createAwakeGuard };
