const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadEnvFile } = require('../src/env');
const { loadConfig } = require('../src/config');
const { readRuntimeState } = require('../src/runtime-state');
const { formatStoredLogLine } = require('../src/time');
const { error: printError, header, info, paint } = require('../src/cli-output');

const projectDir = path.resolve(__dirname, '..');
const runtimeStatePath = path.join(os.homedir(), 'Library', 'Application Support', 'mac-idle-keeper', 'runtime-state.json');
const defaultLogPath = path.join(os.homedir(), 'Library', 'Application Support', 'mac-idle-keeper', 'mac-idle-keeper.log');

function parseArgs(args) {
  const options = { follow: false, lines: 50 };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--follow' || arg === '-f') options.follow = true;
    else if (arg === '--lines' || arg === '-n') options.lines = Number(args[++index]);
    else if (arg.startsWith('--lines=')) options.lines = Number(arg.slice('--lines='.length));
  }
  if (!Number.isInteger(options.lines) || options.lines < 1) throw new Error('--lines must be a positive integer.');
  return options;
}

function resolveLogContext() {
  const runtimeState = readRuntimeState(runtimeStatePath);
  if (runtimeState?.config) {
    return {
      filePath: runtimeState.config.logFile
        ? path.resolve(runtimeState.config.logFile)
        : defaultLogPath,
      timezone: runtimeState.config.timezone,
    };
  }

  const environment = {};
  loadEnvFile(path.join(projectDir, '.env'), environment);
  const config = loadConfig(environment);
  return {
    filePath: config.logFile ? path.resolve(config.logFile) : defaultLogPath,
    timezone: config.timezone,
  };
}

function resolveLogPath() {
  return resolveLogContext().filePath;
}

function readLastLines(filePath, lines) {
  const content = fs.readFileSync(filePath, 'utf8');
  const entries = content.split(/\r?\n/);
  if (entries.at(-1) === '') entries.pop();
  return entries.slice(-lines);
}

function followFile(filePath, initialOffset, timeZone) {
  let offset = initialOffset;
  let pending = '';
  fs.watchFile(filePath, { interval: 500 }, (current) => {
    if (current.size < offset) {
      offset = 0;
      pending = '';
    }
    if (current.size === offset) return;

    const stream = fs.createReadStream(filePath, { start: offset, end: current.size - 1, encoding: 'utf8' });
    let output = '';
    stream.on('data', (chunk) => { output += chunk; });
    stream.on('end', () => {
      const lines = `${pending}${output}`.split(/\r?\n/);
      pending = lines.pop();
      process.stdout.write(lines.map((line) => `${formatStoredLogLine(line, timeZone)}\n`).join(''));
      offset = current.size;
    });
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const context = resolveLogContext();
  const filePath = context.filePath;
  if (!fs.existsSync(filePath)) {
    throw new Error(`Log file not found: ${filePath}`);
  }

  header('Prevent Discord Idle — Application log');
  info('Log', filePath);
  info('Display timezone', context.timezone);
  info('Lines', options.lines);
  for (const line of readLastLines(filePath, options.lines)) console.log(formatStoredLogLine(line, context.timezone));
  if (options.follow) {
    console.log(`\n${paint('Following log. Press Ctrl+C to stop.', 'cyan')}`);
    followFile(filePath, fs.statSync(filePath).size, context.timezone);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    printError(`Unable to read log: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { formatStoredLogLine, parseArgs, readLastLines, resolveLogContext, resolveLogPath };
