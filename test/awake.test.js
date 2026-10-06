const test = require('node:test');
const assert = require('node:assert/strict');
const { createAwakeGuard } = require('../src/awake');

test('starts one caffeinate process inside the schedule and stops it outside', () => {
  const calls = [];
  const child = { once: () => {}, kill: (signal) => calls.push(['kill', signal]) };
  const guard = createAwakeGuard({
    spawnProcess: (...args) => { calls.push(args); return child; },
  });

  guard.setActive(true);
  guard.setActive(true);
  guard.setActive(false);

  assert.deepEqual(calls, [
    ['/usr/bin/caffeinate', ['-dimsu'], { stdio: 'ignore' }],
    ['kill', 'SIGTERM'],
  ]);
});
