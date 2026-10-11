import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getAgentConfigPath, readAgentConfig, writeAgentConfig } from '../../src/agentConfig';
import type { Config } from '../../src/config/types';

const config: Config = {
  intervalMs: 300000,
  idleThresholdSeconds: 540,
  startTime: '07:00',
  endTime: '17:00',
  startMinutes: 420,
  endMinutes: 1020,
  days: [1, 3, 4, 5],
  timezone: 'America/Monterrey',
  logFile: null,
  action: 'hid-event',
  powerOnOffsetMinutes: 5,
};

describe('agentConfig', () => {
  test('resolves, writes, and reads the persistent agent snapshot', () => {
    const homeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mac-idle-keeper-config-'));
    const filePath = getAgentConfigPath(homeDirectory);

    writeAgentConfig(filePath, config, 5, '/Users/example/.env');

    expect(readAgentConfig(filePath)).toMatchObject({
      version: 1,
      source: '/Users/example/.env',
      powerOnOffsetMinutes: 5,
      config,
    });
  });

  test('treats missing, malformed, and invalid snapshots as unavailable', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mac-idle-keeper-config-'));
    const filePath = path.join(directory, 'agent-config.json');

    expect(readAgentConfig(filePath)).toBeNull();
    fs.writeFileSync(filePath, '{not valid json');
    expect(readAgentConfig(filePath)).toBeNull();
    fs.writeFileSync(filePath, JSON.stringify({ version: 2 }));
    expect(readAgentConfig(filePath)).toBeNull();
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        version: 1,
        createdAt: new Date().toISOString(),
        source: '/tmp/.env',
        powerOnOffsetMinutes: 'five',
        config,
      }),
    );
    expect(readAgentConfig(filePath)).toBeNull();
  });
});
