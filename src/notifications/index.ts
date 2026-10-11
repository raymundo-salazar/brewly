import { execFile } from 'node:child_process';
import { TITLE } from './constants';
import type {
  ExecuteNotification,
  NotificationConstructor,
  NotificationLogger,
  NotifierOptions,
} from './types';

/**
 * @function createNotifier
 * @description Creates start and stop notifications for the current platform.
 *
 * @param NotificationApi - Electron-compatible notification constructor.
 * @param log - Logger for unsupported notifications or macOS command failures.
 * @param options - Platform and command-execution adapters.
 * @returns An object with `started` and `stopped` notification methods.
 * @throws Throws when a desktop notification constructor rejects its options.
 *
 * @method started - Displays the monitor-started notification.
 * @returns Nothing.
 * @method stopped - Displays the monitor-stopped notification.
 * @returns Nothing.
 *
 * @example
 * const notifier = createNotifier(Notification);
 * notifier.started();
 */
export function createNotifier(
  NotificationApi: NotificationConstructor,
  log: NotificationLogger = (): void => undefined,
  options: NotifierOptions = {},
): { started: () => void; stopped: () => void } {
  const platform = options.platform ?? process.platform;
  const runCommand: ExecuteNotification =
    options.execFile ??
    ((file, args, callback): void => {
      execFile(file, args, callback);
    });
  const supported = !NotificationApi.isSupported || NotificationApi.isSupported();

  /**
   * @function show
   * @description Displays a start or stop notification using the platform's available mechanism.
   *
   * @param body - Notification body text.
   * @returns Nothing; macOS notifications are dispatched asynchronously.
   * @throws Notification constructor errors may propagate on supported desktop platforms.
   */
  const show = (body: string): void => {
    if (platform === 'darwin') {
      runCommand(
        '/usr/bin/osascript',
        ['-e', `display notification ${JSON.stringify(body)} with title ${JSON.stringify(TITLE)}`],
        (error) => {
          if (error) log(`macOS notification failed: ${error.message}`);
        },
      );
      return;
    }

    if (!supported) {
      log('desktop notifications are not supported');
      return;
    }
    new NotificationApi({ title: TITLE, body }).show();
  };

  return {
    started: (): void => show('The idle monitor has started.'),
    stopped: (): void => show('The idle monitor has stopped.'),
  };
}

export { TITLE } from './constants';
export type {
  ExecuteNotification,
  NotificationConstructor,
  NotificationInstance,
  NotificationLogger,
  NotifierOptions,
} from './types';
