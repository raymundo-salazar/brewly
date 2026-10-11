/** Represents the console-like output methods used by the logger. */
export interface LoggerOutput {
  log(message: string): void;
}

/** Configures localized interactive logger output. */
export interface LoggerOptions {
  timezone?: string;
}

/** Represents a function that records one log message. */
export type Logger = (message: string) => void;

/** Lists semantic tones used by the logger. */
export type LogTone = 'red' | 'yellow' | 'gray' | 'green' | 'cyan';
