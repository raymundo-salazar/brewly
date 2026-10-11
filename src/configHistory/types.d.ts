import type { Config } from '../config/types';

/** Stores the effective configuration values persisted between process starts. */
export interface ConfigSnapshot {
  intervalMs: number;
  idleThresholdSeconds: number;
  startTime: string;
  endTime: string;
  days: number[];
  timezone: string;
  action: string;
  logFile: string | null;
}

/** Describes whether configuration initialization or changes were recorded. */
export interface ConfigChangeResult {
  changed: boolean;
  changes: string[];
}

/** Identifies the source shape used to create a configuration snapshot. */
export type ConfigSnapshotSource = Config;
