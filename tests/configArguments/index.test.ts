import {
  parseConfigurationArguments,
  configurationEnvironmentNames,
} from '../../src/configArguments';

describe('configArguments', () => {
  test('parses every supported configuration option and preserves command arguments', () => {
    const parsed = parseConfigurationArguments(
      [
        '--idle-check-interval-ms=10000',
        '--idle-threshold-seconds',
        '9',
        '--idle-days',
        'working_days',
        '--idle-start-time',
        '07:30',
        '--idle-end-time=17:30',
        '--idle-start-hour',
        '7',
        '--idle-end-hour',
        '17',
        '--idle-timezone',
        'America/Monterrey',
        '--idle-action',
        'hid-event',
        '--idle-log-file',
        '/tmp/mac-idle-keeper.log',
        '--power-on-offset-minutes=10',
        'restart',
        '--follow',
      ],
      {},
    );

    expect(parsed.remaining).toEqual(['restart', '--follow']);
    expect(parsed.configurationOverrides).toEqual({
      IDLE_CHECK_INTERVAL_MS: '10000',
      IDLE_THRESHOLD_SECONDS: '9',
      IDLE_DAYS: 'working_days',
      IDLE_START_TIME: '07:30',
      IDLE_END_TIME: '17:30',
      IDLE_START_HOUR: '7',
      IDLE_END_HOUR: '17',
      IDLE_TIMEZONE: 'America/Monterrey',
      IDLE_ACTION: 'hid-event',
      IDLE_LOG_FILE: '/tmp/mac-idle-keeper.log',
      POWER_ON_OFFSET_MINUTES: '10',
    });
    expect(configurationEnvironmentNames).toHaveLength(11);
  });

  test('resolves an explicit environment file and marks it as explicit', () => {
    const parsed = parseConfigurationArguments(['--env-file', './config/test.env'], {});

    expect(parsed.hasExplicitEnvironmentFile).toBe(true);
    expect(parsed.environment.IDLE_ENV_FILE).toEqual(expect.stringContaining('/config/test.env'));
    expect(parsed.environment.IDLE_ENV_FILE_EXPLICIT).toBe('1');
  });

  test('rejects options without values', () => {
    expect(() => parseConfigurationArguments(['--idle-days'], {})).toThrow(
      '--idle-days requires a value.',
    );
    expect(() => parseConfigurationArguments(['--env-file'], {})).toThrow(
      '--env-file requires a path.',
    );
  });

  test('preserves unrelated options, including names inherited from Object.prototype', () => {
    const parsed = parseConfigurationArguments(['--toString', '--follow'], {
      IDLE_DAYS: 'weekend',
    });

    expect(parsed.remaining).toEqual(['--toString', '--follow']);
    expect(parsed.environment.IDLE_DAYS).toBe('weekend');
  });
});
