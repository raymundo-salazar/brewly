const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const projectDir = path.resolve(__dirname, '..');
const launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
const plistPath = path.join(launchAgentsDir, 'com.local.mac-idle-keeper.plist');
const nodePath = process.execPath;
const electronPath = path.join(projectDir, 'node_modules', 'electron', 'cli.js');

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.local.mac-idle-keeper</string>
  <key>ProgramArguments</key><array><string>${nodePath}</string><string>${electronPath}</string><string>${projectDir}</string></array>
  <key>WorkingDirectory</key><string>${projectDir}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Background</string>
</dict></plist>`;

fs.mkdirSync(launchAgentsDir, { recursive: true });
fs.writeFileSync(plistPath, `${plist}\n`);
try { execFileSync('/bin/launchctl', ['unload', plistPath], { stdio: 'ignore' }); } catch {}
execFileSync('/bin/launchctl', ['load', plistPath], { stdio: 'inherit' });
console.log(`Installed and loaded ${plistPath}`);
