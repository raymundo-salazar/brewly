import { DAY_GROUPS, DEFAULTS, loadConfig, parseDays, parseTime } from '../../src/config';

describe('Config', () => {
  test('parses valid and invalid time values', () => {
    expect(parseTime('7:30', '00:00')).toBe('07:30');
    expect(parseTime('24:00', '00:00')).toBe('24:00');
    expect(parseTime('24:01', '00:00')).toBe('00:00');
    expect(parseTime('invalid', '00:00')).toBe('00:00');
    expect(parseTime(undefined, '00:00')).toBe('00:00');
  });

  test('parses aliases, names, numbers, duplicates, and fallbacks', () => {
    expect(parseDays('all_week', [])).toEqual(DAY_GROUPS.all_week);
    expect(parseDays('weekend', [])).toEqual([0, 6]);
    expect(parseDays('working_days', [])).toEqual([1, 2, 3, 4, 5]);
    expect(parseDays('mon,3,mon,invalid,8', [])).toEqual([1, 3]);
    expect(parseDays(undefined, [1, 4])).toEqual([1, 4]);
    expect(parseDays('   ', [1, 4])).toEqual([1, 4]);
    expect(parseDays('invalid,8', [1, 4])).toEqual([1, 4]);
    expect(loadConfig({ POWER_ON_OFFSET_MINUTES: '10' }).powerOnOffsetMinutes).toBe(10);
    expect(loadConfig({ POWER_ON_OFFSET_MINUTES: '-1' }).powerOnOffsetMinutes).toBe(5);
  });

  test('loads defaults and legacy hour compatibility', () => {
    const config = loadConfig({ IDLE_START_HOUR: '9', IDLE_END_HOUR: '17' });
    expect(config).toMatchObject({
      intervalMs: DEFAULTS.intervalMs,
      idleThresholdSeconds: DEFAULTS.idleThresholdSeconds,
      startTime: '09:00',
      endTime: '17:00',
      timezone: DEFAULTS.timezone,
    });
    expect(config.startMinutes).toBe(540);
    expect(config.endMinutes).toBe(1020);
  });

  test('gives explicit time variables precedence over legacy hours', () => {
    const config = loadConfig({
      IDLE_START_HOUR: '9',
      IDLE_START_TIME: '09:30',
      IDLE_END_TIME: '17:30',
    });
    expect(config.startTime).toBe('09:30');
    expect(config.endTime).toBe('17:30');
  });

  test('uses fallbacks for invalid numeric and time values', () => {
    const config = loadConfig({
      IDLE_CHECK_INTERVAL_MS: 'not-a-number',
      IDLE_THRESHOLD_SECONDS: 'NaN',
      IDLE_START_TIME: '25:00',
      IDLE_END_TIME: '17:61',
      IDLE_DAYS: 'invalid',
    });
    expect(config.intervalMs).toBe(DEFAULTS.intervalMs);
    expect(config.idleThresholdSeconds).toBe(DEFAULTS.idleThresholdSeconds);
    expect(config.startTime).toBe(DEFAULTS.startTime);
    expect(config.endTime).toBe(DEFAULTS.endTime);
    expect(config.days).toEqual(DEFAULTS.days);
    expect(loadConfig()).toMatchObject({
      startTime: DEFAULTS.startTime,
      endTime: DEFAULTS.endTime,
    });
  });
});
