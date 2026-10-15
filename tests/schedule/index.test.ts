import { parseDays } from '../../src/config';
import { isWithinSchedule, localDateInTimeZone } from '../../src/schedule';

const config = {
  startMinutes: 7 * 60,
  endMinutes: 17 * 60,
  days: [1, 3, 4, 5],
  intervalMs: 1,
  idleThresholdSeconds: 1,
  startTime: '07:00',
  endTime: '17:00',
  timezone: 'UTC',
  logFile: null,
  action: 'none',
  powerOnOffsetMinutes: 5,
};
const date = (day: number, hour: number): Date => new Date(Date.UTC(2026, 9, day, hour));

describe('Schedule', () => {
  test('allows configured days from the inclusive start', () => {
    for (const day of [5, 7, 8, 9]) expect(isWithinSchedule(date(day, 7), config)).toBe(true);
  });

  test('excludes disallowed days and the exclusive end', () => {
    for (const day of [6, 10, 11]) expect(isWithinSchedule(date(day, 10), config)).toBe(false);
    expect(isWithinSchedule(date(5, 17), config)).toBe(false);
  });

  test('supports custom days and half-hour windows', () => {
    const custom = { ...config, startMinutes: 9 * 60, endMinutes: 17 * 60 + 30, days: [2, 6] };
    expect(isWithinSchedule(date(6, 17), custom)).toBe(true);
    expect(isWithinSchedule(date(6, 17), { ...custom, endMinutes: 17 * 60 })).toBe(false);
    expect(isWithinSchedule(date(10, 10), custom)).toBe(true);
    expect(parseDays('working_days', [])).toEqual([1, 2, 3, 4, 5]);
  });

  test('converts a timestamp into deterministic local calendar fields', () => {
    const local = localDateInTimeZone(new Date('2026-10-05T14:00:00.000Z'), 'America/Monterrey');
    expect(local.getUTCDay()).toBe(1);
    expect(local.getUTCHours()).toBe(8);
  });
});
