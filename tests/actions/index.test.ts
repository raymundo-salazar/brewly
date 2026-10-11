jest.mock('node:child_process', () => ({
  ...jest.requireActual('node:child_process'),
  spawn: jest.fn(),
  execFileSync: jest.fn(),
}));

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { caffeinate, createAction, hidEvent, hidEventStatic } from '../../src/actions';

describe('Actions', () => {
  test('creates a no-op action', async () => {
    await expect(createAction('none')()).resolves.toBeUndefined();
  });

  test('creates the supported action functions', () => {
    expect(createAction('caffeinate')).toBe(caffeinate);
    expect(createAction('hid-event')).toBe(hidEvent);
    expect(createAction('hid-event-static')).toBe(hidEventStatic);
  });

  test('rejects unsupported action names', () => {
    expect(() => createAction('unsupported')).toThrow('Unsupported IDLE_ACTION');
  });

  test('resolves when caffeinate exits successfully', async () => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const child = {
      once: jest.fn((event: string, listener: (...args: unknown[]) => void) => {
        listeners.set(event, listener);
      }),
    };
    (spawn as jest.Mock).mockReturnValueOnce(child);
    const promise = caffeinate();
    listeners.get('exit')?.(0);
    await expect(promise).resolves.toBeUndefined();
  });

  test('rejects when caffeinate emits an error', async () => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const child = {
      once: jest.fn((event: string, listener: (...args: unknown[]) => void) => {
        listeners.set(event, listener);
      }),
    };
    (spawn as jest.Mock).mockReturnValueOnce(child);
    const promise = caffeinate();
    listeners.get('error')?.(new Error('spawn failed'));
    await expect(promise).rejects.toThrow('spawn failed');
  });

  test('rejects when caffeinate exits unsuccessfully', async () => {
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const child = {
      once: jest.fn((event: string, listener: (...args: unknown[]) => void) => {
        listeners.set(event, listener);
      }),
    };
    (spawn as jest.Mock).mockReturnValueOnce(child);
    const promise = caffeinate();
    listeners.get('exit')?.(2);
    await expect(promise).rejects.toThrow('caffeinate exited with code 2');
  });

  test('rejects physical activity on unsupported platforms', async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'linux' });
    await expect(hidEvent()).rejects.toThrow('only supported on macOS');
    await expect(hidEventStatic()).rejects.toThrow('only supported on macOS');
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  test('runs the physical activity helper and reports helper failures', async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const child = {
      once: jest.fn((event: string, listener: (...args: unknown[]) => void) => {
        listeners.set(event, listener);
      }),
    };
    (spawn as jest.Mock).mockReturnValue(child);

    const running = hidEvent();
    listeners.get('exit')?.(0);
    await expect(running).resolves.toBeUndefined();
    expect(spawn).toHaveBeenLastCalledWith(expect.any(String), [], { stdio: 'ignore' });

    const failing = hidEventStatic();
    listeners.get('exit')?.(3);
    await expect(failing).rejects.toThrow('hid-event exited with code 3');
    expect(execFileSync).not.toHaveBeenCalled();

    jest.spyOn(fs, 'existsSync').mockRestore();
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  test('compiles the helper when it is not cached', async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const child = {
      once: jest.fn((event: string, listener: (...args: unknown[]) => void) => {
        listeners.set(event, listener);
      }),
    };
    (spawn as jest.Mock).mockReturnValueOnce(child);
    const promise = hidEvent();
    listeners.get('exit')?.(0);
    await expect(promise).resolves.toBeUndefined();
    expect(execFileSync).toHaveBeenCalledWith(
      '/usr/bin/clang',
      expect.arrayContaining(['-framework', 'ApplicationServices']),
      { stdio: 'ignore' },
    );
    jest.spyOn(fs, 'existsSync').mockRestore();
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });
});
