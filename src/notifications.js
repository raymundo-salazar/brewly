const TITLE = 'Mac Idle Keeper';
const { execFile } = require('node:child_process');

function createNotifier(NotificationApi, log = () => {}, options = {}) {
  const platform = options.platform || process.platform;
  const runCommand = options.execFile || execFile;
  const supported = !NotificationApi.isSupported || NotificationApi.isSupported();

  function show(body) {
    if (platform === 'darwin') {
      runCommand('/usr/bin/osascript', [
        '-e',
        `display notification ${JSON.stringify(body)} with title ${JSON.stringify(TITLE)}`,
      ], (error) => {
        if (error) log(`macOS notification failed: ${error.message}`);
      });
      return;
    }

    if (!supported) {
      log('desktop notifications are not supported');
      return;
    }
    new NotificationApi({ title: TITLE, body }).show();
  }

  return {
    started: () => show('El monitor de idle se ha iniciado.'),
    stopped: () => show('El monitor de idle se ha detenido.'),
  };
}

module.exports = { TITLE, createNotifier };
