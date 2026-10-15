import os from 'node:os';
import path from 'node:path';
import { app, Menu, nativeImage, Notification, powerMonitor, Tray } from 'electron';
import { readAgentConfig } from '../agentConfig';
import { createAction } from '../actions';
import { createAwakeGuard } from '../awake';
import { loadConfig } from '../config';
import { recordConfigChanges } from '../configHistory';
import { loadEnvFile } from '../env';
import { createLogger } from '../logger';
import { createMonitor } from '../monitor';
import { createNotifier } from '../notifications';
import { removeRuntimeState, writeRuntimeState } from '../runtimeState';
import { createTray } from '../tray';
import { header, info } from '../cliOutput';
import type { Config } from '../config/types';
import type { CheckStatus, RuntimeState } from '../runtimeState';

/**
 * @constant applicationSupportPath
 * @description Defines the single managed application-data directory used by the Electron monitor.
 */
const applicationSupportPath = path.join(os.homedir(), 'Library', 'Application Support', 'brewly');

app.setPath('userData', applicationSupportPath);

/**
 * @function loadApplicationConfig
 * @description Loads the persisted agent snapshot when launched by LaunchAgent, or `.env` for a foreground start.
 *
 * @returns The immutable configuration used by the monitor process.
 * @throws Throws when a LaunchAgent points to a missing or invalid configuration snapshot.
 */
function loadApplicationConfig(): Config {
  if (process.env.IDLE_CONFIG_FILE) {
    const configPath = path.resolve(process.env.IDLE_CONFIG_FILE);
    const persisted = readAgentConfig(configPath);
    if (!persisted)
      throw new Error(
        `The persisted agent configuration is missing or invalid: ${configPath}. Run "brewly agent restart" to recreate it.`,
      );
    return persisted.config;
  }

  const envFile = process.env.IDLE_ENV_FILE ?? path.join(process.cwd(), '.env');
  loadEnvFile(path.resolve(envFile));
  return loadConfig();
}

const config = loadApplicationConfig();

/**
 * @function applicationBootstrap
 * @description Boots the Electron monitor after the application session is ready.
 *
 * @returns A promise callback managed by Electron's ready event.
 * @throws Runtime initialization errors are surfaced through the Electron process.
 */
void app.whenReady().then((): void => {
  if (!config.logFile) config.logFile = path.join(applicationSupportPath, 'brewly.log');
  const runtimeStateFile = path.join(applicationSupportPath, 'runtime-state.json');
  const configHistoryFile = path.join(applicationSupportPath, 'config-history.json');
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  const log = createLogger(config.logFile, console, { timezone: config.timezone });
  const notifier = createNotifier(Notification, log);
  let paused = false;
  let stopped = false;
  let intervalHandle: ReturnType<typeof setInterval> | undefined;
  const tray = createTray({
    locale: app.getLocale(),
    trayConstructor: Tray,
    nativeImage,
    menu: Menu,
    onPause: pauseMonitor,
    onResume: resumeMonitor,
    onStart: startMonitor,
    onStop: stopMonitor,
  });
  const awakeGuard = createAwakeGuard({ log });
  const monitor = createMonitor({
    powerMonitor,
    action: createAction(config.action),
    awakeGuard,
    config,
    log,
  });

  header('Brewly — Monitor');
  info('Schedule', `${config.startTime}-${config.endTime}`);
  info('Days', config.days.join(', '));
  info('Timezone', config.timezone);
  info('Check interval', `${config.intervalMs} ms`);
  info('Idle threshold', `${config.idleThresholdSeconds} seconds`);
  info('Activity action', config.action);

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
    if (stopped) return;
    tray.setStatus(
      result.status === undefined
        ? 'starting'
        : result.status === 'outside-schedule'
          ? 'outside-schedule'
          : 'in-schedule',
    );
    writeRuntimeState(runtimeStateFile, {
      ...runtimeState,
      lastCheckAt: new Date().toISOString(),
      lastCheckStatus: result.status ?? 'starting',
      inSchedule: result.status !== 'outside-schedule',
    });
  };

  notifier.started();
  tray.setStatus('starting');
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
      .catch((error: unknown): void => {
        if (stopped) return;
        tray.setStatus('error');
        log(
          `check failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
        );
      });
  };

  /**
   * @function startPolling
   * @description Starts the monitor interval when the monitor is not paused.
   *
   * @returns Nothing.
   * @throws Does not throw; interval creation is delegated to the runtime.
   */
  function startPolling(): void {
    if (paused || stopped || intervalHandle !== undefined) return;
    intervalHandle = setInterval(runCheck, config.intervalMs);
  }

  /**
   * @function pauseMonitor
   * @description Pauses checks and the awake guard while keeping the Electron process alive.
   *
   * @returns Nothing.
   * @throws Does not throw; lifecycle changes are handled by local monitor dependencies.
   */
  function pauseMonitor(): void {
    if (paused || stopped) return;
    paused = true;
    if (intervalHandle !== undefined) {
      clearInterval(intervalHandle);
      intervalHandle = undefined;
    }
    awakeGuard.stop();
    tray.setStatus('paused');
    log('monitor paused by user');
  }

  /**
   * @function resumeMonitor
   * @description Resumes monitor checks from the current process state.
   *
   * @returns Nothing.
   * @throws Does not throw; the first check handles asynchronous monitor failures.
   */
  function resumeMonitor(): void {
    if (!paused || stopped) return;
    paused = false;
    tray.setStatus('starting');
    log('monitor resumed by user');
    runCheck();
    startPolling();
  }

  /**
   * @function stopMonitor
   * @description Stops monitoring while keeping Electron and the tray available.
   *
   * @returns Nothing.
   * @throws Does not throw; Electron owns process shutdown.
   */
  function stopMonitor(): void {
    if (stopped) return;
    stopped = true;
    paused = false;
    if (intervalHandle !== undefined) {
      clearInterval(intervalHandle);
      intervalHandle = undefined;
    }
    awakeGuard.stop();
    tray.setStatus('stopped');
    log('monitor stopped by user');
  }

  /**
   * @function startMonitor
   * @description Starts monitoring again after a tray stop action.
   *
   * @returns Nothing.
   * @throws Does not throw; the first check handles asynchronous monitor failures.
   */
  function startMonitor(): void {
    if (!stopped) return;
    stopped = false;
    tray.setStatus('starting');
    log('monitor started by user');
    runCheck();
    startPolling();
  }

  runCheck();
  startPolling();

  app.once('before-quit', (): void => {
    if (intervalHandle !== undefined) clearInterval(intervalHandle);
    awakeGuard.stop();
    tray.destroy();
    removeRuntimeState(runtimeStateFile);
    notifier.stopped();
    log('stopping');
  });
});

app.on('window-all-closed', (): void => undefined);
