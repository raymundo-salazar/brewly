import { createMonitor } from '../../src/monitor';

const config = {
  startHour: 7,
  endHour: 17,
  startMinutes: 7 * 60,
  endMinutes: 17 * 60,
  startTime: '07:00',
  endTime: '17:00',
  days: [1, 3, 4, 5],
  timezone: 'America/Monterrey',
  idleThresholdSeconds: 540,
  intervalMs: 1,
  logFile: null,
  action: 'hid-event',
};
const duringSchedule = (): Date => new Date('2026-10-05T14:00:00.000Z');

describe('Monitor', () => {
  test('executes the action only above the threshold and verifies idle time after', async () => {
    let calls = 0;
    let readings = 0;
    const monitor = createMonitor({
      powerMonitor: { getSystemIdleTime: () => (readings++ === 0 ? 541 : 0) },
      action: () => {
        calls += 1;
        return Promise.resolve();
      },
      config,
      clock: duringSchedule,
      log: () => undefined,
    });
    await expect(monitor.check()).resolves.toMatchObject({
      status: 'action-executed',
      idleSeconds: 541,
      idleAfter: 0,
    });
    expect(calls).toBe(1);
    expect(readings).toBe(2);
  });

  test('does not execute the action at or below the threshold', async () => {
    let calls = 0;
    const monitor = createMonitor({
      powerMonitor: { getSystemIdleTime: () => 540 },
      action: () => {
        calls += 1;
        return Promise.resolve();
      },
      config,
      clock: duringSchedule,
      log: () => undefined,
    });
    await expect(monitor.check()).resolves.toEqual({ status: 'below-threshold', idleSeconds: 540 });
    expect(calls).toBe(0);
  });

  test('disables action execution when configured as none', async () => {
    const monitor = createMonitor({
      powerMonitor: { getSystemIdleTime: () => 541 },
      action: () => Promise.reject(new Error('must not execute')),
      config: { ...config, action: 'none' },
      clock: duringSchedule,
      log: () => undefined,
    });
    await expect(monitor.check()).resolves.toEqual({ status: 'action-disabled', idleSeconds: 541 });
  });

  test('returns outside schedule without reading idle time', async () => {
    const monitor = createMonitor({
      powerMonitor: {
        getSystemIdleTime: () => {
          throw new Error('must not read');
        },
      },
      action: () => Promise.resolve(),
      config,
      clock: () => new Date('2026-10-06T14:00:00.000Z'),
      log: () => undefined,
    });
    await expect(monitor.check()).resolves.toEqual({ status: 'outside-schedule' });
  });

  test('updates the awake guard according to the schedule', async () => {
    const activeStates: boolean[] = [];
    const monitor = createMonitor({
      powerMonitor: { getSystemIdleTime: () => 0 },
      action: () => Promise.resolve(),
      awakeGuard: { setActive: (active) => activeStates.push(active) },
      config,
      clock: duringSchedule,
      log: () => undefined,
    });
    await monitor.check();
    expect(activeStates).toEqual([true]);
  });

  test('uses the default clock when no clock is supplied', () => {
    expect(() =>
      createMonitor({
        powerMonitor: { getSystemIdleTime: () => 0 },
        action: () => Promise.resolve(),
        config,
        log: () => undefined,
      }),
    ).not.toThrow();
  });
});
