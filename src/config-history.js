const fs = require('node:fs');
const path = require('node:path');

const CONFIG_FIELDS = [
  ['intervalMs', 'IDLE_CHECK_INTERVAL_MS'],
  ['idleThresholdSeconds', 'IDLE_THRESHOLD_SECONDS'],
  ['startTime', 'IDLE_START_TIME'],
  ['endTime', 'IDLE_END_TIME'],
  ['days', 'IDLE_DAYS'],
  ['timezone', 'IDLE_TIMEZONE'],
  ['action', 'IDLE_ACTION'],
  ['logFile', 'IDLE_LOG_FILE'],
];

function snapshotConfig(config) {
  return {
    intervalMs: config.intervalMs,
    idleThresholdSeconds: config.idleThresholdSeconds,
    startTime: config.startTime,
    endTime: config.endTime,
    days: [...config.days].sort((left, right) => left - right),
    timezone: config.timezone,
    action: config.action,
    logFile: config.logFile || null,
  };
}

function readSnapshot(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function displayValue(key, value) {
  if (key === 'days') return value.map((day) => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][day]).join(',');
  if (key === 'logFile') return value || '(default)';
  return String(value);
}

function describeSnapshot(snapshot) {
  return CONFIG_FIELDS.map(([key, name]) => `${name}=${displayValue(key, snapshot[key])}`).join(', ');
}

function changedFields(previous, current) {
  return CONFIG_FIELDS
    .filter(([key]) => JSON.stringify(previous[key]) !== JSON.stringify(current[key]))
    .map(([key, name]) => `${name}: ${displayValue(key, previous[key])} -> ${displayValue(key, current[key])}`);
}

/** Records the effective configuration and logs its first initialization or changes. */
function recordConfigChanges(filePath, config, log) {
  const current = snapshotConfig(config);
  const previous = readSnapshot(filePath);
  const changes = previous ? changedFields(previous, current) : [];

  if (!previous) log(`configuration initialized; ${describeSnapshot(current)}`);
  else if (changes.length) log(`configuration changed; ${changes.join('; ')}`);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(current, null, 2)}\n`);
  return { changed: !previous || changes.length > 0, changes };
}

module.exports = { recordConfigChanges, snapshotConfig };
