/** Lists the statuses recorded after a monitor check. */
export type CheckStatus =
  'starting' | 'outside-schedule' | 'action-disabled' | 'action-executed' | 'below-threshold';

/** Stores the effective configuration captured by a running process. */
export interface RuntimeConfig {
  intervalMs: number;
  idleThresholdSeconds: number;
  days: number[];
  startTime: string;
  endTime: string;
  timezone: string;
  action: string;
  logFile: string;
}

/** Stores process identity, configuration, and latest monitor information. */
export interface RuntimeState {
  pid: number;
  startedAt: string;
  config: RuntimeConfig;
  lastCheckAt?: string;
  lastCheckStatus?: CheckStatus;
  inSchedule?: boolean;
  updatedAt?: string;
}
