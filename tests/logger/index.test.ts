import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createLogger } from '../../src/logger';

describe('Logger', () => {
  test('stores UTC timestamps and displays the configured timezone', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'brewly-log-'));
    const logFile = path.join(directory, 'app.log');
    const output: string[] = [];
    const log = createLogger(logFile, { log: (line) => output.push(line) }, { timezone: 'UTC' });
    log('test message');

    expect(fs.readFileSync(logFile, 'utf8')).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \| test message\n$/,
    );
    expect(output[0]).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3} \[UTC\] \| test message$/,
    );
  });

  test('uses tone branches for status messages', () => {
    const output: string[] = [];
    const log = createLogger(null, { log: (line) => output.push(line) }, { timezone: 'UTC' });
    for (const message of [
      'check failed',
      'idle threshold exceeded',
      'outside schedule',
      'started',
      'stopping',
      'executed',
      'other',
    ])
      log(message);
    expect(output).toHaveLength(7);
  });

  test('uses the default timezone when none is supplied', () => {
    const output: string[] = [];
    createLogger(null, { log: (line) => output.push(line) })('default timezone');
    expect(output[0]).toContain('[America/Monterrey]');
  });
});
