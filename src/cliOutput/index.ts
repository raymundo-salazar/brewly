import { COLORS } from './constants';
import type { Tone } from './types';

const useColors = Boolean(process.stdout.isTTY);

/**
 * @function paint
 * @description Applies a terminal color when output is attached to a TTY.
 *
 * @param value - Text to decorate.
 * @param tone - Color tone to apply.
 * @returns The decorated text, or the original text when color output is disabled.
 * @throws Does not throw for valid tone values.
 */
export function paint(value: string, tone: Tone): string {
  return useColors ? `${COLORS[tone]}${value}${COLORS.reset}` : value;
}

/**
 * @function header
 * @description Prints a colored CLI section header.
 *
 * @param title - Header title to print.
 * @returns Nothing.
 * @throws Does not throw for a valid title.
 */
export function header(title: string): void {
  console.log(`\n${paint(title, 'cyan')}`);
  console.log(paint('─'.repeat(title.length), 'gray'));
}

/**
 * @function section
 * @description Prints a smaller colored section title within a CLI response.
 *
 * @param title - Section title to print.
 * @returns Nothing.
 * @throws Does not throw for a valid title.
 */
export function section(title: string): void {
  console.log(`\n${paint(title, 'cyan')}`);
}

/**
 * @function info
 * @description Prints a labeled informational value.
 *
 * @param label - Label shown before the value.
 * @param value - String or numeric value to print.
 * @returns Nothing.
 * @throws Does not throw for valid output values.
 */
export function info(label: string, value: string | number): void {
  console.log(`${paint(`${label}:`, 'gray')} ${value}`);
}

/**
 * @function state
 * @description Prints a labeled state value using the semantic terminal tone for that state.
 *
 * @param label - State label shown before the value.
 * @param value - State text to display.
 * @param tone - Color tone associated with the state.
 * @returns Nothing.
 * @throws Does not throw for valid output values.
 */
export function state(label: string, value: string, tone: Tone): void {
  info(label, paint(value, tone));
}

/**
 * @function item
 * @description Prints one indented item for a readable CLI list.
 *
 * @param value - Item text to print.
 * @param tone - Optional color tone for the item.
 * @returns Nothing.
 * @throws Does not throw for valid output values.
 */
export function item(value: string, tone: Tone = 'gray'): void {
  console.log(`  ${paint(value, tone)}`);
}

/**
 * @function success
 * @description Prints a successful operation message.
 *
 * @param message - Success message to print.
 * @returns Nothing.
 * @throws Does not throw for a valid message.
 */
export function success(message: string): void {
  console.log(`${paint('✔', 'green')} ${message}`);
}

/**
 * @function warning
 * @description Prints a warning message.
 *
 * @param message - Warning message to print.
 * @returns Nothing.
 * @throws Does not throw for a valid message.
 */
export function warning(message: string): void {
  console.log(`${paint('⚠', 'yellow')} ${message}`);
}

/**
 * @function error
 * @description Prints an error message to stderr.
 *
 * @param message - Error message to print.
 * @returns Nothing.
 * @throws Does not throw for a valid message.
 */
export function error(message: string): void {
  console.error(`${paint('✖', 'red')} ${message}`);
}

export type { Tone } from './types';
