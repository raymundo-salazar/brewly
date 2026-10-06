const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadEnvFile } = require('../src/env');
const { loadConfig } = require('../src/config');
const { readRuntimeState } = require('../src/runtime-state');

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

function resolveLogPath() {
  const runtimeState = readRuntimeState(runtimeStatePath);
  if (runtimeState?.config?.logFile) return path.resolve(runtimeState.config.logFile);

  const environment = {};
  loadEnvFile(path.join(projectDir, '.env'), environment);
  const config = loadConfig(environment);
  return config.logFile ? path.resolve(config.logFile) : defaultLogPath;
}

function readLastLines(filePath, lines) {
  const content = fs.readFileSync(filePath, 'utf8');
  const entries = content.split(/\r?\n/);
  if (entries.at(-1) === '') entries.pop();
  return entries.slice(-lines);
}

function followFile(filePath, initialOffset) {
  let offset = initialOffset;
  fs.watchFile(filePath, { interval: 500 }, (current) => {
    if (current.size < offset) offset = 0;
    if (current.size === offset) return;

    const stream = fs.createReadStream(filePath, { start: offset, end: current.size - 1, encoding: 'utf8' });
    let output = '';
    stream.on('data', (chunk) => { output += chunk; });
    stream.on('end', () => {
      process.stdout.write(output);
      offset = current.size;
    });
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const filePath = resolveLogPath();
  if (!fs.existsSync(filePath)) {
    throw new Error(`Log file not found: ${filePath}`);
  }

  console.log(`Log: ${filePath}`);
  for (const line of readLastLines(filePath, options.lines)) console.log(line);
  if (options.follow) {
    console.log('\nFollowing log. Press Ctrl+C to stop.');
    followFile(filePath, fs.statSync(filePath).size);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Unable to read log: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { parseArgs, readLastLines, resolveLogPath };
