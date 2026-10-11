#!/usr/bin/env node

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import electronModule from 'electron';
import type { ParsedEnvironmentArguments } from './types';

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
  console.log(`Mac Idle Keeper — macOS idle monitor

Usage:
  mac-idle-keeper start [--env-file PATH]
  mac-idle-keeper launch-agent <install|status|logs|stop|pause|resume|restart|uninstall> [--env-file PATH]
  mac-idle-keeper logs [--follow] [--lines N] [--env-file PATH]
  mac-idle-keeper help

Examples:
  mac-idle-keeper start
  mac-idle-keeper launch-agent install
  mac-idle-keeper launch-agent status
  mac-idle-keeper logs --follow
`);
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
 * @function parseEnvironmentArguments
 * @description Extracts the optional environment-file argument from CLI input.
 *
 * @param args - Raw CLI arguments.
 * @returns The environment for the child command and the remaining arguments.
 * @throws Throws when `--env-file` is missing its path.
 */
function parseEnvironmentArguments(args: string[]): ParsedEnvironmentArguments {
  const remaining: string[] = [];
  const environment: NodeJS.ProcessEnv = { ...process.env };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--env-file') {
      const value = args[++index];
      if (!value) throw new Error('--env-file requires a path.');
      environment.IDLE_ENV_FILE = path.resolve(process.cwd(), value);
    } else if (arg?.startsWith('--env-file=')) {
      environment.IDLE_ENV_FILE = path.resolve(process.cwd(), arg.slice('--env-file='.length));
    } else if (arg) {
      remaining.push(arg);
    }
  }

  return { environment, remaining };
}

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
  const { environment, remaining } = parseEnvironmentArguments(args);
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

  if (command === 'launch-agent') {
    const [action, ...actionArgs] = commandArgs;
    if (!action)
      throw new Error('launch-agent requires an action. Run mac-idle-keeper help for usage.');
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

  throw new Error(`Unknown command: ${command}. Run mac-idle-keeper help for usage.`);
}

try {
  main(process.argv.slice(2));
} catch (error: unknown) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

export type { ParsedEnvironmentArguments } from './types';
