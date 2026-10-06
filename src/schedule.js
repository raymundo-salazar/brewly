/**
 * Returns true only Monday and Wednesday through Friday during the configured
 * half-open local-time window [startHour, endHour).
 */
function isWithinSchedule(date, config) {
  // `localDateInTimeZone` encodes the target-zone calendar fields as UTC so
  // the result remains deterministic even when the process timezone differs.
  const day = date.getUTCDay(); // Sunday = 0; Tuesday = 2.
  const allowedDay = (config.days || [1, 3, 4, 5]).includes(day);
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const startMinutes = config.startMinutes ?? config.startHour * 60;
  const endMinutes = config.endMinutes ?? config.endHour * 60;
  return allowedDay && minutes >= startMinutes && minutes < endMinutes;
}

function localDateInTimeZone(now, timeZone) {
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
  return new Date(Date.UTC(
    Number(values.year), Number(values.month) - 1, Number(values.day),
    Number(values.hour), Number(values.minute), Number(values.second),
  ));
}

module.exports = { isWithinSchedule, localDateInTimeZone };
