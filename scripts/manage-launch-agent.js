const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadEnvFile } = require('../src/env');
const { loadConfig } = require('../src/config');
const { isWithinSchedule, localDateInTimeZone } = require('../src/schedule');

const label = 'com.local.mac-idle-keeper';
const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${label}.plist`);
const domain = `gui/${process.getuid()}`;
const service = `${domain}/${label}`;
const command = process.argv[2];
const useColors = Boolean(process.stdout.isTTY);
const color = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m',
};

function paint(value, tone) {
  return useColors ? `${color[tone]}${value}${color.reset}` : value;
}

function launchctl(args, allowFailure = false) {
  try {
    execFileSync('/bin/launchctl', args, { stdio: 'inherit' });
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

function bootstrap() {
  requirePlist();
  launchctl(['bootstrap', domain, plistPath]);
}

function status() {
  const exists = fs.existsSync(plistPath);
  const environment = {};
  loadEnvFile(path.join(__dirname, '..', '.env'), environment);
  const config = loadConfig(environment);
  const logPath = config.logFile
    ? path.resolve(config.logFile)
    : path.join(os.homedir(), 'Library', 'Application Support', 'mac-idle-keeper', 'mac-idle-keeper.log');
  const localNow = localDateInTimeZone(new Date(), config.timezone);
  const insideSchedule = isWithinSchedule(localNow, config);
  const formatTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const schedule = `${config.startTime}-${config.endTime} (${config.days.join(',')})`;

  console.log('\nPrevent Discord Idle — LaunchAgent Status');
  console.log('────────────────────────────────────────');
  console.log(`Installed: ${exists ? paint('YES', 'green') : paint('NO', 'red')}`);
  console.log(`Plist: ${plistPath}`);
  console.log(`Schedule: ${insideSchedule ? paint('IN SCHEDULE', 'green') : paint('OUTSIDE SCHEDULE', 'yellow')} (${schedule})`);
  console.log(`Current time: ${formatTime(localNow.getUTCHours() * 60 + localNow.getUTCMinutes())} ${config.timezone}`);

  let running = false;
  try {
    const output = execFileSync('/bin/launchctl', ['print', service], { encoding: 'utf8' });
    const field = (name) => output.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, 'm'))?.[1]?.trim() || '—';
    const state = field('state');
    running = state === 'running';

    console.log(`Enabled: ${paint('YES', 'green')}`);
    console.log(`Process: ${running ? paint('RUNNING', 'green') : paint(state, 'yellow')}`);
    console.log(`PID: ${field('pid')}`);
    console.log(`Runs: ${field('runs')}`);
    console.log(`Last exit code: ${field('last exit code')}`);
  } catch {
    let paused = false;
    try {
      const disabled = execFileSync('/bin/launchctl', ['print-disabled', domain], { encoding: 'utf8' });
      paused = new RegExp(`['\"]?${label}['\"]?\\s*=>\\s*true`).test(disabled);
    } catch {}
    console.log(`Enabled: ${paused ? paint('NO (PAUSED)', 'yellow') : paint('YES', 'green')}`);
    console.log(`Process: ${paused ? paint('PAUSED', 'yellow') : paint('STOPPED', 'red')}`);
  }

  console.log(`Log: ${logPath}`);
  console.log('\nLast 5 activity actions:');
  try {
    const actions = fs.readFileSync(logPath, 'utf8').split(/\r?\n/)
      .filter((line) => line.includes('activity action executed'))
      .slice(-5);
    if (actions.length === 0) console.log(paint('  No activity actions recorded.', 'gray'));
    else actions.forEach((line) => console.log(`  ${line}`));
  } catch {
    console.log(paint('  Log file not found yet.', 'gray'));
  }
  console.log('');
}

switch (command) {
  case 'status':
    status();
    break;
  case 'stop':
    bootout();
    console.log(`Stopped ${label}; plist preserved.`);
    break;
  case 'pause':
    bootout();
    launchctl(['disable', service]);
    console.log(`Paused ${label}; use resume to enable it again.`);
    break;
  case 'resume':
    requirePlist();
    launchctl(['enable', service], true);
    bootstrap();
    console.log(`Resumed ${label}.`);
    break;
  case 'restart':
    bootout();
    launchctl(['enable', service], true);
    bootstrap();
    console.log(`Restarted ${label}.`);
    break;
  case 'uninstall':
    bootout();
    launchctl(['enable', service], true);
    if (fs.existsSync(plistPath)) fs.unlinkSync(plistPath);
    console.log(`Uninstalled ${label} and removed ${plistPath}.`);
    break;
  default:
    console.error('Usage: node scripts/manage-launch-agent.js <status|stop|pause|resume|restart|uninstall>');
    process.exitCode = 1;
}
