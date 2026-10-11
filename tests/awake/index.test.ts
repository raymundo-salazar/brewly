import { createAwakeGuard } from '../../src/awake';
import type { ProcessHandle } from '../../src/awake';

describe('Awake', () => {
  test('starts one caffeinate process inside schedule and stops it outside', () => {
    const calls: Array<unknown[]> = [];
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const child: ProcessHandle = {
      once: (event, listener): ProcessHandle => {
        listeners.set(event, listener);
        return child;
      },
      kill: (signal): boolean => {
        calls.push(['kill', signal]);
        return true;
      },
    };
    const guard = createAwakeGuard({
      spawnProcess: (...args) => {
        calls.push(args);
        return child;
      },
    });

    guard.setActive(true);
    guard.setActive(true);
    listeners.get('exit')?.();
    guard.setActive(true);
    guard.setActive(false);

    expect(calls).toEqual([
      ['/usr/bin/caffeinate', ['-dimsu'], { stdio: 'ignore' }],
      ['/usr/bin/caffeinate', ['-dimsu'], { stdio: 'ignore' }],
      ['kill', 'SIGTERM'],
    ]);
    listeners.get('error')?.(new Error('ignored test error'));
  });

  test('supports default dependencies and an already-stopped guard', () => {
    const guard = createAwakeGuard();
    expect(() => guard.stop()).not.toThrow();
  });
});
