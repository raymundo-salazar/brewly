import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import type { ActivityAction } from './types';

/**
 * @function caffeinate
 * @description Requests a short macOS user-activity assertion without moving the pointer.
 *
 * @returns A promise that resolves when `caffeinate` exits successfully.
 * @throws Rejects when the process cannot start or exits with a non-zero status.
 *
 * @example
 * await caffeinate();
 */
export function caffeinate(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/caffeinate', ['-u', '-t', '1'], { stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`caffeinate exited with code ${code}`)),
    );
  });
}

/**
 * @function ensureHidEventHelper
 * @description Compiles the CoreGraphics helper on first use and returns its temporary path.
 *
 * @returns The absolute path to the compiled helper.
 * @throws Throws when the current platform is not macOS or compilation fails.
 */
function ensureHidEventHelper(): string {
  if (process.platform !== 'darwin')
    throw new Error('IDLE_ACTION=hid-event is only supported on macOS.');

  const source = path.join(__dirname, '..', '..', '..', 'scripts', 'idle-reset.m');
  const output = path.join(os.tmpdir(), 'mac-idle-keeper-hid-event-v6');
  if (!fs.existsSync(output)) {
    execFileSync('/usr/bin/clang', ['-framework', 'ApplicationServices', source, '-o', output], {
      stdio: 'ignore',
    });
  }
  return output;
}

/**
 * @function runHidEvent
 * @description Runs the native activity helper with the requested operating-system arguments.
 *
 * @param argumentsList - Arguments forwarded to the native helper.
 * @returns A promise that resolves when the helper exits successfully.
 * @throws Rejects when the helper cannot be compiled, started, or exits with an error.
 */
function runHidEvent(argumentsList: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    let helper: string;
    try {
      helper = ensureHidEventHelper();
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    const child = spawn(helper, argumentsList, { stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`hid-event exited with code ${code}`)),
    );
  });
}

/**
 * @function hidEvent
 * @description Moves the physical pointer gradually and posts mouse events.
 *
 * @returns A promise that resolves after the native activity event completes.
 * @throws Rejects when the macOS helper cannot run successfully.
 *
 * @example
 * await hidEvent();
 */
export function hidEvent(): Promise<void> {
  return runHidEvent([]);
}

/**
 * @function hidEventStatic
 * @description Posts a static HID event for compatibility and diagnostics.
 *
 * @returns A promise that resolves after the native activity event completes.
 * @throws Rejects when the macOS helper cannot run successfully.
 */
export function hidEventStatic(): Promise<void> {
  return runHidEvent(['--static']);
}

/**
 * @function createAction
 * @description Creates the configured operating-system activity action.
 *
 * @param name - Supported action name: `none`, `caffeinate`, `hid-event`, or `hid-event-static`.
 * @returns The activity action implementation for the requested name.
 * @throws Throws when the action name is not supported.
 *
 * @example
 * const action = createAction('hid-event');
 * await action();
 */
export function createAction(name: string): ActivityAction {
  if (name === 'none') return (): Promise<void> => Promise.resolve();
  if (name === 'caffeinate') return caffeinate;
  if (name === 'hid-event') return hidEvent;
  if (name === 'hid-event-static') return hidEventStatic;
  throw new Error(
    `Unsupported IDLE_ACTION: ${name}. Use "hid-event", "hid-event-static", "caffeinate", or "none".`,
  );
}

export type { ActivityAction, ActionName } from './types';
