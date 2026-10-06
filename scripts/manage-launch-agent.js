const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadEnvFile } = require('../src/env');
const { loadConfig } = require('../src/config');
const { isWithinSchedule, localDateInTimeZone } = require('../src/schedule');
const { readRuntimeState } = require('../src/runtime-state');
const { error, header, info, paint, success, warning } = require('../src/cli-output');

process.on('uncaughtException', (cause) => {
  error(cause.message);
  process.exitCode = 1;
});

const label = 'com.local.mac-idle-keeper';
const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${label}.plist`);
const domain = `gui/${process.getuid()}`;
const service = `${domain}/${label}`;
const command = process.argv[2];

function launchctl(args, allowFailure = false) {
  try {
    execFileSync('/bin/launchctl', args, { stdio: allowFailure ? 'ignore' : 'inherit' });
  } catch (error) {
    if (!allowFailure) throw error;
  }
}

function requirePlist() {
  if (!fs.existsSync(plistPath)) {
    throw new Error(`LaunchAgent plist not found: ${plistPath}. Run pnpm run launch-agent:install first.`);
  }
}

function bootout() {
  launchctl(['bootout', service], true);
}

function loadService() {
  requirePlist();
  launchctl(['load', '-w', plistPath]);
  try {
    execFileSync('/bin/launchctl', ['print', service], { stdio: 'ignore' });
  } catch {
    throw new Error(`LaunchAgent was not loaded. Check ${path.join(__dirname, '..', 'logs', 'launch-agent.stderr.log')}.`);
  }
}

function status() {
  const exists = fs.existsSync(plistPath);
  const runtimeStatePath = path.join(os.homedir(), 'Library', 'Application Support', 'mac-idle-keeper', 'runtime-state.json');
  const runtimeState = readRuntimeState(runtimeStatePath);
  const environment = {};
  loadEnvFile(path.join(__dirname, '..', '.env'), environment);
  const fallbackConfig = loadConfig(environment);
  const config = runtimeState?.config || fallbackConfig;
  const logPath = config.logFile
    ? path.resolve(config.logFile)
    : path.join(os.homedir(), 'Library', 'Application Support', 'mac-idle-keeper', 'mac-idle-keeper.log');
  const localNow = localDateInTimeZone(new Date(), config.timezone);
  const insideSchedule = runtimeState ? runtimeState.inSchedule : isWithinSchedule(localNow, config);
  const formatTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const schedule = `${config.startTime}-${config.endTime} (${config.days.map((day) => dayNames[day]).join(', ')})`;

  header('Prevent Discord Idle — LaunchAgent Status');
  console.log(`Installed: ${exists ? paint('YES', 'green') : paint('NO', 'red')}`);
  info('Plist', plistPath);
  info('Runtime schedule', `${insideSchedule ? paint('IN SCHEDULE', 'green') : paint('OUTSIDE SCHEDULE', 'yellow')} (${schedule})`);
  info('Current time', `${formatTime(localNow.getUTCHours() * 60 + localNow.getUTCMinutes())} ${config.timezone}`);
  info('Runtime state', runtimeState ? paint('AVAILABLE', 'green') : paint('NOT AVAILABLE', 'yellow'));

  let running = false;
  try {
    const output = execFileSync('/bin/launchctl', ['print', service], { encoding: 'utf8' });
    const field = (name) => output.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, 'm'))?.[1]?.trim() || '—';
    const state = field('state');
    running = state === 'running';

    info('Enabled', paint('YES', 'green'));
    info('Process', running ? paint('RUNNING', 'green') : paint(state, 'yellow'));
    info('PID', field('pid'));
    info('Runs', field('runs'));
    info('Last exit code', field('last exit code'));
  } catch {
    let paused = false;
    try {
      const disabled = execFileSync('/bin/launchctl', ['print-disabled', domain], { encoding: 'utf8' });
      paused = new RegExp(`['\"]?${label}['\"]?\\s*=>\\s*true`).test(disabled);
    } catch {}
    info('Enabled', paused ? paint('NO (PAUSED)', 'yellow') : paint('YES', 'green'));
    info('Process', paused ? paint('PAUSED', 'yellow') : paint('STOPPED', 'red'));
  }

  if (runtimeState) {
    info('Runtime PID', runtimeState.pid);
    info('Last check', `${runtimeState.lastCheckAt || '—'} (${runtimeState.lastCheckStatus || '—'})`);
  }
  info('Log', logPath);
  console.log(`\n${paint('Last 5 activity actions:', 'cyan')}`);
  try {
    const actions = fs.readFileSync(logPath, 'utf8').split(/\r?\n/)
      .filter((line) => line.includes('activity action executed'))
      .slice(-5);
    if (actions.length === 0) warning('No activity actions recorded.');
    else actions.forEach((line) => console.log(`  ${line}`));
  } catch {
    warning('Log file not found yet.');
  }
  console.log('');
}

switch (command) {
  case 'status':
    status();
    break;
  case 'stop':
    bootout();
    success(`Stopped ${label}; plist preserved.`);
    break;
  case 'pause':
    bootout();
    launchctl(['disable', service]);
    success(`Paused ${label}; use resume to enable it again.`);
    break;
  case 'resume':
    launchctl(['enable', service], true);
    loadService();
    success(`Resumed ${label}.`);
    break;
  case 'restart':
    execFileSync(process.execPath, [path.join(__dirname, 'install-launch-agent.js')], { stdio: 'inherit' });
    success(`Restarted ${label}.`);
    break;
  case 'uninstall':
    bootout();
    launchctl(['enable', service], true);
    if (fs.existsSync(plistPath)) fs.unlinkSync(plistPath);
    success(`Uninstalled ${label} and removed ${plistPath}.`);
    break;
  default:
    error('Usage: node scripts/manage-launch-agent.js <status|stop|pause|resume|restart|uninstall>');
    process.exitCode = 1;
}
