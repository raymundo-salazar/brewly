const path = require('node:path');
const { app, Notification, powerMonitor } = require('electron');
const { loadEnvFile } = require('./env');
const { loadConfig } = require('./config');
const { createAction } = require('./actions');
const { createLogger } = require('./logger');
const { createMonitor } = require('./monitor');
const { createNotifier } = require('./notifications');
const { createAwakeGuard } = require('./awake');

const envFile = process.env.IDLE_ENV_FILE || path.join(__dirname, '..', '.env');
loadEnvFile(path.resolve(envFile));
const config = loadConfig();

app.whenReady().then(() => {
  if (!config.logFile) config.logFile = path.join(app.getPath('userData'), 'mac-idle-keeper.log');
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  const log = createLogger(config.logFile);
  const notifier = createNotifier(Notification, log);
  const awakeGuard = createAwakeGuard({ log });
  const monitor = createMonitor({
    powerMonitor,
    action: createAction(config.action),
    awakeGuard,
    config,
    log,
  });

  notifier.started();
  log(`started; interval=${config.intervalMs}ms timezone=${config.timezone}`);
  monitor.check().catch((error) => log(`check failed: ${error.stack || error.message}`));
  setInterval(() => monitor.check().catch((error) => log(`check failed: ${error.stack || error.message}`)), config.intervalMs);

  app.once('before-quit', () => {
    awakeGuard.stop();
    notifier.stopped();
    log('stopping');
  });
});

app.on('window-all-closed', (event) => event.preventDefault());
