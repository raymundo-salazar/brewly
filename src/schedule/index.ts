import type { Config } from '../config/types';
import type { ScheduleDate } from './types';

/**
 * @function isWithinSchedule
 * @description Returns whether a local schedule date falls inside the configured window.
 *
 * @param date - Calendar date encoded as UTC fields for deterministic schedule evaluation.
 * @param config - Effective schedule configuration.
 * @returns `true` when the configured day and time window are active.
 * @throws Does not throw for a valid schedule date and configuration.
 */
export function isWithinSchedule(date: ScheduleDate, config: Config): boolean {
  const day = date.getUTCDay();
  const allowedDay = config.days.includes(day);
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return allowedDay && minutes >= config.startMinutes && minutes < config.endMinutes;
}

/**
 * @function localDateInTimeZone
 * @description Encodes target-zone calendar fields as UTC fields for deterministic evaluation.
 *
 * @param now - Instant to convert.
 * @param timeZone - IANA timezone used to derive calendar fields.
 * @returns A date whose UTC fields represent the local date and time in the target zone.
 * @throws Throws when `timeZone` is not a valid IANA timezone.
 */
export function localDateInTimeZone(now: Date, timeZone: string): ScheduleDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return new Date(
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
    ),
  );
}

export type { ScheduleDate } from './types';
