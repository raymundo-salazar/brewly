import { DAY_GROUPS, DAY_NAMES, DEFAULTS } from './constants';
import type { Config, Environment } from './types';

/**
 * @function parseTime
 * @description Parses a configured `HH:MM` value and falls back when it is invalid.
 *
 * @param value - Candidate time value.
 * @param fallback - Value returned when the candidate is invalid.
 * @returns A normalized two-digit-hour time string.
 * @throws Does not throw; malformed values return the fallback.
 */
export function parseTime(value: string | undefined, fallback: string): string {
  const match = /^([0-2]?\d):([0-5]\d)$/.exec(value ?? '');
  if (!match || Number(match[1]) > 24 || (Number(match[1]) === 24 && Number(match[2]) !== 0)) {
    return fallback;
  }
  return `${(match[1] ?? '').padStart(2, '0')}:${match[2] ?? ''}`;
}

/**
 * @function parseDays
 * @description Parses day aliases, names, numeric values, and supported day groups.
 *
 * @param value - Comma-separated day configuration or group alias.
 * @param fallback - Day numbers returned when the candidate is empty or invalid.
 * @returns A de-duplicated list of day numbers from Sunday (`0`) through Saturday (`6`).
 * @throws Does not throw; malformed values return the fallback.
 */
export function parseDays(value: string | undefined, fallback: number[]): number[] {
  if (!value?.trim()) return [...fallback];

  const group =
    DAY_GROUPS[
      String(value ?? '')
        .trim()
        .toLowerCase()
    ];
  if (group) return [...group];

  const days = String(value ?? '')
    .split(',')
    .map((item) => {
      const normalized = item.trim().toLowerCase();
      return DAY_NAMES[normalized] ?? Number(normalized);
    })
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return days.length > 0 ? [...new Set(days)] : [...fallback];
}

/**
 * @function parsePowerOffset
 * @description Parses the number of minutes used to power on the Mac before the monitor schedule.
 *
 * @param value - Candidate `POWER_ON_OFFSET_MINUTES` value.
 * @returns An integer from zero through one day, or the documented default when invalid.
 * @throws Does not throw; malformed values return the documented default.
 *
 * @example
 * parsePowerOffset('10');
 * // 10
 */
export function parsePowerOffset(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 24 * 60
    ? parsed
    : DEFAULTS.powerOnOffsetMinutes;
}

/**
 * @function loadConfig
 * @description Reads environment values and returns the normalized runtime configuration.
 *
 * @param environment - Environment values to read. Defaults to `process.env`.
 * @returns The effective runtime configuration for the process lifetime.
 * @throws Does not throw for invalid individual values; invalid values use documented defaults.
 *
 * @example
 * const config = loadConfig({ IDLE_DAYS: 'working_days' });
 * console.log(config.days);
 */
export function loadConfig(environment: Environment = process.env): Config {
  /**
   * @function number
   * @description Parses a numeric environment value while preserving its documented default.
   *
   * @param name - Environment variable name.
   * @param fallback - Numeric value used when the variable is not finite.
   * @returns The parsed finite number or the fallback.
   * @throws Does not throw for malformed values.
   */
  const number = (name: string, fallback: number): number => {
    const value = Number(environment[name]);
    return Number.isFinite(value) ? value : fallback;
  };

  const startTime = parseTime(
    environment.IDLE_START_TIME ?? `${environment.IDLE_START_HOUR ?? 7}:00`,
    DEFAULTS.startTime,
  );
  const endTime = parseTime(
    environment.IDLE_END_TIME ?? `${environment.IDLE_END_HOUR ?? 17}:00`,
    DEFAULTS.endTime,
  );
  return {
    intervalMs: number('IDLE_CHECK_INTERVAL_MS', DEFAULTS.intervalMs),
    idleThresholdSeconds: number('IDLE_THRESHOLD_SECONDS', DEFAULTS.idleThresholdSeconds),
    startTime,
    endTime,
    startMinutes: Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3)),
    endMinutes: Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3)),
    days: parseDays(environment.IDLE_DAYS, DEFAULTS.days),
    timezone: environment.IDLE_TIMEZONE ?? DEFAULTS.timezone,
    logFile: environment.IDLE_LOG_FILE ?? DEFAULTS.logFile,
    action: environment.IDLE_ACTION ?? DEFAULTS.action,
    powerOnOffsetMinutes: parsePowerOffset(environment.POWER_ON_OFFSET_MINUTES),
  };
}

export { DAY_GROUPS, DEFAULTS, loadConfig as readConfig };
export type { Config, Environment } from './types';
