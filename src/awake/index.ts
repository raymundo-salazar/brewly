import { spawn } from 'node:child_process';
import type { AwakeDependencies, AwakeGuard, ProcessHandle, SpawnProcess } from './types';

/**
 * @function createAwakeGuard
 * @description Creates a guard that keeps macOS awake while monitoring is inside its active schedule.
 *
 * @param dependencies - Optional process and logging adapters used for deterministic operation and tests.
 * @returns An awake guard with `setActive` and `stop` lifecycle methods.
 * @throws Does not throw during construction; process failures are reported through the configured logger.
 *
 * @method setActive - Enables the awake assertion for an active schedule or stops it otherwise.
 * @param active - Whether the current schedule is active.
 * @returns Nothing.
 *
 * @example
 * const guard = createAwakeGuard();
 * guard.setActive(true);
 * guard.stop();
 */
export function createAwakeGuard(dependencies: AwakeDependencies = {}): AwakeGuard {
  const spawnProcess: SpawnProcess =
    dependencies.spawnProcess ??
    ((command, args, options): ProcessHandle => spawn(command, args, options));
  const log = dependencies.log ?? ((): void => undefined);
  let processHandle: ProcessHandle | null = null;

  /**
   * @method start
   * @description Starts the awake assertion once for the current active schedule window.
   *
   * @returns Nothing.
   * @throws Does not throw; child-process errors are sent to the configured logger.
   */
  const start = (): void => {
    if (processHandle) return;
    processHandle = spawnProcess('/usr/bin/caffeinate', ['-dimsu'], { stdio: 'ignore' });
    processHandle.once('error', (error: unknown) => log(`caffeinate failed: ${String(error)}`));
    processHandle.once('exit', () => {
      processHandle = null;
    });
    log('awake guard started');
  };

  /**
   * @method stop
   * @description Stops the awake assertion and releases its child process.
   *
   * @returns Nothing.
   * @throws Does not throw when no awake process is running.
   */
  const stop = (): void => {
    if (!processHandle) return;
    processHandle.kill('SIGTERM');
    processHandle = null;
    log('awake guard stopped');
  };

  return {
    setActive: (active: boolean): void => (active ? start() : stop()),
    stop,
  };
}

export type { AwakeDependencies, AwakeGuard, ProcessHandle, SpawnProcess } from './types';
