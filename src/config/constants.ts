import type { DefaultConfig } from './types';

/**
 * @constant DEFAULTS
 * @description Documented runtime defaults used when environment values are absent or invalid.
 */
export const DEFAULTS: Readonly<DefaultConfig> = Object.freeze({
  intervalMs: 5 * 60 * 1000,
  idleThresholdSeconds: 9 * 60,
  startTime: '07:00',
  endTime: '17:00',
  days: [1, 3, 4, 5],
  timezone: 'America/Monterrey',
  logFile: null,
  action: 'hid-event',
  powerOnOffsetMinutes: 5,
});

/**
 * @constant DAY_NAMES
 * @description Supported day names and their Sunday-based numeric values.
 */
export const DAY_NAMES: Readonly<Record<string, number>> = Object.freeze({
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
});

/**
 * @constant DAY_GROUPS
 * @description Supported aliases for common day groups.
 */
export const DAY_GROUPS: Readonly<Record<string, number[]>> = Object.freeze({
  all_week: [0, 1, 2, 3, 4, 5, 6],
  weekend: [0, 6],
  working_days: [1, 2, 3, 4, 5],
});
