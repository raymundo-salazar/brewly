import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Config } from '../config/types';
import type { PersistedAgentConfig } from './types';

const configDirectoryName = 'brewly';
const configFileName = 'agent-config.json';

/**
 * @function getAgentConfigPath
 * @description Resolves the persistent configuration snapshot used by the installed agent and power commands.
 *
 * @param homeDirectory - User home directory used to build the application-support path.
 * @returns The absolute path to the persisted agent configuration file.
 * @throws Does not throw for a valid home directory path.
 *
 * @example
 * getAgentConfigPath('/Users/example');
 * // '/Users/example/Library/Application Support/brewly/agent-config.json'
 */
export function getAgentConfigPath(homeDirectory: string = os.homedir()): string {
  return path.join(
    homeDirectory,
    'Library',
    'Application Support',
    configDirectoryName,
    configFileName,
  );
}

/**
 * @function writeAgentConfig
 * @description Writes the immutable configuration snapshot captured during agent installation or restart.
 *
 * @param filePath - Destination path for the JSON snapshot.
 * @param config - Effective monitor configuration parsed from the environment.
 * @param powerOnOffsetMinutes - Lead time used by the optional power schedule.
 * @param source - Environment file or source description used to create the snapshot.
 * @returns Nothing.
 * @throws Throws when the destination directory or file cannot be written.
 *
 * @example
 * writeAgentConfig('/tmp/agent-config.json', config, 5, '/Users/example/.env');
 */
export function writeAgentConfig(
  filePath: string,
  config: Config,
  powerOnOffsetMinutes: number,
  source: string,
): void {
  const snapshot: PersistedAgentConfig = {
    version: 1,
    createdAt: new Date().toISOString(),
    source,
    powerOnOffsetMinutes,
    config,
  };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(snapshot, null, 2)}\n`);
}

/**
 * @function readAgentConfig
 * @description Reads the persisted agent configuration without consulting `.env`.
 *
 * @param filePath - Snapshot path to read.
 * @returns The persisted snapshot, or `null` when it is missing or invalid.
 * @throws Does not throw; unavailable or malformed snapshots are treated as absent.
 *
 * @example
 * const snapshot = readAgentConfig('/tmp/agent-config.json');
 */
export function readAgentConfig(filePath: string): PersistedAgentConfig | null {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8')) as PersistedAgentConfig;
    if (
      value.version !== 1 ||
      typeof value.createdAt !== 'string' ||
      typeof value.source !== 'string' ||
      !Number.isFinite(value.powerOnOffsetMinutes) ||
      !value.config ||
      typeof value.config !== 'object'
    )
      return null;
    return value;
  } catch {
    return null;
  }
}

export type { PersistedAgentConfig } from './types';
