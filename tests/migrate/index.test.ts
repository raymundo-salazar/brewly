import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  configPathFromPlist,
  migrationEnvironment,
  parseMigrationOptions,
} from '../../scripts/migrate';
import type { LegacyInstallation } from '../../scripts/migrate/types';

describe('Brewly migration helpers', () => {
  test('parses dry-run options', () => {
    expect(parseMigrationOptions(['--dry-run'])).toEqual({ dryRun: true });
    expect(() => parseMigrationOptions(['--unknown'])).toThrow('Unsupported migrate option');
  });

  test('extracts and decodes a legacy configuration path from a plist', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'brewly-migrate-plist-'));
    const plistPath = path.join(directory, 'legacy.plist');
    fs.writeFileSync(
      plistPath,
      '<key>IDLE_CONFIG_FILE</key><string>/Users/example/Library/Application Support/legacy&amp;config.json</string>',
    );

    expect(configPathFromPlist(plistPath)).toBe(
      '/Users/example/Library/Application Support/legacy&config.json',
    );
    expect(configPathFromPlist(path.join(directory, 'missing.plist'))).toBeNull();
  });

  test('converts the effective legacy configuration into explicit install values', () => {
    const legacySupportDirectory = '/Users/example/Library/Application Support/mac-idle-keeper';
    const config = {
      intervalMs: 300000,
      idleThresholdSeconds: 540,
      startTime: '07:00',
      endTime: '17:30',
      startMinutes: 420,
      endMinutes: 1050,
      days: [1, 3, 4, 5],
      timezone: 'America/Monterrey',
      logFile: null,
      action: 'hid-event',
      powerOnOffsetMinutes: 7,
    };
    const installation: LegacyInstallation = {
      paths: {
        legacyLabel: 'com.local.mac-idle-keeper',
        legacyPlistPath: '/Users/example/Library/LaunchAgents/com.local.mac-idle-keeper.plist',
        legacySupportDirectory,
        legacyConfigPath: `${legacySupportDirectory}/agent-config.json`,
        legacyLogDirectory: '/Users/example/Library/Logs/mac-idle-keeper',
        currentSupportDirectory: '/Users/example/Library/Application Support/brewly',
        currentConfigPath: '/Users/example/Library/Application Support/brewly/agent-config.json',
        currentLogDirectory: '/Users/example/Library/Logs/brewly',
      },
      snapshot: {
        version: 1,
        createdAt: '2026-10-14T00:00:00.000Z',
        source: 'legacy',
        powerOnOffsetMinutes: 7,
        config,
      },
      config,
      hasLegacyPlist: true,
      hasLegacyPowerState: true,
    };

    const environment = migrationEnvironment(installation);

    expect(environment.IDLE_CHECK_INTERVAL_MS).toBe('300000');
    expect(environment.IDLE_DAYS).toBe('1,3,4,5');
    expect(environment.IDLE_START_TIME).toBe('07:00');
    expect(environment.IDLE_END_TIME).toBe('17:30');
    expect(environment.IDLE_LOG_FILE).toBeUndefined();
    expect(environment.POWER_ON_OFFSET_MINUTES).toBe('7');
    expect(environment.IDLE_CONFIG_SOURCE).toBe('global');
  });
});
