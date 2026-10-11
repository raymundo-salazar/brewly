import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DEFAULTS } from '../../src/config';
import { getAgentConfigPath, readAgentConfig } from '../../src/agentConfig';
import { readRuntimeState } from '../../src/runtimeState';
import { formatStoredLogLine } from '../../src/time';
import {
  error as printError,
  header,
  info,
  item,
  section,
  state,
  warning,
} from '../../src/cliOutput';
import type { LogContext, LogOptions } from './types';

const runtimeStatePath = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'mac-idle-keeper',
  'runtime-state.json',
);
const agentConfigPath = getAgentConfigPath(os.homedir());
const defaultLogPath = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'mac-idle-keeper',
  'mac-idle-keeper.log',
);

/**
 * @function parseArgs
 * @description Parses log tail and follow options.
 *
 * @param args - Command-line arguments after the logs command.
 * @returns Normalized follow and line-count options.
 * @throws Throws when `--lines` is not a positive integer.
 */
export function parseArgs(args: string[]): LogOptions {
  const options: LogOptions = { follow: false, lines: 50 };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--follow' || arg === '-f') options.follow = true;
    else if (arg === '--lines' || arg === '-n') options.lines = Number(args[++index]);
    else if (arg?.startsWith('--lines=')) options.lines = Number(arg.slice('--lines='.length));
  }
  if (!Number.isInteger(options.lines) || options.lines < 1)
    throw new Error('--lines must be a positive integer.');
  return options;
}

/**
 * @function resolveLogContext
 * @description Resolves the live log path and effective display timezone from runtime state or environment.
 *
 * @returns The active log file path and display timezone.
 * @throws Does not throw for absent runtime state; environment file read errors may propagate.
 */
export function resolveLogContext(): LogContext {
  const runtimeState = readRuntimeState(runtimeStatePath);
  if (runtimeState?.config) {
    return {
      filePath: runtimeState.config.logFile
        ? path.resolve(runtimeState.config.logFile)
        : defaultLogPath,
      timezone: runtimeState.config.timezone,
    };
  }

  const config = readAgentConfig(agentConfigPath)?.config;
  if (!config) return { filePath: defaultLogPath, timezone: DEFAULTS.timezone };
  return {
    filePath: config.logFile ? path.resolve(config.logFile) : defaultLogPath,
    timezone: config.timezone,
  };
}

/**
 * @function resolveLogPath
 * @description Resolves only the configured log path for callers that do not need display metadata.
 *
 * @returns The absolute path of the active log file.
 * @throws May throw when the configured environment file cannot be read.
 */
export function resolveLogPath(): string {
  return resolveLogContext().filePath;
}

/**
 * @function readLastLines
 * @description Reads the last requested number of complete lines from a log file.
 *
 * @param filePath - Log file to read.
 * @param lines - Number of lines to return.
 * @returns The requested trailing complete lines.
 * @throws Throws when the file cannot be read.
 */
export function readLastLines(filePath: string, lines: number): string[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const entries = content.split(/\r?\n/);
  if (entries.at(-1) === '') entries.pop();
  return entries.slice(-lines);
}

/**
 * @function followFile
 * @description Follows appended log data and localizes each completed stored log line.
 *
 * @param filePath - Log file to follow.
 * @param initialOffset - Byte offset from which new content should be read.
 * @param timeZone - IANA timezone used to display timestamps.
 * @returns Nothing; subsequent lines are written as the file changes.
 * @throws May emit filesystem errors through the watch or stream callbacks.
 */
function followFile(filePath: string, initialOffset: number, timeZone: string): void {
  let offset = initialOffset;
  let pending = '';
  fs.watchFile(filePath, { interval: 500 }, (current) => {
    if (current.size < offset) {
      offset = 0;
      pending = '';
    }
    if (current.size === offset) return;

    const stream = fs.createReadStream(filePath, {
      start: offset,
      end: current.size - 1,
      encoding: 'utf8',
    });
    let output = '';
    stream.on('data', (chunk: string | Buffer) => {
      output += chunk.toString();
    });
    stream.on('end', (): void => {
      const lines = `${pending}${output}`.split(/\r?\n/);
      pending = lines.pop() ?? '';
      process.stdout.write(
        lines.map((line) => `${formatStoredLogLine(line, timeZone)}\n`).join(''),
      );
      offset = current.size;
    });
  });
}

/**
 * @function main
 * @description Prints recent logs and optionally continues following the application log.
 *
 * @returns Nothing; output is written to the terminal.
 * @throws Throws when the requested log file is unavailable or arguments are invalid.
 *
 * @example
 * // mac-idle-keeper logs --lines 20 --follow
 */
export function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const context = resolveLogContext();
  if (!fs.existsSync(context.filePath)) throw new Error(`Log file not found: ${context.filePath}`);

  header('Mac Idle Keeper — Application log');
  info('Log', context.filePath);
  info('Display timezone', context.timezone);
  info('Lines', options.lines);
  const recentLines = readLastLines(context.filePath, options.lines);
  section('Recent entries');
  if (recentLines.length === 0) warning('No log entries found.');
  else for (const line of recentLines) item(formatStoredLogLine(line, context.timezone));
  if (options.follow) {
    section('Follow mode');
    state('Process', 'FOLLOWING', 'green');
    info('Stop', 'Press Ctrl+C');
    followFile(context.filePath, fs.statSync(context.filePath).size, context.timezone);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (cause: unknown) {
    header('Mac Idle Keeper — Application log error');
    printError(`Unable to read log: ${cause instanceof Error ? cause.message : String(cause)}`);
    process.exitCode = 1;
  }
}

export type { LogContext, LogOptions } from './types';
export { formatStoredLogLine } from '../../src/time';
