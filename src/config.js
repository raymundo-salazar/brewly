const DEFAULTS = Object.freeze({
  intervalMs: 5 * 60 * 1000,
  idleThresholdSeconds: 9 * 60,
  startTime: '07:00',
  endTime: '17:00',
  days: [1, 3, 4, 5],
  timezone: 'America/Monterrey',
  logFile: null,
  action: 'hid-event',
});

const DAY_NAMES = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tuesday: 2, wed: 3, wednesday: 3, thu: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
const DAY_GROUPS = {
  all_week: [0, 1, 2, 3, 4, 5, 6],
  weekend: [0, 6],
  working_days: [1, 2, 3, 4, 5],
};

function parseTime(value, fallback) {
  const match = /^([0-2]?\d):([0-5]\d)$/.exec(value || '');
  if (!match || Number(match[1]) > 24 || (Number(match[1]) === 24 && Number(match[2]) !== 0)) return fallback;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function parseDays(value, fallback) {
  const group = DAY_GROUPS[String(value || '').trim().toLowerCase()];
  if (group) return group;

  const days = String(value || '').split(',').map((item) => {
    const normalized = item.trim().toLowerCase();
    return normalized in DAY_NAMES ? DAY_NAMES[normalized] : Number(normalized);
  }).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return days.length ? [...new Set(days)] : fallback;
}

/** Reads runtime configuration from environment variables. */
function loadConfig(env = process.env) {
  const number = (name, fallback) => {
    const value = Number(env[name]);
    return Number.isFinite(value) ? value : fallback;
  };

  const startTime = parseTime(env.IDLE_START_TIME || `${env.IDLE_START_HOUR || 7}:00`, DEFAULTS.startTime);
  const endTime = parseTime(env.IDLE_END_TIME || `${env.IDLE_END_HOUR || 17}:00`, DEFAULTS.endTime);
  return {
    intervalMs: number('IDLE_CHECK_INTERVAL_MS', DEFAULTS.intervalMs),
    idleThresholdSeconds: number('IDLE_THRESHOLD_SECONDS', DEFAULTS.idleThresholdSeconds),
    startTime,
    endTime,
    startMinutes: Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3)),
    endMinutes: Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3)),
    days: parseDays(env.IDLE_DAYS, DEFAULTS.days),
    timezone: env.IDLE_TIMEZONE || DEFAULTS.timezone,
    logFile: env.IDLE_LOG_FILE || DEFAULTS.logFile,
    action: env.IDLE_ACTION || DEFAULTS.action,
  };
}

module.exports = { DAY_GROUPS, DEFAULTS, loadConfig, parseDays, parseTime };
