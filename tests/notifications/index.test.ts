import { TITLE, createNotifier } from '../../src/notifications';

describe('Notifications', () => {
  test('shows start and stop notifications on supported desktop platforms', () => {
    const notifications: Array<{ title: string; body: string }> = [];
    /**
     * @class TestNotification
     * @description Test double that records supported desktop notifications.
     */
    class TestNotification {
      static isSupported(): boolean {
        return true;
      }
      constructor(public readonly options: { title: string; body: string }) {}
      show(): void {
        notifications.push(this.options);
      }
    }
    const notifier = createNotifier(TestNotification, () => undefined, { platform: 'linux' });

    notifier.started();
    notifier.stopped();

    expect(TITLE).toBe('Mac Idle Keeper');
    expect(notifications).toEqual([
      { title: TITLE, body: 'The idle monitor has started.' },
      { title: TITLE, body: 'The idle monitor has stopped.' },
    ]);
  });

  test('reports unsupported desktop notifications', () => {
    const messages: string[] = [];
    /**
     * @class UnsupportedNotification
     * @description Test double that reports unavailable desktop notification support.
     */
    class UnsupportedNotification {
      static isSupported(): boolean {
        return false;
      }
      constructor(public readonly options: { title: string; body: string }) {}
      show(): void {
        void this.options;
      }
    }
    const notifier = createNotifier(UnsupportedNotification, (message) => messages.push(message), {
      platform: 'linux',
    });
    notifier.started();
    expect(messages).toEqual(['desktop notifications are not supported']);
  });

  test('uses osascript on macOS and reports command failures', () => {
    const calls: string[][] = [];
    const messages: string[] = [];
    const execFile = jest.fn(
      (file: string, args: string[], callback: (error: Error | null) => void): void => {
        calls.push([file, ...args]);
        callback(new Error('notification failed'));
      },
    );
    const notifier = createNotifier(
      class {
        show(): void {
          return undefined;
        }
      },
      (message) => messages.push(message),
      { platform: 'darwin', execFile },
    );

    notifier.started();
    notifier.stopped();

    expect(calls).toHaveLength(2);
    expect(calls[0]?.[0]).toBe('/usr/bin/osascript');
    expect(messages).toEqual([
      'macOS notification failed: notification failed',
      'macOS notification failed: notification failed',
    ]);
  });

  test('uses desktop notifications when support detection is absent', () => {
    const notifications: string[] = [];
    /**
     * @class NotificationWithoutSupportCheck
     * @description Test double whose constructor does not expose support detection.
     */
    class NotificationWithoutSupportCheck {
      constructor(options: { body: string }) {
        notifications.push(options.body);
      }
      show(): void {
        return undefined;
      }
    }
    const notifier = createNotifier(NotificationWithoutSupportCheck, () => undefined, {
      platform: 'linux',
    });
    notifier.started();
    expect(notifications).toEqual(['The idle monitor has started.']);
  });

  test('accepts default logger and platform options', () => {
    expect(() =>
      createNotifier(
        class {
          show(): void {
            return undefined;
          }
        },
      ),
    ).not.toThrow();
  });
});
