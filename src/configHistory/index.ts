import fs from 'node:fs';
import path from 'node:path';
import type { Config } from '../config/types';
import type { ConfigChangeResult, ConfigSnapshot } from './types';

const CONFIG_FIELDS: ReadonlyArray<[keyof ConfigSnapshot, string]> = [
  ['intervalMs', 'IDLE_CHECK_INTERVAL_MS'],
  ['idleThresholdSeconds', 'IDLE_THRESHOLD_SECONDS'],
  ['startTime', 'IDLE_START_TIME'],
  ['endTime', 'IDLE_END_TIME'],
  ['days', 'IDLE_DAYS'],
  ['timezone', 'IDLE_TIMEZONE'],
  ['action', 'IDLE_ACTION'],
  ['logFile', 'IDLE_LOG_FILE'],
  ['powerOnOffsetMinutes', 'POWER_ON_OFFSET_MINUTES'],
];

/**
 * @function snapshotConfig
 * @description Creates a stable snapshot of effective configuration values.
 *
 * @param config - Effective runtime configuration.
 * @returns A serializable configuration snapshot with normalized day ordering.
 * @throws Does not throw for a valid configuration.
 */
export function snapshotConfig(config: Config): ConfigSnapshot {
  return {
    intervalMs: config.intervalMs,
    idleThresholdSeconds: config.idleThresholdSeconds,
    startTime: config.startTime,
    endTime: config.endTime,
    days: [...config.days].sort((left, right) => left - right),
    timezone: config.timezone,
    action: config.action,
    logFile: config.logFile || null,
    powerOnOffsetMinutes: config.powerOnOffsetMinutes,
  };
}

/**
 * @function readSnapshot
 * @description Reads a previous configuration snapshot, treating missing or invalid state as absent.
 *
 * @param filePath - Snapshot file to read.
 * @returns The parsed snapshot, or `null` when it is unavailable or invalid.
 * @throws Does not throw; file and parsing errors are treated as absent state.
 */
function readSnapshot(filePath: string): ConfigSnapshot | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as ConfigSnapshot;
  } catch {
    return null;
  }
}

/**
 * @function displayValue
 * @description Formats one configuration field for an operator-facing change message.
 *
 * @param key - Configuration field being formatted.
 * @param value - Field value from a configuration snapshot.
 * @returns A human-readable field value.
 * @throws Does not throw for snapshot values produced by `snapshotConfig`.
 */
function displayValue(
  key: keyof ConfigSnapshot,
  value: ConfigSnapshot[keyof ConfigSnapshot],
): string {
  if (key === 'days' && Array.isArray(value)) {
    return value
      .map((day) => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][day] ?? String(day))
      .join(',');
  }
  if (key === 'logFile') return value ? String(value) : '(default)';
  return String(value);
}

/**
 * @function describeSnapshot
 * @description Formats a complete configuration snapshot for the initialization message.
 *
 * @param snapshot - Snapshot to format.
 * @returns A comma-separated configuration description.
 * @throws Does not throw for a valid configuration snapshot.
 */
function describeSnapshot(snapshot: ConfigSnapshot): string {
  return CONFIG_FIELDS.map(([key, name]) => `${name}=${displayValue(key, snapshot[key])}`).join(
    ', ',
  );
}

/**
 * @function changedFields
 * @description Returns the effective configuration fields that changed between two starts.
 *
 * @param previous - Previously persisted configuration snapshot.
 * @param current - Current configuration snapshot.
 * @returns Human-readable descriptions for changed fields.
 * @throws Does not throw for valid snapshots.
 */
function changedFields(previous: ConfigSnapshot, current: ConfigSnapshot): string[] {
  return CONFIG_FIELDS.filter(
    ([key]) => JSON.stringify(previous[key]) !== JSON.stringify(current[key]),
  ).map(
    ([key, name]) =>
      `${name}: ${displayValue(key, previous[key])} -> ${displayValue(key, current[key])}`,
  );
}

/**
 * @function recordConfigChanges
 * @description Records the effective configuration's first initialization or subsequent changes.
 *
 * @param filePath - Path to the persisted configuration snapshot.
 * @param config - Effective configuration to record.
 * @param log - Logger used for initialization and change messages.
 * @returns Whether the configuration was initialized or changed, plus changed field descriptions.
 * @throws Throws when the snapshot directory or file cannot be written.
 */
export function recordConfigChanges(
  filePath: string,
  config: Config,
  log: (message: string) => void,
): ConfigChangeResult {
  const current = snapshotConfig(config);
  const previous = readSnapshot(filePath);
  const changes = previous ? changedFields(previous, current) : [];

  if (!previous) log(`configuration initialized; ${describeSnapshot(current)}`);
  else if (changes.length > 0) log(`configuration changed; ${changes.join('; ')}`);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(current, null, 2)}\n`);
  return { changed: !previous || changes.length > 0, changes };
}

export type { ConfigChangeResult, ConfigSnapshot } from './types';
