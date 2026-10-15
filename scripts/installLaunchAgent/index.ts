import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseConfigurationArguments } from '../../src/configArguments';
import { loadConfig, parsePowerOffset } from '../../src/config';
import { getAgentConfigPath, writeAgentConfig } from '../../src/agentConfig';
import { error, header, info, success } from '../../src/cliOutput';
import { loadEnvFile } from '../../src/env';
import type { LaunchAgentPaths } from './types';

process.on('uncaughtException', (cause: Error): void => {
  header('Brewly — LaunchAgent installation failed');
  error(cause.message);
  process.exitCode = 1;
});

const projectDir = path.resolve(__dirname, '..', '..', '..');
const workingDirectory = path.resolve(process.cwd());
const launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
const plistPath = path.join(launchAgentsDir, 'com.local.brewly.plist');
const electronPath = path.join(
  projectDir,
  'node_modules',
  'electron',
  'dist',
  'Electron.app',
  'Contents',
  'MacOS',
  'Electron',
);
const mainPath = path.join(projectDir, 'dist', 'src', 'main', 'index.js');
const logDir = path.join(os.homedir(), 'Library', 'Logs', 'brewly');
const configPath = getAgentConfigPath(os.homedir());
const parsedArguments = parseConfigurationArguments(process.argv.slice(2));
const environment = parsedArguments.environment;
const environmentFilePath = path.resolve(
  environment.IDLE_ENV_FILE ?? path.join(process.cwd(), '.env'),
);
const isGlobalConfiguration = environment.IDLE_CONFIG_SOURCE === 'global';
const hasExplicitEnvironmentFile = environment.IDLE_ENV_FILE_EXPLICIT === '1';
const shouldLoadEnvironmentFile = !isGlobalConfiguration || hasExplicitEnvironmentFile;
if (shouldLoadEnvironmentFile) loadEnvFile(environmentFilePath, environment);
const config = loadConfig(environment);
const configurationSource = hasExplicitEnvironmentFile
  ? environmentFilePath
  : isGlobalConfiguration
    ? 'defaults and command-line arguments'
    : environmentFilePath;
const service = `gui/${process.getuid?.() ?? process.pid}/com.local.brewly`;
const paths: LaunchAgentPaths = {
  projectDir,
  mainPath,
  workingDirectory,
  plistPath,
  electronPath,
  logDir,
  configPath,
  service,
};

/**
 * @function escapeXml
 * @description Escapes user-controlled paths before inserting them into the plist XML document.
 *
 * @param value - Text that may contain XML-reserved characters.
 * @returns XML-safe text.
 * @throws Does not throw for a string value.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * @function environmentXml
 * @description Builds the persisted configuration XML entry for the LaunchAgent.
 *
 * @param persistedConfigPath - Absolute path to the configuration snapshot.
 * @returns An XML fragment containing `IDLE_CONFIG_FILE`.
 * @throws Does not throw for a valid configuration path.
 */
function environmentXml(persistedConfigPath: string): string {
  return `\n  <key>EnvironmentVariables</key><dict><key>IDLE_CONFIG_FILE</key><string>${escapeXml(persistedConfigPath)}</string></dict>`;
}

/**
 * @function createPlist
 * @description Creates the per-user LaunchAgent plist document.
 *
 * @param values - Resolved paths and service values for the LaunchAgent.
 * @returns A complete plist XML document.
 * @throws Does not throw for valid LaunchAgent path values.
 */
function createPlist(values: LaunchAgentPaths): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.local.brewly</string>
  <key>ProgramArguments</key><array><string>${escapeXml(values.electronPath)}</string><string>${escapeXml(values.mainPath)}</string></array>
  <key>WorkingDirectory</key><string>${escapeXml(values.workingDirectory)}</string>
  <key>StandardOutPath</key><string>${escapeXml(path.join(values.logDir, 'launch-agent.stdout.log'))}</string>
  <key>StandardErrorPath</key><string>${escapeXml(path.join(values.logDir, 'launch-agent.stderr.log'))}</string>${environmentXml(values.configPath)}
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>ProcessType</key><string>Background</string>
</dict></plist>`;
}

/**
 * @function main
 * @description Writes and loads the current user's LaunchAgent configuration.
 *
 * @returns Nothing; the process exits with an error when loading fails.
 * @throws Throws when the plist cannot be written, loaded, or verified.
 */
function main(): void {
  fs.mkdirSync(launchAgentsDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });
  writeAgentConfig(
    configPath,
    config,
    parsePowerOffset(environment.POWER_ON_OFFSET_MINUTES),
    configurationSource,
  );
  fs.writeFileSync(plistPath, `${createPlist(paths)}\n`);
  try {
    execFileSync('/bin/launchctl', ['unload', plistPath], { stdio: 'ignore' });
  } catch {
    // The service may not have been loaded yet.
  }
  try {
    execFileSync('/bin/launchctl', ['enable', service], { stdio: 'ignore' });
  } catch {
    // The service may not have been disabled or the user domain may be initializing.
  }
  execFileSync('/bin/launchctl', ['load', plistPath], { stdio: 'inherit' });
  try {
    execFileSync('/bin/launchctl', ['print', service], { stdio: 'ignore' });
  } catch {
    throw new Error(
      `LaunchAgent was not loaded. Check ${path.join(logDir, 'launch-agent.stderr.log')}.`,
    );
  }
  header('Brewly — LaunchAgent installed');
  success('Service loaded and ready to run at login.');
  info('Plist', plistPath);
  info('Configuration file', configPath);
  info('Project', projectDir);
  info('Configuration directory', workingDirectory);
}

main();

export { createPlist };
export type { LaunchAgentPaths } from './types';
