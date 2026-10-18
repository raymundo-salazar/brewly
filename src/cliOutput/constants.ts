import type { Tone } from './types';

/**
 * @constant COLORS
 * @description ANSI escape sequences used by human-readable CLI output.
 */
export const COLORS: Readonly<Record<Tone, string>> = Object.freeze({
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
});
