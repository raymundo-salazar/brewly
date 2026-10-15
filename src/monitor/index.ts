import { isWithinSchedule, localDateInTimeZone } from '../schedule';
import type { CheckResult, Monitor, MonitorDependencies } from './types';

/**
 * @function createMonitor
 * @description Coordinates schedule checks, idle readings, awake state, and activity actions.
 *
 * @param dependencies - Platform adapters, effective configuration, clock, and logger.
 * @returns A monitor exposing one asynchronous check operation.
 * @throws Throws when a dependency reports an invalid timezone or an activity action rejects.
 *
 * @example
 * const monitor = createMonitor({ powerMonitor, action, config, log });
 * const result = await monitor.check();
 */
export function createMonitor({
  powerMonitor,
  action,
  awakeGuard,
  config,
  log,
  clock = (): Date => new Date(),
}: MonitorDependencies): Monitor {
  /**
   * @method check
   * @description Evaluates the schedule, idle duration, awake guard, and configured activity action once.
   *
   * @returns The result of the monitor evaluation.
   * @throws Rejects when the activity action or schedule adapter fails.
   */
  async function check(): Promise<CheckResult> {
    const now = clock();
    const localNow = localDateInTimeZone(now, config.timezone);
    const inSchedule = isWithinSchedule(localNow, config);
    awakeGuard?.setActive(inSchedule);
    if (!inSchedule) {
      log('outside schedule; no action');
      return { status: 'outside-schedule' };
    }

    const idleSeconds = powerMonitor.getSystemIdleTime();
    log(`idle=${idleSeconds}s threshold=${config.idleThresholdSeconds}s`);
    if (idleSeconds > config.idleThresholdSeconds) {
      if (config.action === 'none') {
        log('idle threshold exceeded; activity action is disabled (IDLE_ACTION=none)');
        return { status: 'action-disabled', idleSeconds };
      }
      await action();
      const idleAfter = powerMonitor.getSystemIdleTime();
      log(
        `idle threshold exceeded; activity action executed (${config.action}); idleAfter=${idleAfter}s`,
      );
      return { status: 'action-executed', idleSeconds, idleAfter };
    }
    return { status: 'below-threshold', idleSeconds };
  }

  return { check };
}

export type {
  AwakeGuardApi,
  CheckResult,
  Monitor,
  MonitorClock,
  MonitorDependencies,
  MonitorLogger,
  MonitorStatus,
  PowerMonitorApi,
} from './types';
