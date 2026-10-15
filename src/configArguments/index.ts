import path from 'node:path';
import type { ParsedConfigurationArguments } from './types';

const configurationOptions: Readonly<Record<string, string>> = Object.freeze({
  '--idle-check-interval-ms': 'IDLE_CHECK_INTERVAL_MS',
  '--idle-threshold-seconds': 'IDLE_THRESHOLD_SECONDS',
  '--idle-days': 'IDLE_DAYS',
  '--idle-start-time': 'IDLE_START_TIME',
  '--idle-end-time': 'IDLE_END_TIME',
  '--idle-start-hour': 'IDLE_START_HOUR',
  '--idle-end-hour': 'IDLE_END_HOUR',
  '--idle-timezone': 'IDLE_TIMEZONE',
  '--idle-action': 'IDLE_ACTION',
  '--idle-log-file': 'IDLE_LOG_FILE',
  '--power-on-offset-minutes': 'POWER_ON_OFFSET_MINUTES',
});

/**
 * @constant configurationEnvironmentNames
 * @description Lists the environment keys accepted as explicit CLI configuration overrides.
 */
export const configurationEnvironmentNames: readonly string[] = Object.freeze(
  Object.values(configurationOptions),
);

/**
 * @function parseConfigurationArguments
 * @description Extracts environment-file and runtime-configuration options from CLI arguments.
 * Configuration options are converted to environment keys so the existing configuration loader
 * remains the single normalization boundary for foreground and background operation.
 *
 * @param args - Raw command arguments to inspect.
 * @param baseEnvironment - Values used as the initial environment before applying CLI overrides.
 * @returns Parsed environment values, explicit configuration overrides, and unrelated arguments.
 * @throws Throws when an option requires a value but none is supplied.
 *
 * @example
 * parseConfigurationArguments(['--idle-days', 'working_days', 'status']);
 * // { environment: { IDLE_DAYS: 'working_days' }, remaining: ['status'], ... }
 */
export function parseConfigurationArguments(
  args: string[],
  baseEnvironment: Record<string, string | undefined> = process.env,
): ParsedConfigurationArguments {
  const environment: Record<string, string | undefined> = { ...baseEnvironment };
  const configurationOverrides: Record<string, string> = {};
  const remaining: string[] = [];
  let hasExplicitEnvironmentFile = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument) continue;

    const equalsIndex = argument.indexOf('=');
    const option = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : argument.slice(equalsIndex + 1);

    if (option === '--env-file') {
      const value = inlineValue ?? args[++index];
      if (!value) throw new Error('--env-file requires a path.');
      environment.IDLE_ENV_FILE = path.resolve(process.cwd(), value);
      environment.IDLE_ENV_FILE_EXPLICIT = '1';
      hasExplicitEnvironmentFile = true;
      continue;
    }

    const environmentName = Object.prototype.hasOwnProperty.call(configurationOptions, option)
      ? configurationOptions[option]
      : undefined;
    if (environmentName) {
      const value = inlineValue ?? args[++index];
      if (value === undefined) throw new Error(`${option} requires a value.`);
      environment[environmentName] = value;
      configurationOverrides[environmentName] = value;
      continue;
    }

    remaining.push(argument);
  }

  return { environment, configurationOverrides, remaining, hasExplicitEnvironmentFile };
}

export type { ParsedConfigurationArguments } from './types';
