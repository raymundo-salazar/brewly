import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { getAgentConfigPath, readAgentConfig } from '../../src/agentConfig';
import { isWithinSchedule, localDateInTimeZone } from '../../src/schedule';
import { formatStoredLogLine, formatTimestampForDisplay } from '../../src/time';
import { readRuntimeState } from '../../src/runtimeState';
import { error, header, info, item, section, state, success, warning } from '../../src/cliOutput';
import type { LaunchAgentCommand, UninstallOptions } from './types';

process.on('uncaughtException', (cause: Error): void => {
  header('Mac Idle Keeper — LaunchAgent operation failed');
  error(cause.message);
  process.exitCode = 1;
});

const label = 'com.local.mac-idle-keeper';
const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${label}.plist`);
const launchAgentLogDir = path.join(os.homedir(), 'Library', 'Logs', 'mac-idle-keeper');
const applicationSupportDirectory = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'mac-idle-keeper',
);
const powerScheduleStatePath = path.join(applicationSupportDirectory, 'power-schedule.json');
const agentConfigPath = getAgentConfigPath(os.homedir());
const domain = `gui/${process.getuid?.() ?? process.pid}`;
const service = `${domain}/${label}`;
const command = process.argv[2] as LaunchAgentCommand | undefined;

/**
 * @function launchctl
 * @description Executes a `launchctl` command and optionally tolerates its failure.
 *
 * @param args - Arguments passed to `launchctl`.
 * @param allowFailure - Whether a non-zero command result should be ignored.
 * @returns Nothing.
 * @throws Rethrows command failures when `allowFailure` is false.
 */
function launchctl(args: string[], allowFailure = false): void {
  try {
    execFileSync('/bin/launchctl', args, { stdio: allowFailure ? 'ignore' : 'inherit' });
  } catch (cause) {
    if (!allowFailure) throw cause;
  }
}

/**
 * @function requirePlist
 * @description Ensures the user has installed a LaunchAgent plist before management operations.
 *
 * @returns Nothing when the plist exists.
 * @throws Throws when the expected plist is not installed.
 */
function requirePlist(): void {
  if (!fs.existsSync(plistPath))
    throw new Error(
      `LaunchAgent plist not found: ${plistPath}. Run mac-idle-keeper launch-agent install first.`,
    );
}

/**
 * @function bootout
 * @description Stops the LaunchAgent service without removing its plist.
 *
 * @returns Nothing.
 * @throws Does not throw when the service is already stopped.
 */
function bootout(): void {
  launchctl(['bootout', service], true);
}

/**
 * @function loadService
 * @description Loads and verifies the installed LaunchAgent service.
 *
 * @returns Nothing when the service is loaded successfully.
 * @throws Throws when the plist is missing or launchctl cannot load and verify it.
 */
function loadService(): void {
  requirePlist();
  launchctl(['load', '-w', plistPath]);
  try {
    execFileSync('/bin/launchctl', ['print', service], { stdio: 'ignore' });
  } catch {
    throw new Error(
      `LaunchAgent was not loaded. Check ${path.join(launchAgentLogDir, 'launch-agent.stderr.log')}.`,
    );
  }
}

/**
 * @function startService
 * @description Enables and loads an installed LaunchAgent that was stopped.
 * The plist remains installed and the service is verified after loading.
 *
 * @returns Nothing when the service is enabled and loaded successfully.
 * @throws Throws when the plist is missing or launchctl cannot load and verify the service.
 *
 * @example
 * // Start a previously stopped service:
 * // mac-idle-keeper launch-agent start
 */
function startService(): void {
  requirePlist();
  launchctl(['enable', service], true);
  loadService();
}

/**
 * @function operationHeader
 * @description Prints the common context displayed before a LaunchAgent lifecycle operation.
 *
 * @param operation - Operation name shown in the response header.
 * @returns Nothing.
 * @throws Does not throw for a valid operation name.
 */
function operationHeader(operation: string): void {
  header(`Mac Idle Keeper — LaunchAgent ${operation}`);
  info('Service', label);
  info('Plist', plistPath);
}

/**
 * @function printHelp
 * @description Prints the LaunchAgent command reference, actions, options, and examples.
 *
 * @returns Nothing; help text is written to standard output.
 * @throws Does not throw during normal terminal output.
 *
 * @example
 * // mac-idle-keeper launch-agent --help
 */
function printHelp(): void {
  header('Mac Idle Keeper — LaunchAgent help');
  section('Usage');
  item('mac-idle-keeper launch-agent <action> [options]');
  section('Actions');
  info('install', 'Create and load the per-user LaunchAgent.');
  info('status', 'Show installation, process, schedule, and recent activity state.');
  info('logs', 'Show recent application log entries or follow them live.');
  info('start', 'Start a stopped service while preserving its plist.');
  info('stop', 'Stop the current process while keeping the plist installed.');
  info('pause', 'Pause the service and disable automatic relaunch.');
  info('resume', 'Resume a paused service.');
  info('restart', 'Refresh the plist and start the service.');
  info('uninstall', 'Stop the service and remove its plist.');
  section('Options');
  info('--help, -h', 'Show this LaunchAgent command reference.');
  info('--env-file PATH', 'Explicitly load a configuration file for local/source workflows.');
  info('--idle-check-interval-ms N', 'Polling interval in milliseconds for install or restart.');
  info('--idle-threshold-seconds N', 'Idle threshold in seconds for install or restart.');
  info('--idle-days VALUE', 'Days: all_week, weekend, working_days, or a list.');
  info('--idle-start-time HH:MM', 'Schedule start time.');
  info('--idle-end-time HH:MM', 'Schedule end time.');
  info('--idle-start-hour H', 'Schedule start hour when no start time is supplied.');
  info('--idle-end-hour H', 'Schedule end hour when no end time is supplied.');
  info('--idle-timezone ZONE', 'IANA timezone used by the monitor.');
  info('--idle-action NAME', 'Operating-system activity action.');
  info('--idle-log-file PATH', 'Application log path, or empty for the default path.');
  info('--power-on-offset-minutes N', 'Minutes before the monitor schedule for power-on.');
  info('-y, --yes', 'Remove the plist and all managed application data without prompting.');
  section('Examples');
  item('mac-idle-keeper launch-agent install');
  item('mac-idle-keeper launch-agent status');
  item('mac-idle-keeper launch-agent logs --follow');
  item('mac-idle-keeper launch-agent install --idle-days working_days --idle-start-time 07:00');
  item('mac-idle-keeper launch-agent restart');
}

/**
 * @function status
 * @description Prints human-readable LaunchAgent and runtime state information.
 *
 * @returns Nothing; status details are written to the terminal.
 * @throws Does not throw for missing runtime state or service information; launchctl errors are displayed as stopped state.
 *
 * @example
 * // Run through the package CLI:
 * // mac-idle-keeper launch-agent status
 */
function status(): void {
  const exists = fs.existsSync(plistPath);
  const runtimeStatePath = path.join(
    os.homedir(),
    'Library',
    'Application Support',
    'mac-idle-keeper',
    'runtime-state.json',
  );
  const runtimeState = readRuntimeState(runtimeStatePath);
  const persistedConfig = readAgentConfig(agentConfigPath)?.config;
  const config = persistedConfig && (exists || Boolean(runtimeState)) ? persistedConfig : null;
  const hasConfiguration = Boolean(config);
  const logPath = config
    ? config.logFile
      ? path.resolve(config.logFile)
      : path.join(
          os.homedir(),
          'Library',
          'Application Support',
          'mac-idle-keeper',
          'mac-idle-keeper.log',
        )
    : null;
  const localNow = config ? localDateInTimeZone(new Date(), config.timezone) : null;
  const insideSchedule =
    !localNow || !config
      ? false
      : runtimeState
        ? (runtimeState.inSchedule ?? false)
        : isWithinSchedule(localNow, config);
  /**
   * @function formatTime
   * @description Formats schedule minutes as a zero-padded local clock time.
   *
   * @param minutes - Minutes elapsed since midnight.
   * @returns A `HH:MM` clock string.
   * @throws Does not throw for a finite minute value.
   */
  const formatTime = (minutes: number): string =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const schedule = config
    ? `${config.startTime}-${config.endTime} (${config.days.map((day) => dayNames[day]).join(', ')})`
    : 'NOT CONFIGURED';

  header('Mac Idle Keeper — LaunchAgent Status');
  state('Installed', exists ? 'YES' : 'NO', exists ? 'green' : 'red');
  info('Plist', plistPath);
  state(
    'Configuration',
    hasConfiguration ? 'CONFIGURED' : 'NOT CONFIGURED',
    hasConfiguration ? 'green' : 'yellow',
  );
  state(
    'Runtime schedule',
    hasConfiguration ? (insideSchedule ? 'IN SCHEDULE' : 'OUTSIDE SCHEDULE') : 'NOT CONFIGURED',
    insideSchedule ? 'green' : 'yellow',
  );
  if (hasConfiguration && config) {
    const currentMinutes = localNow ? localNow.getUTCHours() * 60 + localNow.getUTCMinutes() : 0;
    info('Schedule', schedule);
    info('Current time', `${formatTime(currentMinutes)} ${config.timezone}`);
    info('Current timezone', config.timezone);
  }
  info('Configuration file', agentConfigPath);
  state(
    'Runtime state',
    runtimeState ? 'AVAILABLE' : 'NOT AVAILABLE',
    runtimeState ? 'green' : 'yellow',
  );

  try {
    const output = execFileSync('/bin/launchctl', ['print', service], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    /**
     * @function field
     * @description Extracts one launchctl field from its human-readable output.
     *
     * @param name - Field name to find.
     * @returns The trimmed field value, or an em dash when absent.
     * @throws Does not throw for command output text.
     */
    const field = (name: string): string =>
      output.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, 'm'))?.[1]?.trim() ?? '—';
    const serviceState = field('state');
    state('Enabled', 'YES', 'green');
    state(
      'Process',
      serviceState === 'running' ? 'RUNNING' : serviceState,
      serviceState === 'running' ? 'green' : serviceState === 'stopped' ? 'red' : 'yellow',
    );
    info('PID', field('pid'));
    info('Runs', field('runs'));
    info('Last exit code', field('last exit code'));
  } catch {
    let paused = false;
    try {
      const disabled = execFileSync('/bin/launchctl', ['print-disabled', domain], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      paused = new RegExp(`['"]?${label}['"]?\\s*=>\\s*true`).test(disabled);
    } catch {
      // The service domain may not be available.
    }
    state(
      'Enabled',
      !exists ? 'NO (NOT INSTALLED)' : paused ? 'NO (PAUSED)' : 'YES',
      !exists || paused ? 'yellow' : 'green',
    );
    state('Process', paused ? 'PAUSED' : 'STOPPED', paused ? 'yellow' : 'red');
  }

  if (runtimeState) {
    info('Runtime PID', runtimeState.pid);
    if (config) {
      const lastCheck = runtimeState.lastCheckAt
        ? formatTimestampForDisplay(runtimeState.lastCheckAt, config.timezone)
        : '—';
      info('Last check', `${lastCheck} (${runtimeState.lastCheckStatus ?? '—'})`);
    } else info('Last check', 'NOT CONFIGURED');
  }
  if (logPath) info('Log', logPath);
  else state('Log', 'NOT CONFIGURED', 'yellow');
  section('Last 5 activity actions');
  try {
    if (!logPath) throw new Error('No active configuration');
    const actions = fs
      .readFileSync(logPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.includes('activity action executed'))
      .slice(-5);
    if (actions.length === 0) warning('No activity actions recorded.');
    else if (config) actions.forEach((line) => item(formatStoredLogLine(line, config.timezone)));
  } catch {
    warning('Log file not found yet.');
  }
  console.log('');
}

