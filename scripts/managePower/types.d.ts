/** Lists the power schedule commands supported by the CLI. */
export type PowerCommand = 'help' | '--help' | '-h' | 'status' | 'enable' | 'disable';

/** Describes a power schedule mutation that may require administrator authorization. */
export type PowerMutation = 'enable' | 'disable';

/** Stores destructive-operation safeguards for power schedule commands. */
export interface PowerCommandOptions {
  dryRun: boolean;
  force: boolean;
}

/** Describes the repeating macOS power-on event derived from monitor configuration. */
export interface PowerSchedule {
  weekdays: string;
  time: string;
  scheduledDays: number[];
  sourceDays: number[];
  startTime: string;
  offsetMinutes: number;
  timezone: string;
}

/** Stores the last power schedule managed by Mac Idle Keeper. */
export interface PowerScheduleState {
  appliedAt: string;
  command: string;
  weekdays: string;
  time: string;
  offsetMinutes: number;
  sourceDays: number[];
  startTime: string;
  timezone: string;
  previousSchedule: string | null;
}
