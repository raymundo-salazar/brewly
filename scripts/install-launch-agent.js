const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { error, header, info, success } = require('../src/cli-output');

process.on('uncaughtException', (cause) => {
  error(cause.message);
  process.exitCode = 1;
});

const projectDir = path.resolve(__dirname, '..');
const workingDirectory = path.resolve(process.cwd());
const launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
const plistPath = path.join(launchAgentsDir, 'com.local.mac-idle-keeper.plist');
const electronPath = path.join(projectDir, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron');
const logDir = path.join(os.homedir(), 'Library', 'Logs', 'mac-idle-keeper');
const service = `gui/${process.getuid()}/com.local.mac-idle-keeper`;
const escapeXml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const environmentVariables = process.env.IDLE_ENV_FILE
  ? `\n  <key>EnvironmentVariables</key><dict><key>IDLE_ENV_FILE</key><string>${escapeXml(path.resolve(process.cwd(), process.env.IDLE_ENV_FILE))}</string></dict>`
  : '';

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.local.mac-idle-keeper</string>
  <key>ProgramArguments</key><array><string>${escapeXml(electronPath)}</string><string>${escapeXml(projectDir)}</string></array>
  <key>WorkingDirectory</key><string>${escapeXml(workingDirectory)}</string>
  <key>StandardOutPath</key><string>${escapeXml(path.join(logDir, 'launch-agent.stdout.log'))}</string>
  <key>StandardErrorPath</key><string>${escapeXml(path.join(logDir, 'launch-agent.stderr.log'))}</string>
  ${environmentVariables}
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Background</string>
</dict></plist>`;

fs.mkdirSync(launchAgentsDir, { recursive: true });
fs.mkdirSync(logDir, { recursive: true });
fs.writeFileSync(plistPath, `${plist}\n`);
try { execFileSync('/bin/launchctl', ['unload', plistPath], { stdio: 'ignore' }); } catch {}
execFileSync('/bin/launchctl', ['load', plistPath], { stdio: 'inherit' });
try {
  execFileSync('/bin/launchctl', ['print', service], { stdio: 'ignore' });
} catch {
  throw new Error(`LaunchAgent was not loaded. Check ${path.join(logDir, 'launch-agent.stderr.log')}.`);
}
header('Mac Idle Keeper — LaunchAgent installed');
success('Service loaded and ready to run at login.');
info('Plist', plistPath);
info('Project', projectDir);
info('Configuration directory', workingDirectory);