/**
 * @function parseUninstallOptions
 * @description Parses confirmation options for LaunchAgent uninstallation.
 *
 * @param args - Arguments supplied after the `uninstall` action.
 * @returns Normalized uninstallation options.
 * @throws Throws when an unsupported option is supplied.
 *
 * @example
 * parseUninstallOptions(['--yes']);
 * // { assumeYes: true }
 */
function parseUninstallOptions(args: string[]): UninstallOptions {
  const options: UninstallOptions = { assumeYes: false };
  for (const arg of args) {
    if (arg === '--yes' || arg === '-y') options.assumeYes = true;
    else throw new Error(`Unsupported uninstall option: ${arg}. Use --yes or -y.`);
  }
  return options;
}

/**
 * @function askToKeepApplicationData
 * @description Asks whether managed application data should remain after the LaunchAgent plist is removed.
 *
 * @returns `true` when the user chooses to keep application data; otherwise `false`.
 * @throws Throws when confirmation is required but no interactive terminal is available.
 */
async function askToKeepApplicationData(): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error(
      'Uninstall requires confirmation in an interactive terminal. Re-run with --yes or -y to remove all managed application data without prompting.',
    );

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question(
      'Keep Mac Idle Keeper configuration, state, and logs after removing the LaunchAgent? [y/N] ',
    );
    return /^(y|yes)$/i.test(answer.trim());
  } finally {
    prompt.close();
  }
}

