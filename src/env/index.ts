import fs from 'node:fs';
import type { Environment } from './types';

/**
 * @function loadEnvFile
 * @description Loads `KEY=VALUE` entries without overriding variables already present.
 *
 * @param filePath - Path to the environment file.
 * @param environment - Mutable environment object to populate. Defaults to `process.env`.
 * @returns Nothing.
 * @throws Throws when the file exists but cannot be read.
 *
 * @example
 * const environment = {};
 * loadEnvFile('.env', environment);
 */
export function loadEnvFile(filePath: string, environment: Environment = process.env): void {
  if (!fs.existsSync(filePath)) return;

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    const key = match[1];
    const rawValue = match[2];
    if (!key || rawValue === undefined) continue;
    if (Object.prototype.hasOwnProperty.call(environment, key)) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    environment[key] = value;
  }
}

export type { Environment } from './types';
