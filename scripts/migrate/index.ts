#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { getAgentConfigPath, readAgentConfig } from '../../src/agentConfig';
import { error, header, info, item, section, state, success, warning } from '../../src/cliOutput';
import { configurationEnvironmentNames } from '../../src/configArguments';
import type { LegacyInstallation, MigrationOptions, MigrationPaths } from './types';

const legacyLabel = 'com.local.mac-idle-keeper';
const currentLabel = 'com.local.brewly';
const homeDirectory = os.homedir();
const launchAgentsDirectory = path.join(homeDirectory, 'Library', 'LaunchAgents');
const legacySupportDirectory = path.join(
  homeDirectory,
  'Library',
  'Application Support',
  'mac-idle-keeper',
);
const currentSupportDirectory = path.join(
  homeDirectory,
  'Library',
  'Application Support',
  'brewly',
);
const currentPlistPath = path.join(launchAgentsDirectory, `${currentLabel}.plist`);
const paths: MigrationPaths = {
  legacyLabel,
  legacyPlistPath: path.join(launchAgentsDirectory, `${legacyLabel}.plist`),
  legacySupportDirectory,
  legacyConfigPath: path.join(legacySupportDirectory, 'agent-config.json'),
  legacyLogDirectory: path.join(homeDirectory, 'Library', 'Logs', 'mac-idle-keeper'),
  currentSupportDirectory,
  currentConfigPath: getAgentConfigPath(homeDirectory),
  currentLogDirectory: path.join(homeDirectory, 'Library', 'Logs', 'brewly'),
};
const legacyService = `gui/${process.getuid?.() ?? process.pid}/${legacyLabel}`;

/**
 * @function parseMigrationOptions
 * @description Parses the safety options accepted by the migration command.
 *
 * @param args - Arguments supplied after the `migrate` command.
 * @returns Normalized migration options.
 * @throws Throws when an unsupported option is supplied.
 *
 * @example
 * parseMigrationOptions(['--dry-run']);
 * // { dryRun: true }
 */
export function parseMigrationOptions(args: string[]): MigrationOptions {
  const options: MigrationOptions = { dryRun: false };
  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help' || arg === '-h') printHelp();
    else throw new Error(`Unsupported migrate option: ${arg}. Use --dry-run or --help.`);
  }
  return options;
}

/**
 * @function xmlDecode
 * @description Decodes the XML entities used in plist path values.
 *
 * @param value - XML-encoded text.
 * @returns The decoded path text.
 * @throws Does not throw for a string value.
 */