/**
 * @function removeManagedApplicationData
 * @description Removes the default application support and LaunchAgent log directories.
 * User-owned `.env` files and custom log paths outside these directories are preserved.
 *
 * @returns The paths removed by the operation.
 * @throws Throws when a managed directory cannot be removed.
 */
function removeManagedApplicationData(): string[] {
  const removedPaths: string[] = [];
  for (const target of [applicationSupportDirectory, launchAgentLogDir]) {
    if (!fs.existsSync(target)) continue;
    fs.rmSync(target, { recursive: true, force: true });
    removedPaths.push(target);
  }
  return removedPaths;
}

/**
 * @function uninstall
 * @description Stops and removes the LaunchAgent plist, then optionally removes managed application data.
 * A managed power schedule state blocks full data removal until the power schedule is cleaned up explicitly.
 *
 * @param options - Confirmation behavior for application-data removal.
 * @returns A promise that resolves after the uninstallation response is printed.
 * @throws Throws when confirmation, plist removal, or safe data cleanup fails.
 *
 * @example
 * // Remove the agent and prompt before deleting managed application data:
 * // mac-idle-keeper agent uninstall
 */
async function uninstall(options: UninstallOptions): Promise<void> {
  const keepApplicationData = options.assumeYes ? false : await askToKeepApplicationData();

  operationHeader('Uninstall');
  bootout();
  launchctl(['enable', service], true);
  if (fs.existsSync(plistPath)) fs.unlinkSync(plistPath);
  state('Installed', 'NO', 'yellow');
  success('LaunchAgent stopped and its plist was removed.');

  if (keepApplicationData) {
    state('Application data', 'RETAINED', 'yellow');
    info('Preserved', `${applicationSupportDirectory} and ${launchAgentLogDir}`);
    success('Uninstall completed. Configuration, state, and logs were kept.');
    return;
  }

  if (fs.existsSync(powerScheduleStatePath)) {
    state('Application data', 'RETAINED', 'yellow');
    warning('A managed power schedule state still exists, so application data was not deleted.');
    info('Next step', 'Run mac-idle-keeper power disable, then repeat agent uninstall --yes.');
    throw new Error(
      'Complete removal was not finished because the managed power schedule must be cleaned up first.',
    );
  }

  const removedPaths = removeManagedApplicationData();
  state('Application data', 'REMOVED', 'green');
  if (removedPaths.length > 0) removedPaths.forEach((target) => info('Removed', target));
  success('Uninstall completed. The plist and all managed application data were removed.');
}

