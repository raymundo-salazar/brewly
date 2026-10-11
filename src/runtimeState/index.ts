import fs from 'node:fs';
import path from 'node:path';
import type { RuntimeState } from './types';

/**
 * @function writeRuntimeState
 * @description Writes runtime state for local status inspection.
 *
 * @param filePath - Destination JSON file.
 * @param state - Runtime state to serialize.
 * @returns Nothing.
 * @throws Throws when the destination directory or file cannot be written.
 */
export function writeRuntimeState(filePath: string, state: RuntimeState): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)}\n`,
  );
}

/**
 * @function removeRuntimeState
 * @description Removes runtime state while tolerating an already-stopped process.
 *
 * @param filePath - Runtime state file to remove.
 * @returns Nothing.
 * @throws Throws for filesystem errors other than a missing file.
 */
export function removeRuntimeState(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

/**
 * @function readRuntimeState
 * @description Reads runtime state or returns `null` when the process is not active or the file is invalid.
 *
 * @param filePath - Runtime state file to read.
 * @returns Parsed runtime state, or `null` when unavailable.
 * @throws Does not throw; read and parse errors are treated as unavailable state.
 */
export function readRuntimeState(filePath: string): RuntimeState | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as RuntimeState;
  } catch {
    return null;
  }
}

export type { CheckStatus, RuntimeConfig, RuntimeState } from './types';
