const fs = require('node:fs');
const { paint } = require('./cli-output');
const { formatStoredLogLine } = require('./time');

function toneFor(message) {
  if (message.includes('failed')) return 'red';
  if (message.includes('threshold exceeded')) return 'yellow';
  if (message.includes('outside schedule')) return 'gray';
  if (message.includes('started') || message.includes('stopping') || message.includes('executed')) return 'green';
  return 'cyan';
}

function createLogger(logFile, output = console, options = {}) {
  const timeZone = options.timezone || 'America/Monterrey';

  return (message) => {
    const storedLine = `${new Date().toISOString()} | ${message}`;
    output.log(paint(formatStoredLogLine(storedLine, timeZone), toneFor(message)));
    if (logFile) fs.appendFileSync(logFile, `${storedLine}\n`);
  };
}

module.exports = { createLogger };