/**
 * @function main
 * @description Dispatches a LaunchAgent lifecycle command.
 *
 * @returns A promise that resolves when the selected operation is complete.
 * @throws Throws when the selected command or its options are invalid.
 */
async function main(): Promise<void> {
  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    case 'status':
      status();
      break;
    case 'start':
      operationHeader('Start');
      startService();
      state('Process', 'RUNNING', 'green');
      success('Service started. The installed LaunchAgent is running again.');
      break;
    case 'stop':
      operationHeader('Stop');
      bootout();
      state('Process', 'STOPPED', 'red');
      success('Service stopped. Use start to begin it again; the LaunchAgent plist was preserved.');
      break;
    case 'pause':
      operationHeader('Pause');
      bootout();
      launchctl(['disable', service]);
      state('Process', 'PAUSED', 'yellow');
      success('Service paused. Use resume to continue it without removing the plist.');
      break;
    case 'resume':
      operationHeader('Resume');
      launchctl(['enable', service], true);
      loadService();
      state('Process', 'RUNNING', 'green');
      success('Service resumed from its paused state and loaded.');
      break;
    case 'restart':
      operationHeader('Restart');
      execFileSync(
        process.execPath,
        [path.join(__dirname, '..', 'installLaunchAgent', 'index.js'), ...process.argv.slice(3)],
        {
          stdio: 'inherit',
        },
      );
      state('Process', 'RUNNING', 'green');
      success('Service restarted and verified.');
      break;
    case 'uninstall':
      await uninstall(parseUninstallOptions(process.argv.slice(3)));
      break;
    default:
      header('Mac Idle Keeper — LaunchAgent command error');
      error(
        'Usage: mac-idle-keeper launch-agent <status|start|stop|pause|resume|restart|uninstall>',
      );
      process.exitCode = 1;
  }
}

if (require.main === module) {
  void main().catch((cause: unknown) => {
    header('Mac Idle Keeper — LaunchAgent operation failed');
    error(cause instanceof Error ? cause.message : String(cause));
    process.exitCode = 1;
  });
}

export type { LaunchAgentCommand, UninstallOptions } from './types';
