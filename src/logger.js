const fs = require('node:fs');
const { paint } = require('./cli-output');

function toneFor(message) {
  if (message.includes('failed')) return 'red';
  if (message.includes('threshold exceeded')) return 'yellow';
  if (message.includes('outside schedule')) return 'gray';
  if (message.includes('started') || message.includes('stopping') || message.includes('executed')) return 'green';
  return 'cyan';
}

function createLogger(logFile, output = console) {
  return (message) => {
    const line = `${new Date().toISOString()} | ${message}`;
    output.log(paint(line, toneFor(message)));
    if (logFile) fs.appendFileSync(logFile, `${line}\n`);
  };
}

module.exports = { createLogger };
