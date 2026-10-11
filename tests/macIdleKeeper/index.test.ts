import path from 'node:path';
import { execFileSync } from 'node:child_process';

describe('MacIdleKeeper CLI', () => {
  test('prints help without starting Electron', () => {
    const cli = path.join(__dirname, '..', '..', 'bin', 'macIdleKeeper', 'index.ts');
    const output = execFileSync(process.execPath, ['-r', 'ts-node/register', cli, 'help'], {
      encoding: 'utf8',
    });
    expect(output).toMatch(/mac-idle-keeper start/);
    expect(output).toMatch(/launch-agent/);
    expect(output).toMatch(/--env-file PATH/);
  });
});
