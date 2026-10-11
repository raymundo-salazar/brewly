import type { TimeZone } from './types';

const DEFAULT_TIMEZONE: TimeZone = 'America/Monterrey';

/**
 * @function formatParts
 * @description Extracts localized date and time parts using the configured IANA timezone.
 *
 * @param date - Instant to format.
 * @param timeZone - IANA timezone used for display.
 * @returns A map of formatted calendar and fractional-second fields.
 * @throws Throws when `timeZone` is not a valid IANA timezone.
 */
function formatParts(date: Date, timeZone: TimeZone): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

/**
 * @function formatTimestampForDisplay
 * @description Formats a UTC instant for human-readable output in the configured timezone.
 *
 * @param value - Date object or ISO timestamp to format.
 * @param timeZone - IANA timezone used for display.
 * @returns A localized timestamp with its timezone label, or the original value for an invalid date.
 * @throws Throws when `timeZone` is not a valid IANA timezone.
 *
 * @example
 * formatTimestampForDisplay('2026-01-01T12:00:00.000Z', 'America/Monterrey');
 */
export function formatTimestampForDisplay(
  value: Date | string,
  timeZone: TimeZone = DEFAULT_TIMEZONE,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const parts = formatParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${parts.fractionalSecond} [${timeZone}]`;
}

/**
 * @function formatStoredLogLine
 * @description Converts a stored UTC log line to the configured display timezone.
 *
 * @param line - Log line containing a UTC timestamp and message.
 * @param timeZone - IANA timezone used for display.
 * @returns The localized log line, or the original line when it has no recognized timestamp.
 * @throws Throws when a recognized timestamp is formatted with an invalid timezone.
 */
export function formatStoredLogLine(line: string, timeZone: TimeZone = DEFAULT_TIMEZONE): string {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) \| (.*)$/.exec(line);
  if (!match) return line;
  return `${formatTimestampForDisplay(match[1] ?? line, timeZone)} | ${match[2] ?? ''}`;
}

export { DEFAULT_TIMEZONE };
export type { TimeZone } from './types';
