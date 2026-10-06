const fs = require('node:fs');

function createLogger(logFile, output = console) {
  return (message) => {
    const line = `${new Date().toISOString()} | ${message}`;
    output.log(line);
    if (logFile) fs.appendFileSync(logFile, `${line}\n`);
  };
}

module.exports = { createLogger };
