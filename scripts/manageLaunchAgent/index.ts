import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadEnvFile } from '../../src/env';
import { loadConfig } from '../../src/config';
import { isWithinSchedule, localDateInTimeZone } from '../../src/schedule';
import { formatStoredLogLine, formatTimestampForDisplay } from '../../src/time';
import { readRuntimeState } from '../../src/runtimeState';
import { error, header, info, item, section, state, success, warning } from '../../src/cliOutput';
import type { LaunchAgentCommand } from './types';

process.on('uncaughtException', (cause: Error): void => {
  header('Mac Idle Keeper — LaunchAgent operation failed');
  error(cause.message);
  process.exitCode = 1;
});

const label = 'com.local.mac-idle-keeper';
const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${label}.plist`);
const launchAgentLogDir = path.join(os.homedir(), 'Library', 'Logs', 'mac-idle-keeper');
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
  info('stop', 'Stop the service while preserving its plist.');
  info('pause', 'Stop the service and disable automatic relaunch.');
  info('resume', 'Enable and load a previously paused service.');
  info('restart', 'Refresh the plist and restart the service.');
  info('uninstall', 'Stop the service and remove its plist.');
  section('Options');
  info('--help, -h', 'Show this LaunchAgent command reference.');
  info('--env-file PATH', 'Use a specific environment file when invoked through the global CLI.');
  section('Examples');
  item('mac-idle-keeper launch-agent install');
  item('mac-idle-keeper launch-agent status');
  item('mac-idle-keeper launch-agent logs --follow');
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
  const environment = {};
  loadEnvFile(process.env.IDLE_ENV_FILE ?? path.join(process.cwd(), '.env'), environment);
  const fallbackConfig = loadConfig(environment);
  const config = runtimeState ? { ...fallbackConfig, ...runtimeState.config } : fallbackConfig;
  const logPath = config.logFile
    ? path.resolve(config.logFile)
    : path.join(
        os.homedir(),
        'Library',
        'Application Support',
        'mac-idle-keeper',
        'mac-idle-keeper.log',
      );
  const localNow = localDateInTimeZone(new Date(), config.timezone);
  const insideSchedule = runtimeState
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
  const schedule = `${config.startTime}-${config.endTime} (${config.days.map((day) => dayNames[day]).join(', ')})`;

  header('Mac Idle Keeper — LaunchAgent Status');
  state('Installed', exists ? 'YES' : 'NO', exists ? 'green' : 'red');
  info('Plist', plistPath);
  state(
    'Runtime schedule',
    insideSchedule ? 'IN SCHEDULE' : 'OUTSIDE SCHEDULE',
    insideSchedule ? 'green' : 'yellow',
  );
  info('Schedule', schedule);
  info(
    'Current time',
    `${formatTime(localNow.getUTCHours() * 60 + localNow.getUTCMinutes())} ${config.timezone}`,
  );
  info('Current timezone', config.timezone);
  state(
    'Runtime state',
    runtimeState ? 'AVAILABLE' : 'NOT AVAILABLE',
    runtimeState ? 'green' : 'yellow',
  );

  try {
    const output = execFileSync('/bin/launchctl', ['print', service], { encoding: 'utf8' });
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
      });
      paused = new RegExp(`['"]?${label}['"]?\\s*=>\\s*true`).test(disabled);
    } catch {
      // The service domain may not be available.
    }
    state('Enabled', paused ? 'NO (PAUSED)' : 'YES', paused ? 'yellow' : 'green');
    state('Process', paused ? 'PAUSED' : 'STOPPED', paused ? 'yellow' : 'red');
  }

  if (runtimeState) {
    info('Runtime PID', runtimeState.pid);
    const lastCheck = runtimeState.lastCheckAt
      ? formatTimestampForDisplay(runtimeState.lastCheckAt, config.timezone)
      : '—';
    info('Last check', `${lastCheck} (${runtimeState.lastCheckStatus ?? '—'})`);
  }
  info('Log', logPath);
  section('Last 5 activity actions');
  try {
    const actions = fs
      .readFileSync(logPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.includes('activity action executed'))
      .slice(-5);
    if (actions.length === 0) warning('No activity actions recorded.');
    else actions.forEach((line) => item(formatStoredLogLine(line, config.timezone)));
  } catch {
    warning('Log file not found yet.');
  }
  console.log('');
}

switch (command) {
  case 'help':
  case '--help':
  case '-h':
    printHelp();
    break;
  case 'status':
    status();
    break;
  case 'stop':
    operationHeader('Stop');
    bootout();
    state('Process', 'STOPPED', 'yellow');
    success('Service stopped. The LaunchAgent plist was preserved.');
    break;
  case 'pause':
    operationHeader('Pause');
    bootout();
    launchctl(['disable', service]);
    state('Process', 'PAUSED', 'yellow');
    success('Service paused. Use resume to enable it again.');
    break;
  case 'resume':
    operationHeader('Resume');
    launchctl(['enable', service], true);
    loadService();
    state('Process', 'RUNNING', 'green');
    success('Service resumed and loaded.');
    break;
  case 'restart':
    operationHeader('Restart');
    execFileSync(process.execPath, [path.join(__dirname, '..', 'installLaunchAgent', 'index.js')], {
      stdio: 'inherit',
    });
    state('Process', 'RUNNING', 'green');
    success('Service restarted and verified.');
    break;
  case 'uninstall':
    operationHeader('Uninstall');
    bootout();
    launchctl(['enable', service], true);
    if (fs.existsSync(plistPath)) fs.unlinkSync(plistPath);
    state('Installed', 'NO', 'yellow');
    success('Service uninstalled and its plist was removed.');
    break;
  default:
    header('Mac Idle Keeper — LaunchAgent command error');
    error('Usage: mac-idle-keeper launch-agent <status|stop|pause|resume|restart|uninstall>');
    process.exitCode = 1;
}

export type { LaunchAgentCommand } from './types';
