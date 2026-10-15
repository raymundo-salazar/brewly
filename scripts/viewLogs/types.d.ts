/** Stores parsed log tail and follow options. */
export interface LogOptions {
  follow: boolean;
  lines: number;
}

/** Stores the active log path and timestamp display timezone. */
export interface LogContext {
  filePath: string;
  timezone: string;
}
