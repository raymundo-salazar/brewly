const path = require('node:path');
const { app, Notification, powerMonitor } = require('electron');
const { loadEnvFile } = require('./env');
const { loadConfig } = require('./config');
const { createAction } = require('./actions');
const { createLogger } = require('./logger');
const { createMonitor } = require('./monitor');
const { createNotifier } = require('./notifications');
const { createAwakeGuard } = require('./awake');
const { removeRuntimeState, writeRuntimeState } = require('./runtime-state');
const { recordConfigChanges } = require('./config-history');

const envFile = process.env.IDLE_ENV_FILE || path.join(__dirname, '..', '.env');
loadEnvFile(path.resolve(envFile));
const config = loadConfig();

app.whenReady().then(() => {
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

  const runtimeState = {
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
  const persistState = (result = {}) => writeRuntimeState(runtimeStateFile, {
    ...runtimeState,
    lastCheckAt: new Date().toISOString(),
    lastCheckStatus: result.status || 'starting',
    inSchedule: result.status !== 'outside-schedule',
  });

  notifier.started();
  log(`started; interval=${config.intervalMs}ms timezone=${config.timezone}`);
  recordConfigChanges(configHistoryFile, config, log);
  persistState();
  const runCheck = () => monitor.check()
    .then(persistState)
    .catch((error) => log(`check failed: ${error.stack || error.message}`));
  runCheck();
  setInterval(runCheck, config.intervalMs);

  app.once('before-quit', () => {
    awakeGuard.stop();
    removeRuntimeState(runtimeStateFile);
    notifier.stopped();
    log('stopping');
  });
});

app.on('window-all-closed', (event) => event.preventDefault());
