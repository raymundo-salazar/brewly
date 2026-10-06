const test = require('node:test');
const assert = require('node:assert/strict');
const { createMonitor } = require('../src/monitor');

const config = { startHour: 7, endHour: 17, timezone: 'America/Monterrey', idleThresholdSeconds: 540 };
const duringSchedule = () => new Date('2026-10-05T14:00:00.000Z'); // Monday, 08:00 in Monterrey.

test('executes the action only above the threshold', async () => {
  let calls = 0;
  let readings = 0;
  const monitor = createMonitor({
    powerMonitor: { getSystemIdleTime: () => (readings++ === 0 ? 541 : 0) },
    action: async () => { calls += 1; }, config, clock: duringSchedule, log: () => {},
  });
  assert.equal((await monitor.check()).status, 'action-executed');
  assert.equal(calls, 1);
  assert.equal(readings, 2);
});

test('does not execute the action below the threshold', async () => {
  let calls = 0;
  const monitor = createMonitor({
    powerMonitor: { getSystemIdleTime: () => 540 },
    action: async () => { calls += 1; }, config, clock: duringSchedule, log: () => {},
  });
  assert.equal((await monitor.check()).status, 'below-threshold');
  assert.equal(calls, 0);
});