function xmlDecode(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * @function configPathFromPlist
 * @description Reads the legacy configuration snapshot path from a LaunchAgent plist.
 *
 * @param plistPath - Legacy plist path to inspect.
 * @returns The configured snapshot path, or `null` when the plist does not expose one.
 * @throws Does not throw when the plist is missing or unreadable.
 */
export function configPathFromPlist(plistPath: string): string | null {
  try {
    const contents = fs.readFileSync(plistPath, 'utf8');
    const match = /<key>IDLE_CONFIG_FILE<\/key>\s*<string>([^<]+)<\/string>/.exec(contents);
    return match?.[1] ? xmlDecode(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * @function discoverLegacyInstallation
 * @description Discovers the previous installation and loads its effective configuration snapshot.
 *
 * @returns The legacy installation details, or `null` when no legacy configuration exists.
 * @throws Does not throw for missing legacy files; malformed snapshots are treated as unavailable.
 *
 * @example
 * const legacy = discoverLegacyInstallation();
 * if (legacy) console.log(legacy.config.startTime);
 */
export function discoverLegacyInstallation(): LegacyInstallation | null {
  const plistConfigPath = configPathFromPlist(paths.legacyPlistPath);
  const configCandidates = [plistConfigPath, paths.legacyConfigPath].filter(
    (candidate): candidate is string => Boolean(candidate),
  );
  let selectedConfigPath: string | undefined;
  let snapshot: ReturnType<typeof readAgentConfig> = null;
  for (const candidate of configCandidates) {
    const candidateSnapshot = readAgentConfig(candidate);
    if (candidateSnapshot) {
      selectedConfigPath = candidate;
      snapshot = candidateSnapshot;
      break;
    }
  }
  if (!snapshot) return null;

  return {
    paths: {
      ...paths,
      legacyConfigPath: selectedConfigPath ?? paths.legacyConfigPath,
    },
    snapshot,
    config: snapshot.config,
    hasLegacyPlist: fs.existsSync(paths.legacyPlistPath),
    hasLegacyPowerState: fs.existsSync(
      path.join(paths.legacySupportDirectory, 'power-schedule.json'),
    ),
  };
}

/**
 * @function migrationEnvironment
 * @description Converts the legacy effective configuration into explicit Brewly install options.
 *
 * @param installation - Legacy installation whose configuration must be preserved.
 * @returns An environment suitable for the current LaunchAgent installer.
 * @throws Does not throw for a valid legacy configuration.
 */
export function migrationEnvironment(installation: LegacyInstallation): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env, IDLE_CONFIG_SOURCE: 'global' };
  for (const key of configurationEnvironmentNames) delete environment[key];
  delete environment.IDLE_ENV_FILE;
  delete environment.IDLE_ENV_FILE_EXPLICIT;

  const config = installation.config;
  const legacyDefaultLogPath = path.join(
    installation.paths.legacySupportDirectory,
    'mac-idle-keeper.log',
  );
  Object.assign(environment, {
    IDLE_CHECK_INTERVAL_MS: String(config.intervalMs),
    IDLE_THRESHOLD_SECONDS: String(config.idleThresholdSeconds),
    IDLE_DAYS: config.days.join(','),
    IDLE_START_TIME: config.startTime,
    IDLE_END_TIME: config.endTime,
    IDLE_TIMEZONE: config.timezone,
    IDLE_ACTION: config.action,
    POWER_ON_OFFSET_MINUTES: String(installation.snapshot.powerOnOffsetMinutes),
  });
  if (config.logFile && config.logFile !== legacyDefaultLogPath)
    environment.IDLE_LOG_FILE = config.logFile;
  return environment;
}

/**
 * @function launchctl
 * @description Executes a launchctl operation while optionally tolerating an absent service.
 *
 * @param args - Arguments passed to launchctl.
 * @param allowFailure - Whether command failure should be ignored.
 * @returns Nothing.
 * @throws Rethrows launchctl failures when `allowFailure` is false.
 */
function launchctl(args: string[], allowFailure = false): void {
  try {
    execFileSync('/bin/launchctl', args, { stdio: allowFailure ? 'ignore' : 'inherit' });
  } catch (cause) {
    if (!allowFailure) throw cause;
  }
}

/**
 * @function copyIfPresent
 * @description Copies a legacy file to its new location without overwriting existing data.
 *
 * @param source - Legacy source file.
 * @param destination - New destination file.
 * @returns Whether a file was copied.
 * @throws Throws when an existing source cannot be copied.
 */
function copyIfPresent(source: string, destination: string): boolean {
  if (!fs.existsSync(source) || fs.existsSync(destination)) return false;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return true;
}

/**
 * @function preserveLegacyData
 * @description Copies legacy power state and default logs into the current Brewly directories.
 *
 * @param installation - Legacy installation to preserve.
 * @returns A list of copied paths.
 * @throws Throws when a discovered legacy artifact cannot be copied.
 */
function preserveLegacyData(installation: LegacyInstallation): string[] {
  const copied: string[] = [];
  const legacyState = path.join(installation.paths.legacySupportDirectory, 'power-schedule.json');
  const currentState = path.join(installation.paths.currentSupportDirectory, 'power-schedule.json');
  if (copyIfPresent(legacyState, currentState)) copied.push(currentState);

  const legacyLog = path.join(installation.paths.legacySupportDirectory, 'mac-idle-keeper.log');
  const currentLog = path.join(installation.paths.currentSupportDirectory, 'brewly.log');
  if (copyIfPresent(legacyLog, currentLog)) copied.push(currentLog);

  for (const fileName of ['launch-agent.stdout.log', 'launch-agent.stderr.log']) {
    const source = path.join(installation.paths.legacyLogDirectory, fileName);
    const destination = path.join(installation.paths.currentLogDirectory, fileName);
    if (copyIfPresent(source, destination)) copied.push(destination);
  }
  return copied;
}

/**
 * @function installCurrentAgent
 * @description Installs the current LaunchAgent using the migrated configuration.
 *
 * @param environment - Explicit environment values generated from the legacy snapshot.
 * @returns Nothing when the child installer succeeds.
 * @throws Throws when the current installer exits unsuccessfully.
 */
function installCurrentAgent(environment: NodeJS.ProcessEnv): void {
  const installerPath = path.join(__dirname, '..', 'installLaunchAgent', 'index.js');
  const result = spawnSync(process.execPath, [installerPath], {
    env: environment,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`Current LaunchAgent installation exited with code ${result.status}.`);
}

/**
 * @function printHelp
 * @description Prints migration usage and safety behavior.
 *
 * @returns Nothing; help text is written to standard output.
 * @throws Does not throw during normal terminal output.
 */
export function printHelp(): void {
  header('Brewly — Migration help');
  section('Usage');
  item('brewly migrate [options]');
  section('Options');
  info('--dry-run', 'Inspect the legacy installation without changing macOS or files.');
  info('--help, -h', 'Show this migration reference.');
  section('Behavior');
  info('Supported sources', 'Global npm installations and source-checkout installations.');
  info('Configuration', 'Preserves the legacy effective configuration and power offset.');
  info('Legacy data', 'Keeps the old configuration and logs for rollback after migration.');
  console.log('');
}

/**
 * @function migrate
 * @description Migrates a legacy installation to Brewly while preserving runtime behavior.
 *
 * @param options - Dry-run behavior for the migration.
 * @returns Nothing when migration completes successfully.
 * @throws Throws when no legacy configuration is found or the new agent cannot be verified.
 *
 * @example
 * // Preview a migration:
 * // brewly migrate --dry-run
 */
export function migrate(options: MigrationOptions): void {
  if (fs.existsSync(currentPlistPath)) {
    throw new Error(
      `The Brewly LaunchAgent is already installed at ${currentPlistPath}. Use "brewly agent restart" to refresh it instead of migrate.`,
    );
  }
  const installation = discoverLegacyInstallation();
  if (!installation) {
    throw new Error(
      `No legacy Brewly configuration was found at ${paths.legacyConfigPath}. The old LaunchAgent may not be installed or its snapshot may be missing.`,
    );
  }

  header(`Brewly — Migration ${options.dryRun ? 'preview' : 'from legacy installation'}`);
  info('Legacy service', installation.paths.legacyLabel);
  info('Legacy plist', installation.paths.legacyPlistPath);
  info('Legacy configuration', installation.paths.legacyConfigPath);
  info('Current service', currentLabel);
  info('Current configuration', installation.paths.currentConfigPath);
  info('Source', installation.snapshot.source);
  info('Schedule', `${installation.config.startTime}-${installation.config.endTime}`);
  info('Timezone', installation.config.timezone);
  state('Legacy LaunchAgent', installation.hasLegacyPlist ? 'FOUND' : 'NOT FOUND', 'yellow');
  state('Legacy power state', installation.hasLegacyPowerState ? 'FOUND' : 'NOT FOUND', 'yellow');

  if (options.dryRun) {
    state('Result', 'NO CHANGES MADE', 'yellow');
    success('Migration preview completed. macOS and application files were not modified.');
    return;
  }

  const environment = migrationEnvironment(installation);
  launchctl(['bootout', legacyService], true);
  if (installation.hasLegacyPlist) launchctl(['unload', installation.paths.legacyPlistPath], true);
  try {
    installCurrentAgent(environment);
  } catch (cause) {
    if (installation.hasLegacyPlist) launchctl(['load', installation.paths.legacyPlistPath], true);
    throw cause;
  }

  let copied: string[] = [];
  try {
    copied = preserveLegacyData(installation);
  } catch (cause) {
    warning(
      `The new service is installed, but some legacy data could not be copied: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  if (fs.existsSync(installation.paths.legacyPlistPath)) {
    fs.unlinkSync(installation.paths.legacyPlistPath);
    state('Legacy LaunchAgent', 'REMOVED', 'green');
  } else state('Legacy LaunchAgent', 'NOT INSTALLED', 'yellow');
  state('Current LaunchAgent', 'INSTALLED', 'green');
  if (copied.length > 0) {
    section('Preserved data');
    copied.forEach((filePath) => item(filePath));
  }
  success(
    'Migration completed. The new Brewly LaunchAgent is running with the previous configuration.',
  );
  warning(`Legacy application data was retained at ${installation.paths.legacySupportDirectory}.`);
}

/**
 * @function main
 * @description Dispatches the migration command and converts failures into human-readable output.
 *
 * @returns Nothing; the process exit code reflects migration success or failure.
 * @throws Does not throw; command errors are reported and assigned to `process.exitCode`.
 */
function main(): void {
  try {
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.includes('-h')) {
      printHelp();
      return;
    }
    migrate(parseMigrationOptions(args));
  } catch (cause: unknown) {
    header('Brewly — Migration failed');
    error(cause instanceof Error ? cause.message : String(cause));
    process.exitCode = 1;
  }
}

if (require.main === module) main();

export type { LegacyInstallation, MigrationOptions, MigrationPaths } from './types';
