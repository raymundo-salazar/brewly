#!/usr/bin/env node

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import electronModule from 'electron';
import { error, header, info, item, section } from '../../src/cliOutput';
import {
  configurationEnvironmentNames,
  parseConfigurationArguments,
} from '../../src/configArguments';

const packageRoot = path.resolve(__dirname, '..', '..', '..');
const electronPath = electronModule as unknown as string;
const electronMainPath = path.join(packageRoot, 'dist', 'src', 'main', 'index.js');

/**
 * @function printHelp
 * @description Prints the global CLI usage and command examples.
 *
 * @returns Nothing; usage text is written to standard output.
 * @throws Does not throw during normal terminal output.
 */
function printHelp(): void {
  header('Mac Idle Keeper — Command line interface');
  section('Usage');
  item('mac-idle-keeper <command> [options]');
  section('Commands');
  info('start', 'Start the monitor in the current session.');
  info('agent', 'Short alias for LaunchAgent management.');
  info('launch-agent', 'Install and manage the background LaunchAgent.');
  info('power', 'Inspect and manage scheduled macOS wake or power-on events.');
  info('logs', 'Show recent application logs or follow them live.');
  info('help', 'Show this command reference.');
  section('LaunchAgent actions');
  item('agent <action> | launch-agent <action>');
  item('Actions: install | status | logs | start | stop | pause | resume | restart | uninstall');
  section('Power schedule actions');
  item('power: status | enable | disable');
  section('Options');
  info('--env-file PATH', 'Explicitly load a configuration file (optional local override).');
  info('--idle-check-interval-ms N', 'Polling interval in milliseconds.');
  info('--idle-threshold-seconds N', 'Idle threshold in seconds.');
  info('--idle-days VALUE', 'Days: all_week, weekend, working_days, or a list.');
  info('--idle-start-time HH:MM', 'Schedule start time.');
  info('--idle-end-time HH:MM', 'Schedule end time.');
  info('--idle-start-hour H', 'Schedule start hour when no start time is supplied.');
  info('--idle-end-hour H', 'Schedule end hour when no end time is supplied.');
  info('--idle-timezone ZONE', 'IANA timezone used by the monitor.');
  info('--idle-action NAME', 'Operating-system activity action.');
  info('--idle-log-file PATH', 'Application log path, or empty for the default path.');
  info('--power-on-offset-minutes N', 'Minutes before the monitor schedule for power-on.');
  info('--follow', 'Continue displaying new log entries.');
  info('--lines N', 'Display the last N log entries.');
  section('Examples');
  item('mac-idle-keeper start');
  item('mac-idle-keeper agent status');
  item('mac-idle-keeper launch-agent install');
  item('mac-idle-keeper power enable --dry-run');
  item('mac-idle-keeper power status');
  item('mac-idle-keeper agent install --idle-days working_days --idle-start-time 07:00');
  item('mac-idle-keeper launch-agent --help');
  item('mac-idle-keeper logs --follow');
}

/**
 * @function run
 * @description Runs a child command while preserving its interactive output.
 *
 * @param command - Executable path to launch.
 * @param args - Arguments passed to the executable.
 * @param environment - Environment passed to the child process.
 * @returns Nothing; the parent process exit code receives the child status.
 * @throws Throws when the child process cannot be started.
 */
function run(command: string, args: string[], environment: NodeJS.ProcessEnv = process.env): void {
  const result = spawnSync(command, args, { stdio: 'inherit', env: environment });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

/**
/**
 * @function main
 * @description Dispatches a parsed global CLI command.
 *
 * @param args - Raw arguments after the executable name.
 * @returns Nothing; child commands receive their own process lifecycle.
 * @throws Throws for unknown commands or invalid command arguments.
 *
 * @example
 * // mac-idle-keeper launch-agent status
 */
function main(args: string[]): void {
  const parsed = parseConfigurationArguments(args);
  const { environment, remaining } = parsed;
  const [command = 'start', ...commandArgs] = remaining;
  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'start') {
    run(electronPath, [electronMainPath, ...commandArgs], environment);
    return;
  }

  if (command === 'logs') {
    run(
      process.execPath,
      [path.join(packageRoot, 'dist', 'scripts', 'viewLogs', 'index.js'), ...commandArgs],
      environment,
    );
    return;
  }

  if (command === 'launch-agent' || command === 'agent') {
    const [action, ...actionArgs] = commandArgs;
    if (!action)
      throw new Error(
        `${command} requires an action. Run mac-idle-keeper ${command} --help for usage.`,
      );
    if (action === 'install' || action === 'restart') {
      environment.IDLE_CONFIG_SOURCE = 'global';
      for (const key of configurationEnvironmentNames) delete environment[key];
      delete environment.IDLE_ENV_FILE;
      delete environment.IDLE_ENV_FILE_EXPLICIT;
      for (const key of Object.keys(parsed.configurationOverrides)) {
        environment[key] = parsed.configurationOverrides[key];
      }
      if (parsed.hasExplicitEnvironmentFile) {
        environment.IDLE_ENV_FILE = parsed.environment.IDLE_ENV_FILE;
        environment.IDLE_ENV_FILE_EXPLICIT = '1';
      }
    }
    if (action === 'install') {
      run(
        process.execPath,
        [path.join(packageRoot, 'dist', 'scripts', 'installLaunchAgent', 'index.js')],
        environment,
      );
      return;
    }
    if (action === 'logs') {
      run(
        process.execPath,
        [path.join(packageRoot, 'dist', 'scripts', 'viewLogs', 'index.js'), ...actionArgs],
        environment,
      );
      return;
    }
    run(
      process.execPath,
      [
        path.join(packageRoot, 'dist', 'scripts', 'manageLaunchAgent', 'index.js'),
        action,
        ...actionArgs,
      ],
      environment,
    );
    return;
  }

  if (command === 'power') {
    const [action, ...actionArgs] = commandArgs;
    if (!action)
      throw new Error('power requires an action. Run mac-idle-keeper power --help for usage.');
    run(
      process.execPath,
      [path.join(packageRoot, 'dist', 'scripts', 'managePower', 'index.js'), action, ...actionArgs],
      environment,
    );
    return;
  }

  throw new Error(`Unknown command: ${command}. Run mac-idle-keeper help for usage.`);
}

try {
  main(process.argv.slice(2));
} catch (cause: unknown) {
  error(`Command failed: ${cause instanceof Error ? cause.message : String(cause)}`);
  process.exitCode = 1;
}

export type { ParsedEnvironmentArguments } from './types';
