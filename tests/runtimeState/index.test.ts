import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readRuntimeState, removeRuntimeState, writeRuntimeState } from '../../src/runtimeState';

describe('RuntimeState', () => {
  test('writes, reads, and removes runtime state', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mac-idle-keeper-runtime-'));
    const filePath = path.join(directory, 'nested', 'runtime-state.json');
    const state = {
      pid: 123,
      startedAt: new Date().toISOString(),
      config: {
        intervalMs: 1,
        idleThresholdSeconds: 1,
        days: [1],
        startTime: '07:00',
        endTime: '17:00',
        timezone: 'UTC',
        action: 'none',
        logFile: '/tmp/app.log',
      },
    };

    writeRuntimeState(filePath, state);
    expect(readRuntimeState(filePath)).toMatchObject(state);
    expect(readRuntimeState(path.join(directory, 'missing.json'))).toBeNull();

    removeRuntimeState(filePath);
    expect(readRuntimeState(filePath)).toBeNull();
    expect(() => removeRuntimeState(filePath)).not.toThrow();
  });

  test('rethrows unexpected filesystem errors while removing state', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mac-idle-keeper-runtime-'));
    const filePath = path.join(directory, 'runtime-state.json');
    fs.writeFileSync(filePath, '{}');
    const unlink = jest.spyOn(fs, 'unlinkSync').mockImplementationOnce(() => {
      const error = new Error('permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      throw error;
    });
    expect(() => removeRuntimeState(filePath)).toThrow('permission denied');
    unlink.mockRestore();
  });
});
