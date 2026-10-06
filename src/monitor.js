const { isWithinSchedule, localDateInTimeZone } = require('./schedule');

function createMonitor({ powerMonitor, action, awakeGuard, config, log, clock = () => new Date() }) {
  async function check() {
    const now = clock();
    const localNow = localDateInTimeZone(now, config.timezone);
    const inSchedule = isWithinSchedule(localNow, config);
    awakeGuard?.setActive(inSchedule);
    if (!inSchedule) {
      log('outside schedule; no action');
      return { status: 'outside-schedule' };
    }

    const idleSeconds = powerMonitor.getSystemIdleTime();
    log(`idle=${idleSeconds}s threshold=${config.idleThresholdSeconds}s`);
    if (idleSeconds > config.idleThresholdSeconds) {
      if (config.action === 'none') {
        log('idle threshold exceeded; activity action is disabled (IDLE_ACTION=none)');
        return { status: 'action-disabled', idleSeconds };
      }
      await action();
      const idleAfter = powerMonitor.getSystemIdleTime();
      log(`idle threshold exceeded; activity action executed (${config.action}); idleAfter=${idleAfter}s`);
      return { status: 'action-executed', idleSeconds, idleAfter };
    }
    return { status: 'below-threshold', idleSeconds };
  }

  return { check };
}

module.exports = { createMonitor };
