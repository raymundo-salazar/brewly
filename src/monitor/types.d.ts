import type { ActivityAction } from '../actions/types';
import type { Config } from '../config/types';

/** Provides the Electron idle-time reading used by the monitor. */
export interface PowerMonitorApi {
  getSystemIdleTime(): number;
}

/** Provides the awake guard operation used by the monitor. */
export interface AwakeGuardApi {
  setActive(active: boolean): void;
}

/** Supplies the current time for monitor checks. */
export type MonitorClock = () => Date;

/** Records monitor lifecycle and evaluation messages. */
export type MonitorLogger = (message: string) => void;

/** Lists the possible results of one monitor check. */
export type MonitorStatus =
  'outside-schedule' | 'action-disabled' | 'action-executed' | 'below-threshold';

/** Describes the outcome of one monitor check. */
export interface CheckResult {
  status: MonitorStatus;
  idleSeconds?: number;
  idleAfter?: number;
}

/** Groups adapters and configuration required to create a monitor. */
export interface MonitorDependencies {
  powerMonitor: PowerMonitorApi;
  action: ActivityAction;
  awakeGuard?: AwakeGuardApi;
  config: Config;
  log: MonitorLogger;
  clock?: MonitorClock;
}

/** Exposes the monitor check operation. */
export interface Monitor {
  check(): Promise<CheckResult>;
}
