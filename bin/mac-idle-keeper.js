#!/usr/bin/env node

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const packageRoot = path.resolve(__dirname, '..');
const electronPath = require('electron');

function printHelp() {
  console.log(`Mac Idle Keeper — macOS idle monitor

Usage:
  mac-idle-keeper start [--env-file PATH]
  mac-idle-keeper launch-agent <install|status|logs|stop|pause|resume|restart|uninstall> [--env-file PATH]
  mac-idle-keeper logs [--follow] [--lines N] [--env-file PATH]
  mac-idle-keeper help

Examples:
  mac-idle-keeper start
  mac-idle-keeper launch-agent install
  mac-idle-keeper launch-agent status
  mac-idle-keeper logs --follow
`);
}

function run(command, args, environment = process.env) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: environment });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

function parseEnvFile(args) {
  const remaining = [];
  const environment = { ...process.env };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--env-file') {
      const value = args[++index];
      if (!value) throw new Error('--env-file requires a path.');
      environment.IDLE_ENV_FILE = path.resolve(process.cwd(), value);
    } else if (arg.startsWith('--env-file=')) {
      environment.IDLE_ENV_FILE = path.resolve(process.cwd(), arg.slice('--env-file='.length));
    } else {
      remaining.push(arg);
    }
  }

  return { environment, remaining };
}

function main(args) {
  const { environment, remaining } = parseEnvFile(args);
  const [command = 'start', ...commandArgs] = remaining;
  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'start') {
    run(electronPath, [packageRoot, ...commandArgs], environment);
    return;
  }

  if (command === 'logs') {
    run(process.execPath, [path.join(packageRoot, 'scripts', 'view-logs.js'), ...commandArgs], environment);
    return;
  }

  if (command === 'launch-agent') {
    const [action, ...actionArgs] = commandArgs;
    if (!action) throw new Error('launch-agent requires an action. Run mac-idle-keeper help for usage.');
    if (action === 'logs') {
      run(process.execPath, [path.join(packageRoot, 'scripts', 'view-logs.js'), ...actionArgs], environment);
      return;
    }
    run(process.execPath, [path.join(packageRoot, 'scripts', 'manage-launch-agent.js'), action, ...actionArgs], environment);
    return;
  }

  throw new Error(`Unknown command: ${command}. Run mac-idle-keeper help for usage.`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
