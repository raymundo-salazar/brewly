#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DEFAULTS } from '../../src/config';
import { getAgentConfigPath, readAgentConfig } from '../../src/agentConfig';
import { error, header, info, item, section, state, success, warning } from '../../src/cliOutput';
import type { Config } from '../../src/config/types';
import type {
  PowerCommand,
  PowerCommandOptions,
  PowerMutation,
  PowerSchedule,
  PowerScheduleState,
} from './types';

const pmsetPath = '/usr/bin/pmset';
const userHomeDirectory = process.env.SUDO_USER
  ? path.join('/Users', process.env.SUDO_USER)
  : os.homedir();
const supportDirectory = path.join(userHomeDirectory, 'Library', 'Application Support', 'brewly');
const statePath = path.join(supportDirectory, 'power-schedule.json');
const launchAgentPlistPath = path.join(
  userHomeDirectory,
  'Library',
  'LaunchAgents',
  'com.local.brewly.plist',
);
const defaultOffsetMinutes = DEFAULTS.powerOnOffsetMinutes;
const agentConfigPath = getAgentConfigPath(userHomeDirectory);
const weekdayCodes = ['U', 'M', 'T', 'W', 'R', 'F', 'S'];

/**
 * @function parsePowerArgs
 * @description Parses safety options shared by power schedule mutations.
 *
 * @param args - Command-line options after the power action.
 * @returns Normalized dry-run and force flags.
 * @throws Throws when an unsupported option is provided.
 *
 * @example
 * parsePowerArgs(['--dry-run']);
 */
export function parsePowerArgs(args: string[]): PowerCommandOptions {
  const options: PowerCommandOptions = { dryRun: false, force: false };
  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
    else throw new Error(`Unsupported power option: ${arg}`);
  }
  return options;
}

/**
 * @function buildPowerSchedule
 * @description Converts the monitor schedule into a repeating macOS power-on event.
 * The configured days are shifted when the requested offset crosses midnight.
 *
 * @param config - Effective monitor configuration.
 * @param offsetMinutes - Minutes before the monitor start time to power on the Mac.
 * @returns The weekday codes, local power-on time, and source schedule metadata.
 * @throws Throws when no valid source days are available.
 *
 * @example
 * const schedule = buildPowerSchedule(config, 5);
 * // schedule.weekdays === 'MTWRF' and schedule.time === '06:55:00'
 */
