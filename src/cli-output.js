const useColors = Boolean(process.stdout.isTTY);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function paint(value, tone) {
  return useColors ? `${colors[tone]}${value}${colors.reset}` : value;
}

function header(title) {
  console.log(`\n${paint(title, 'cyan')}`);
  console.log(paint('─'.repeat(title.length), 'gray'));
}

function info(label, value) {
  console.log(`${paint(`${label}:`, 'gray')} ${value}`);
}

function success(message) {
  console.log(`${paint('✔', 'green')} ${message}`);
}

function warning(message) {
  console.log(`${paint('⚠', 'yellow')} ${message}`);
}

function error(message) {
  console.error(`${paint('✖', 'red')} ${message}`);
}

module.exports = { error, header, info, paint, success, warning };
