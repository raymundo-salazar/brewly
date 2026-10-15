import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildPowerSchedule,
  extractRepeatingPowerEvents,
  formatPowerSchedule,
  getLaunchAgentPlistPath,
  isLaunchAgentInstalled,
  main,
  parsePowerArgs,
  parsePowerOffset,
  sudoRequiredMessage,
} from '../../scripts/managePower';
import type { Config } from '../../src/config/types';

const config: Config = {
  intervalMs: 300000,
  idleThresholdSeconds: 540,
  startTime: '07:00',
  endTime: '17:00',
  startMinutes: 420,
  endMinutes: 1020,
  days: [1, 3, 4, 5],
  timezone: 'America/Monterrey',
  logFile: null,
  action: 'hid-event',
  powerOnOffsetMinutes: 5,
};

describe('managePower', () => {
  test('parses safety flags and uses the documented offset fallback', () => {
    expect(parsePowerArgs(['--dry-run', '--force'])).toEqual({ dryRun: true, force: true });
    expect(parsePowerOffset('10')).toBe(10);
    expect(parsePowerOffset(undefined)).toBe(5);
    expect(parsePowerOffset('-1')).toBe(5);
    expect(parsePowerOffset('not-a-number')).toBe(5);
    expect(() => parsePowerArgs(['--unknown'])).toThrow('Unsupported power option');
  });

  test('derives the power-on event from the active monitor schedule', () => {
    const schedule = buildPowerSchedule(config, 5);

    expect(schedule).toMatchObject({
      weekdays: 'MWRF',
      time: '06:55:00',
      offsetMinutes: 5,
      timezone: 'America/Monterrey',
    });
    expect(formatPowerSchedule(schedule)).toBe('MWRF at 06:55:00 (5 minutes before 07:00)');
  });

  test('shifts scheduled weekdays when the offset crosses midnight', () => {
    const earlyConfig: Config = {
      ...config,
      startTime: '00:03',
      startMinutes: 3,
      days: [1],
    };

    expect(buildPowerSchedule(earlyConfig, 5)).toMatchObject({
      weekdays: 'U',
      time: '23:58:00',
    });
  });

  test('extracts repeating events without mistaking empty sections for schedules', () => {
    expect(
      extractRepeatingPowerEvents(
        'Scheduled power events:\n\nRepeating power events:\n  wakeorpoweron at 06:55:00 every MWRF\n',
      ),
    ).toEqual(['wakeorpoweron at 06:55:00 every MWRF']);
    expect(
      extractRepeatingPowerEvents(
        'Repeating power events:\n  No repeating power events scheduled.\n',
      ),
    ).toEqual([]);
    expect(extractRepeatingPowerEvents('No scheduled events.')).toEqual([]);
  });

  test('prints standalone power help without accessing pmset', () => {
    expect(() => main(['help'])).not.toThrow();
  });

  test('detects the LaunchAgent prerequisite from the user plist path', () => {
    const homeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'brewly-home-'));
    const plistPath = getLaunchAgentPlistPath(homeDirectory);

    expect(isLaunchAgentInstalled(homeDirectory)).toBe(false);
    fs.mkdirSync(path.dirname(plistPath), { recursive: true });
    fs.writeFileSync(plistPath, '');
    expect(isLaunchAgentInstalled(homeDirectory)).toBe(true);
  });

  test('explains the exact sudo command for protected power mutations', () => {
    expect(sudoRequiredMessage('enable')).toBe(
      'This command requires sudo. Re-run it as: sudo brewly power enable. No changes were made.',
    );
    expect(sudoRequiredMessage('disable')).toContain('sudo brewly power disable');
  });
});