export function buildPowerSchedule(config: Config, offsetMinutes: number): PowerSchedule {
  if (config.days.length === 0) throw new Error('At least one active day is required.');

  const rawMinutes = config.startMinutes - offsetMinutes;
  const dayShift = Math.floor(rawMinutes / (24 * 60));
  const timeMinutes = ((rawMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const scheduledDays = [
    ...new Set(
      config.days.map((day) => (day + dayShift + weekdayCodes.length) % weekdayCodes.length),
    ),
  ].sort((left, right) => left - right);
  const hours = Math.floor(timeMinutes / 60);
  const minutes = timeMinutes % 60;

  return {
    weekdays: scheduledDays.map((day) => weekdayCodes[day]).join(''),
    time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`,
    scheduledDays,
    sourceDays: [...config.days],
    startTime: config.startTime,
    offsetMinutes,
    timezone: config.timezone,
  };
}

/**
 * @function extractRepeatingPowerEvents
 * @description Extracts repeating power events from `pmset -g sched` output.
 *
 * @param output - Raw output returned by `pmset -g sched`.
 * @returns Non-empty repeating event lines, excluding section headers and empty-state text.
 * @throws Does not throw for arbitrary command output.
 *
 * @example
 * extractRepeatingPowerEvents('Repeating power events:\\n  wakeorpoweron at 06:55:00 every MWRF');
 */
export function extractRepeatingPowerEvents(output: string): string[] {
  const lines = output.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.toLowerCase().includes('repeating power events'),
  );
  if (headerIndex < 0) return [];

  const events: string[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    const value = line.trim();
    if (!value) continue;
    if (/^[A-Za-z][A-Za-z ]+:$/.test(value)) break;
    if (!/no repeating power events|none/i.test(value)) events.push(value);
  }
  return events;
}

/**
 * @function formatPowerSchedule
 * @description Formats a derived schedule for human-readable CLI output.
 *
 * @param schedule - Schedule derived from the effective monitor configuration.
 * @returns A concise schedule description.
 * @throws Does not throw for a valid power schedule.
 *
 * @example
 * formatPowerSchedule(schedule);
 */
export function formatPowerSchedule(schedule: PowerSchedule): string {
  return `${schedule.weekdays} at ${schedule.time} (${schedule.offsetMinutes} minutes before ${schedule.startTime})`;
}

/**
 * @function getLaunchAgentPlistPath
 * @description Resolves the per-user LaunchAgent plist used as the prerequisite for power scheduling.
 *
 * @param homeDirectory - User home directory used to build the LaunchAgent path.
 * @returns The expected LaunchAgent plist path.
 * @throws Does not throw for a valid home directory path.
 *
 * @example
 * getLaunchAgentPlistPath('/Users/example');
 * // '/Users/example/Library/LaunchAgents/com.local.brewly.plist'
 */
export function getLaunchAgentPlistPath(homeDirectory: string): string {
  return path.join(homeDirectory, 'Library', 'LaunchAgents', 'com.local.brewly.plist');
}

/**
 * @function isLaunchAgentInstalled
 * @description Checks whether the per-user LaunchAgent plist exists.
 *
 * @param homeDirectory - User home directory to inspect.
 * @returns `true` when the expected LaunchAgent plist exists; otherwise `false`.
 * @throws Does not throw for a missing plist.
 *
 * @example
 * isLaunchAgentInstalled('/Users/example');
 */
export function isLaunchAgentInstalled(homeDirectory: string): boolean {
  return fs.existsSync(getLaunchAgentPlistPath(homeDirectory));
}

/**
 * @function sudoRequiredMessage
 * @description Creates the human-readable exception shown when a power mutation needs administrator authorization.
 *
 * @param action - Power mutation the user attempted.
 * @returns An actionable message containing the exact command to run with `sudo`.
 * @throws Does not throw for a supported power mutation.
 *
 * @example
 * sudoRequiredMessage('enable');
 * // 'This command requires sudo. Re-run it as: sudo brewly power enable. No changes were made.'
 */
export function sudoRequiredMessage(action: PowerMutation): string {
  return `This command requires sudo. Re-run it as: sudo brewly power ${action}. No changes were made.`;
}

/**
 * @function parseStoredState
 * @description Reads the last schedule managed by this CLI.
 *
 * @returns The stored state, or `null` when no valid managed state exists.
 * @throws Does not throw; unavailable or malformed state is treated as absent.
 */
function parseStoredState(): PowerScheduleState | null {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8')) as PowerScheduleState;
  } catch {
    return null;
  }
}

/**
 * @function loadEffectiveConfig
 * @description Loads the immutable configuration snapshot created by agent installation or restart.
 *
 * @returns The persisted configuration, or `null` when no agent snapshot exists.
 * @throws Does not throw when the snapshot is absent or invalid.
 */
function loadEffectiveConfig(): Config | null {
  const persistedConfig = readAgentConfig(agentConfigPath)?.config;
  return persistedConfig ?? null;
}

/**
 * @function requireEffectiveConfig
 * @description Requires the persisted agent snapshot for a power schedule mutation.
 *
 * @returns The immutable configuration used to derive the power schedule.
 * @throws Throws an actionable error when the agent snapshot is absent.
 */
function requireEffectiveConfig(): Config {
  const config = loadEffectiveConfig();
  if (config) return config;
  throw new Error(
    `No persisted agent configuration was found at ${agentConfigPath}. Run "brewly agent install" or "brewly agent restart" first. No changes were made.`,
  );
}

/**
 * @function loadPowerOffset
 * @description Loads the power-on offset from the immutable agent configuration snapshot.
 *
 * @returns The configured offset in minutes or the documented default.
 * @throws Does not throw when the snapshot is absent; the documented default is used.
 */
function loadPowerOffset(): number {
  return readAgentConfig(agentConfigPath)?.powerOnOffsetMinutes ?? defaultOffsetMinutes;
}

/**
 * @function readSystemSchedule
 * @description Reads the current macOS power schedule without changing it.
 *
 * @returns Raw output from `pmset -g sched`.
 * @throws Throws when macOS cannot provide the current power schedule.
 */
function readSystemSchedule(): string {
  try {
    return execFileSync(pmsetPath, ['-g', 'sched'], { encoding: 'utf8' });
  } catch (cause) {
    throw new Error(
      `Unable to read the macOS power schedule. ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

/**
 * @function requireLaunchAgent
 * @description Prevents a real power schedule from being created before its monitor LaunchAgent exists.
 *
 * @returns Nothing when the LaunchAgent plist exists.
 * @throws Throws an actionable error when the LaunchAgent has not been installed.
 */
function requireLaunchAgent(): void {
  if (!isLaunchAgentInstalled(userHomeDirectory))
    throw new Error(
      `LaunchAgent is not installed. Run "brewly agent install" before enabling a power schedule. No changes were made. Expected plist: ${launchAgentPlistPath}`,
    );
}

/**
 * @function requireAdministratorAuthorization
 * @description Verifies that the current process can perform a macOS power schedule mutation.
 *
 * @param action - Power mutation that will be sent to `pmset`.
 * @returns Nothing when the process is running with administrator authorization.
 * @throws Throws a human-readable sudo instruction when authorization is missing.
 */
function requireAdministratorAuthorization(action: PowerMutation): void {
  if (process.platform === 'darwin' && process.getuid?.() !== 0)
    throw new Error(sudoRequiredMessage(action));
}

/**
 * @function applyPowerSchedule
 * @description Applies a repeating wake-or-power-on event through `pmset`.
 *
 * @param schedule - Power event to apply.
 * @returns Nothing when macOS accepts the event.
 * @throws Throws when administrator authorization is missing or pmset rejects the event.
 */
function applyPowerSchedule(schedule: PowerSchedule): void {
  requireAdministratorAuthorization('enable');
  try {
    execFileSync(pmsetPath, ['repeat', 'wakeorpoweron', schedule.weekdays, schedule.time], {
      stdio: 'inherit',
    });
  } catch (cause) {
    throw new Error(
      `macOS could not update the power schedule after authorization was granted. ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

/**
 * @function cancelPowerSchedule
 * @description Cancels repeating power events through `pmset`.
 *
 * @returns Nothing when macOS accepts the cancellation.
 * @throws Throws when administrator authorization is missing or pmset rejects the cancellation.
 */
function cancelPowerSchedule(): void {
  requireAdministratorAuthorization('disable');
  try {
    execFileSync(pmsetPath, ['repeat', 'cancel'], { stdio: 'inherit' });
  } catch (cause) {
    throw new Error(
      `macOS could not cancel repeating power events after authorization was granted. ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

/**
 * @function writeStoredState
 * @description Persists the last schedule managed by the CLI for safe status and disable operations.
 *
 * @param schedule - Applied schedule.
 * @param previousSchedule - Existing raw schedule replaced with explicit force.
 * @returns Nothing.
 * @throws Throws when the state directory or file cannot be written.
 */
function writeStoredState(schedule: PowerSchedule, previousSchedule: string | null): void {
  const state: PowerScheduleState = {
    appliedAt: new Date().toISOString(),
    command: `pmset repeat wakeorpoweron ${schedule.weekdays} ${schedule.time}`,
    weekdays: schedule.weekdays,
    time: schedule.time,
    offsetMinutes: schedule.offsetMinutes,
    sourceDays: schedule.sourceDays,
    startTime: schedule.startTime,
    timezone: schedule.timezone,
    previousSchedule,
  };
  fs.mkdirSync(supportDirectory, { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

/**
 * @function removeStoredState
 * @description Removes the managed power schedule state file when present.
 *
 * @returns Nothing.
 * @throws Throws for filesystem errors other than a missing state file.
 */
function removeStoredState(): void {
  try {
    fs.unlinkSync(statePath);
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') throw cause;
  }
}

/**
 * @function printHelp
 * @description Prints power schedule commands, safeguards, and examples.
 *
 * @returns Nothing; help text is written to standard output.
 * @throws Does not throw during normal terminal output.
 */
function printHelp(): void {
  header('Brewly — Power schedule help');
  section('Usage');
  item('brewly power <action> [options]');
  section('Actions');
  info('status', 'Show the effective schedule and current pmset events.');
  info('enable', 'Schedule wake or power-on before the monitor starts.');
  info('disable', 'Cancel the schedule managed by Brewly.');
  section('Options');
  info('--dry-run', 'Show the planned change without modifying macOS.');
  info('--force', 'Allow replacing or canceling an unrecognized repeating schedule.');
  info('--help, -h', 'Show this power schedule reference.');
  section('Configuration');
  info(
    'POWER_ON_OFFSET_MINUTES',
    `Minutes before the monitor schedule; default ${defaultOffsetMinutes}.`,
  );
  section('Examples');
  item('brewly power status');
  item('brewly power enable --dry-run');
  item('sudo brewly power enable');
  item('sudo brewly power disable');
}

/**
 * @function printScheduleDetails
 * @description Prints the derived monitor and system timezone details used by power operations.
 *
 * @param config - Effective monitor configuration.
 * @param schedule - Derived power schedule.
 * @returns Nothing.
 * @throws Does not throw for valid configuration values.
 */
function printScheduleDetails(config: Config, schedule: PowerSchedule): void {
  const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
  info('Monitor schedule', `${config.startTime}-${config.endTime}`);
  info('Monitor days', config.days.join(', '));
  info('Power-on schedule', formatPowerSchedule(schedule));
  info('Configured timezone', config.timezone);
  info('macOS timezone', systemTimezone);
  if (systemTimezone !== 'unknown' && systemTimezone !== config.timezone)
    warning(
      'Configured timezone differs from macOS timezone; pmset uses the macOS local timezone.',
    );
}

/**
 * @function printStatus
 * @description Prints the current managed and system power schedule without changing it.
 *
 * @returns Nothing; status details are written to the terminal.
 * @throws Throws when the macOS schedule cannot be read.
 */
function printStatus(): void {
  const config = loadEffectiveConfig();
  const schedule = config ? buildPowerSchedule(config, loadPowerOffset()) : null;
  const storedState = parseStoredState();
  const systemSchedule = readSystemSchedule();
  const repeatingEvents = extractRepeatingPowerEvents(systemSchedule);
  const launchAgentInstalled = isLaunchAgentInstalled(userHomeDirectory);
  const powerScheduleState = storedState
    ? 'CONFIGURED'
    : repeatingEvents.length > 0
      ? 'CONFIGURED (EXTERNAL)'
      : 'NOT CONFIGURED';

  header('Brewly — Power schedule status');
  state(
    'Power schedule',
    powerScheduleState,
    powerScheduleState === 'NOT CONFIGURED' ? 'yellow' : 'green',
  );
  if (config && storedState && schedule) printScheduleDetails(config, schedule);
  else if (config) {
    info('Monitor schedule', `${config.startTime}-${config.endTime}`);
    info('Monitor days', config.days.join(', '));
    info('Configured timezone', config.timezone);
    info('macOS timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown');
  } else state('Monitor configuration', 'NOT CONFIGURED', 'yellow');
  state(
    'LaunchAgent installed',
    launchAgentInstalled ? 'YES' : 'NO',
    launchAgentInstalled ? 'green' : 'yellow',
  );
  info('LaunchAgent plist', launchAgentPlistPath);
  info('Configuration file', agentConfigPath);
  state('Managed by Brewly', storedState ? 'YES' : 'NO', storedState ? 'green' : 'yellow');
  state(
    'Repeating power event',
    repeatingEvents.length > 0 ? 'CONFIGURED' : 'NOT CONFIGURED',
    repeatingEvents.length > 0 ? 'green' : 'yellow',
  );
  if (storedState) info('Last applied', storedState.appliedAt);
  if (storedState && repeatingEvents.length === 0)
    warning('Managed state exists, but no repeating power event is currently visible in pmset.');
  section('Current pmset schedule');
  if (repeatingEvents.length === 0) warning('No repeating power events detected.');
  else repeatingEvents.forEach((event) => item(event));
  info('State file', statePath);
  console.log('');
}

/**
 * @function enable
 * @description Enables the configured repeating wake-or-power-on event, optionally as a dry run.
 *
 * @param options - Dry-run and overwrite safeguards.
 * @returns Nothing when the schedule is applied or previewed.
 * @throws Throws when an external schedule would be overwritten without force or pmset fails.
 */
function enable(options: PowerCommandOptions): void {
  const launchAgentInstalled = isLaunchAgentInstalled(userHomeDirectory);
  if (!launchAgentInstalled) {
    if (options.dryRun) {
      header('Brewly — Power schedule preview');
      state('Configuration', 'NOT CONFIGURED', 'yellow');
      warning(
        `LaunchAgent is not installed. A real enable will be rejected until you run "brewly agent install". Expected plist: ${launchAgentPlistPath}`,
      );
      state('Result', 'NO CHANGES MADE', 'yellow');
      success('Dry run completed. macOS was not modified.');
      return;
    }
    requireLaunchAgent();
  }

  const config = requireEffectiveConfig();
  const schedule = buildPowerSchedule(config, loadPowerOffset());
  const systemSchedule = readSystemSchedule();
  const repeatingEvents = extractRepeatingPowerEvents(systemSchedule);
  const storedState = parseStoredState();
  const externalSchedule = repeatingEvents.length > 0 && !storedState;

  header(`Brewly — Power schedule ${options.dryRun ? 'preview' : 'enable'}`);
  printScheduleDetails(config, schedule);
  info('Planned command', `pmset repeat wakeorpoweron ${schedule.weekdays} ${schedule.time}`);

  if (externalSchedule && !options.force) {
    if (options.dryRun)
      warning(
        'An unrecognized repeating power schedule exists. A real enable would require --force to replace it.',
      );
    else
      throw new Error(
        'An unrecognized repeating power schedule already exists. Review power status and use --force only if replacing it is intentional.',
      );
  }

  if (options.dryRun) {
    state('Result', 'NO CHANGES MADE', 'yellow');
    success('Dry run completed. macOS was not modified.');
    return;
  }

  applyPowerSchedule(schedule);
  writeStoredState(schedule, externalSchedule ? systemSchedule : null);
  state('Result', 'ENABLED', 'green');
  success('Power schedule enabled. Brewly does not change FileVault or automatic login settings.');
  if (externalSchedule && options.force)
    warning(
      'An existing repeating power schedule was replaced. Its previous output was saved in the state file.',
    );
}

/**
 * @function disable
 * @description Disables the managed repeating power schedule, with explicit protection for external events.
 *
 * @param options - Dry-run and cancellation safeguards.
 * @returns Nothing when the schedule is canceled or previewed.
 * @throws Throws when an unrecognized schedule would be canceled without force or pmset fails.
 */
function disable(options: PowerCommandOptions): void {
  const storedState = parseStoredState();
  const systemSchedule = readSystemSchedule();
  const repeatingEvents = extractRepeatingPowerEvents(systemSchedule);
  const hasUnrestorablePreviousSchedule = Boolean(storedState?.previousSchedule);

  header(`Brewly — Power schedule ${options.dryRun ? 'preview' : 'disable'}`);
  state('Managed by Brewly', storedState ? 'YES' : 'NO', storedState ? 'green' : 'yellow');
  info('Planned command', 'pmset repeat cancel');

  if (!storedState && repeatingEvents.length > 0 && !options.force) {
    if (options.dryRun)
      warning(
        'No Brewly schedule is recorded. A real disable would require --force to cancel external events.',
      );
    else
      throw new Error(
        'No Brewly schedule is recorded, so the existing repeating events were not canceled. Use --force only to cancel external events intentionally.',
      );
  }
  if (hasUnrestorablePreviousSchedule && !options.force) {
    if (options.dryRun)
      warning(
        'The managed schedule replaced a previous repeating schedule. A real disable would require --force and would cancel all repeating events.',
      );
    else
      throw new Error(
        'The managed schedule replaced a previous repeating schedule. Use --force only if canceling all repeating events is intentional.',
      );
  }
  if (options.dryRun) {
    state('Result', 'NO CHANGES MADE', 'yellow');
    success('Dry run completed. macOS was not modified.');
    return;
  }

  if (repeatingEvents.length > 0) cancelPowerSchedule();
  removeStoredState();
  state('Result', 'DISABLED', 'green');
  success(
    'Repeating power schedule disabled. FileVault and automatic login settings were not changed.',
  );
  if (options.force)
    warning('Any repeating power events, including external events, were canceled.');
}

/**
 * @function main
 * @description Dispatches power schedule actions from the global CLI or direct script.
 *
 * @param args - Arguments after the power command.
 * @returns Nothing; operation errors are reported to the terminal.
 * @throws Throws for unsupported actions or invalid options.
 *
 * @example
 * main(['enable', '--dry-run']);
 */
export function main(args: string[] = process.argv.slice(2)): void {
  const [rawCommand = 'help', ...commandArgs] = args;
  const command = rawCommand as PowerCommand;
  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }
  if (command === 'status') {
    if (commandArgs.length > 0) throw new Error('The power status action does not accept options.');
    printStatus();
    return;
  }
  if (command === 'enable') {
    enable(parsePowerArgs(commandArgs));
    return;
  }
  if (command === 'disable') {
    disable(parsePowerArgs(commandArgs));
    return;
  }
  throw new Error('Usage: brewly power <status|enable|disable> [--dry-run] [--force]');
}

if (require.main === module) {
  try {
    main();
  } catch (cause: unknown) {
    header('Brewly — Power schedule error');
    error(cause instanceof Error ? cause.message : String(cause));
    process.exitCode = 1;
  }
}

export type { PowerCommand, PowerCommandOptions, PowerSchedule, PowerScheduleState } from './types';
export type { PowerMutation } from './types';
export { parsePowerOffset } from '../../src/config';
