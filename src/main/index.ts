import path from 'node:path';
import { app, Notification, powerMonitor } from 'electron';
import { createAction } from '../actions';
import { createAwakeGuard } from '../awake';
import { loadConfig } from '../config';
import { recordConfigChanges } from '../configHistory';
import { loadEnvFile } from '../env';
import { createLogger } from '../logger';
import { createMonitor } from '../monitor';
import { createNotifier } from '../notifications';
import { removeRuntimeState, writeRuntimeState } from '../runtimeState';
import type { CheckStatus, RuntimeState } from '../runtimeState';

const envFile = process.env.IDLE_ENV_FILE ?? path.join(process.cwd(), '.env');
loadEnvFile(path.resolve(envFile));
const config = loadConfig();

/**
 * @function applicationBootstrap
 * @description Boots the Electron monitor after the application session is ready.
 *
 * @returns A promise callback managed by Electron's ready event.
 * @throws Runtime initialization errors are surfaced through the Electron process.
 */
void app.whenReady().then((): void => {
  if (!config.logFile) config.logFile = path.join(app.getPath('userData'), 'mac-idle-keeper.log');
  const runtimeStateFile = path.join(app.getPath('userData'), 'runtime-state.json');
  const configHistoryFile = path.join(app.getPath('userData'), 'config-history.json');
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  const log = createLogger(config.logFile, console, { timezone: config.timezone });
  const notifier = createNotifier(Notification, log);
  const awakeGuard = createAwakeGuard({ log });
  const monitor = createMonitor({
    powerMonitor,
    action: createAction(config.action),
    awakeGuard,
    config,
    log,
  });

  const runtimeState: RuntimeState = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    config: {
      intervalMs: config.intervalMs,
      idleThresholdSeconds: config.idleThresholdSeconds,
      days: config.days,
      startTime: config.startTime,
      endTime: config.endTime,
      timezone: config.timezone,
      action: config.action,
      logFile: config.logFile,
    },
  };
  /**
   * @function persistState
   * @description Persists the effective configuration and latest monitor result for status inspection.
   *
   * @param result - Optional monitor result whose status should be recorded.
   * @returns Nothing.
   * @throws Throws when the runtime state file cannot be written.
   */
  const persistState = (result: { status?: CheckStatus } = {}): void => {
    writeRuntimeState(runtimeStateFile, {
      ...runtimeState,
      lastCheckAt: new Date().toISOString(),
      lastCheckStatus: result.status ?? 'starting',
      inSchedule: result.status !== 'outside-schedule',
    });
  };

  notifier.started();
  log(`started; interval=${config.intervalMs}ms timezone=${config.timezone}`);
  recordConfigChanges(configHistoryFile, config, log);
  persistState();
  /**
   * @function runCheck
   * @description Runs one monitor check and records failures without terminating the process.
   *
   * @returns Nothing; the asynchronous check is handled in the background.
   * @throws Does not throw synchronously; asynchronous failures are written to the logger.
   */
  const runCheck = (): void => {
    void monitor
      .check()
      .then(persistState)
      .catch((error: unknown) =>
        log(
          `check failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
        ),
      );
  };
  runCheck();
  setInterval(runCheck, config.intervalMs);

  app.once('before-quit', (): void => {
    awakeGuard.stop();
    removeRuntimeState(runtimeStateFile);
    notifier.stopped();
    log('stopping');
  });
});

app.on('window-all-closed', (): void => undefined);
