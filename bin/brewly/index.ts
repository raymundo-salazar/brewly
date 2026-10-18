#!/usr/bin/env node

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { error, header, info, item, section } from '../../src/cliOutput';
import {
  configurationEnvironmentNames,
  parseConfigurationArguments,
} from '../../src/configArguments';
import { checkForUpdate, formatUpdateNotice } from '../../src/updateCheck';
import type { PackageManifest } from './types';

const packageRoot = path.resolve(__dirname, '..', '..', '..');
const requireModule = createRequire(__filename);
const packageJsonCandidates = [
  path.join(packageRoot, 'package.json'),
  path.resolve(__dirname, '..', '..', 'package.json'),
];
const electronMainPath = path.join(packageRoot, 'dist', 'src', 'main', 'index.js');
const electronBinaryPath = path.join(
  packageRoot,
  'node_modules',
  'electron',
  'dist',
  'Electron.app',
  'Contents',
  'MacOS',
  'Electron',
);

/**
 * @function resolveElectronPath
 * @description Resolves the Electron executable and explains a first-use binary download.
 *
 * @returns The Electron executable path provided by the Electron package.
 * @throws Throws when Electron cannot be loaded or its binary cannot be downloaded.
 *
 * @example
 * // brewly start
 */
function resolveElectronPath(): string {
  if (!fs.existsSync(electronBinaryPath))
    info(
      'Electron runtime',
      'Brewly needs Electron to run the monitor. Downloading the macOS runtime now; this happens only on first use.',
    );
  const electronModule = requireModule('electron') as unknown;
  if (typeof electronModule !== 'string')
    throw new Error('Electron did not provide a usable executable path.');
  return electronModule;
}

/**
 * @function readPackageVersion
 * @description Reads the published package version from the nearest package manifest.
 *
 * @returns The semantic version exposed by the Brewly package.
 * @throws Throws when no package manifest can be found or its version is invalid.
 */
function readPackageVersion(): string {
  for (const packageJsonPath of packageJsonCandidates) {
    if (!fs.existsSync(packageJsonPath)) continue;
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageManifest;
      if (typeof packageJson.version === 'string' && packageJson.version.length > 0)
        return packageJson.version;
    } catch {
      continue;
    }
  }
  throw new Error('Brewly package manifest does not contain a valid version.');
}

/**
 * @function printVersion
 * @description Prints the installed Brewly package version without starting Electron.
 *
 * @returns Nothing; the version is written to standard output.
 * @throws Does not throw when the package manifest is available.
 *
 * @example
 * // brewly --version
 */
function printVersion(): void {
  console.log('Brewly v' + readPackageVersion());
}

/**
 * @function printHelp
 * @description Prints the global CLI usage and command examples.
 *
 * @returns Nothing; usage text is written to standard output.
 * @throws Does not throw during normal terminal output.
 */
function printHelp(): void {
  header('Brewly — Command line interface');
  section('Usage');
  item('brewly <command> [options]');
  section('Commands');
  info('start', 'Start the monitor in the current session.');
  info('agent', 'Install and manage the background LaunchAgent.');
  info('power', 'Inspect and manage scheduled macOS wake or power-on events.');
  info('migrate', 'Migrate a legacy installation while preserving its effective configuration.');
  info('logs', 'Show recent application logs or follow them live.');
  info('--version, -v', 'Show the installed Brewly version.');
  info('help', 'Show this command reference.');
  section('LaunchAgent actions');
  item('agent <action>');
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
  item('brewly start');
  item('brewly agent status');
  item('brewly agent install');
  item('brewly power enable --dry-run');
  item('brewly power status');
  item('brewly agent install --idle-days working_days --idle-start-time 07:00');
  item('brewly agent --help');
  item('brewly logs --follow');
  item('brewly migrate --dry-run');
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
 * // brewly agent status
 */
async function main(args: string[]): Promise<void> {
  await announceUpdate();
  const parsed = parseConfigurationArguments(args);
  const { environment, remaining } = parsed;
  const [command = 'start', ...commandArgs] = remaining;
  if (command === '--version' || command === '-v' || command === 'version') {
    printVersion();
    return;
  }
  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'start') {
    run(resolveElectronPath(), [electronMainPath, ...commandArgs], environment);
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

  if (command === 'migrate') {
    run(
      process.execPath,
      [path.join(packageRoot, 'dist', 'scripts', 'migrate', 'index.js'), ...commandArgs],
      environment,
    );
    return;
  }

  if (command === 'agent') {
    const [action, ...actionArgs] = commandArgs;
    if (!action)
      throw new Error(`${command} requires an action. Run brewly ${command} --help for usage.`);
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
      resolveElectronPath();
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
    if (!action) throw new Error('power requires an action. Run brewly power --help for usage.');
    run(
      process.execPath,
      [path.join(packageRoot, 'dist', 'scripts', 'managePower', 'index.js'), action, ...actionArgs],
      environment,
    );
    return;
  }

  throw new Error(`Unknown command: ${command}. Run brewly help for usage.`);
}

/**
 * @function announceUpdate
 * @description Checks for a newer published version and prints an installation instruction when available.
 * The check is opt-out for tests and never blocks or fails the requested command.
 *
 * @returns A promise that resolves after the optional registry check completes.
 * @throws Does not throw; update-check failures are intentionally ignored.
 */
async function announceUpdate(): Promise<void> {
  if (process.env.BREWLY_DISABLE_UPDATE_CHECK === '1') return;
  const update = await checkForUpdate(readPackageVersion());
  if (update) console.log(`\n${formatUpdateNotice(update)}\n`);
}

void main(process.argv.slice(2)).catch((cause: unknown) => {
  error(`Command failed: ${cause instanceof Error ? cause.message : String(cause)}`);
  process.exitCode = 1;
});

export type { ParsedEnvironmentArguments } from './types';
