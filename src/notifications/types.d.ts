/** Represents a desktop notification instance. */
export interface NotificationInstance {
  show(): void;
}

/** Describes the Electron-compatible notification constructor. */
export interface NotificationConstructor {
  new (options: { title: string; body: string }): NotificationInstance;
  isSupported?: () => boolean;
}

/** Executes a platform notification command. */
export type ExecuteNotification = (
  file: string,
  args: string[],
  callback: (error: Error | null) => void,
) => void;

/** Provides notification platform and command adapters. */
export interface NotifierOptions {
  platform?: NodeJS.Platform;
  execFile?: ExecuteNotification;
}

/** Records notification adapter errors and diagnostics. */
export type NotificationLogger = (message: string) => void;
