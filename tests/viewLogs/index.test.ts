import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { formatStoredLogLine, parseArgs, readLastLines } from '../../scripts/viewLogs';

describe('viewLogs', () => {
  test('parses log options and reads the requested number of lines', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'brewly-log-view-'));
    const filePath = path.join(directory, 'app.log');
    fs.writeFileSync(filePath, 'one\ntwo\nthree\n');

    expect(parseArgs(['--follow', '--lines=2'])).toEqual({ follow: true, lines: 2 });
    expect(readLastLines(filePath, 2)).toEqual(['two', 'three']);
    expect(formatStoredLogLine('2026-01-15T15:04:05.123Z | two', 'America/New_York')).toBe(
      '2026-01-15T10:04:05.123 [America/New_York] | two',
    );
  });

  test('rejects invalid line counts', () => {
    expect(() => parseArgs(['--lines', '0'])).toThrow('--lines must be a positive integer');
  });
});
