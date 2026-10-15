import fs from 'node:fs';
import { paint } from '../cliOutput';
import { formatStoredLogLine } from '../time';
import type { Logger, LoggerOptions, LoggerOutput, LogTone } from './types';

/**
 * @function toneFor
 * @description Selects a readable console tone based on the semantic log message.
 *
 * @param message - Log message to classify.
 * @returns The display tone associated with the message.
 * @throws Does not throw for a string message.
 */
function toneFor(message: string): LogTone {
  if (message.includes('failed')) return 'red';
  if (message.includes('threshold exceeded')) return 'yellow';
  if (message.includes('outside schedule')) return 'gray';
  if (message.includes('started') || message.includes('stopping') || message.includes('executed'))
    return 'green';
  return 'cyan';
}

/**
 * @function createLogger
 * @description Creates a logger that persists UTC timestamps and displays localized output.
 *
 * @param logFile - Optional file path for persisted UTC log entries.
 * @param output - Console-like output adapter for interactive display.
 * @param options - Display options, including the configured timezone.
 * @returns A logger function that records and displays messages.
 * @throws Throws when a configured log file cannot be written.
 *
 * @example
 * const log = createLogger(null);
 * log('monitor started');
 */
export function createLogger(
  logFile: string | null,
  output: LoggerOutput = console,
  options: LoggerOptions = {},
): Logger {
  const timeZone = options.timezone ?? 'America/Monterrey';
  return (message: string): void => {
    const storedLine = `${new Date().toISOString()} | ${message}`;
    output.log(paint(formatStoredLogLine(storedLine, timeZone), toneFor(message)));
    if (logFile) fs.appendFileSync(logFile, `${storedLine}\n`);
  };
}

export type { Logger, LoggerOptions, LoggerOutput, LogTone } from './types';
