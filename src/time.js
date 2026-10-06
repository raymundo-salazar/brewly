const DEFAULT_TIMEZONE = 'America/Monterrey';

function formatParts(date, timeZone) {
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

/** Formats a UTC instant for human-readable output in the configured timezone. */
function formatTimestampForDisplay(value, timeZone = DEFAULT_TIMEZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const parts = formatParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${parts.fractionalSecond} [${timeZone}]`;
}

/** Converts a stored UTC log line to the configured display timezone. */
function formatStoredLogLine(line, timeZone = DEFAULT_TIMEZONE) {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) \| (.*)$/.exec(line);
  if (!match) return line;
  return `${formatTimestampForDisplay(match[1], timeZone)} | ${match[2]}`;
}

module.exports = { DEFAULT_TIMEZONE, formatStoredLogLine, formatTimestampForDisplay };
