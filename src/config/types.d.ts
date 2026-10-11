/** Represents environment values used to build runtime configuration. */
export type Environment = Record<string, string | undefined>;

/** Describes the normalized immutable runtime configuration. */
export interface Config {
  intervalMs: number;
  idleThresholdSeconds: number;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  days: number[];
  timezone: string;
  logFile: string | null;
  action: string;
}

/** Describes the default values used by configuration loading. */
export interface DefaultConfig {
  intervalMs: number;
  idleThresholdSeconds: number;
  startTime: string;
  endTime: string;
  days: number[];
  timezone: string;
  logFile: string | null;
  action: string;
}
