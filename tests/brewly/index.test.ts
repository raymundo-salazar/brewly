import path from 'node:path';
import { execFileSync } from 'node:child_process';

describe('Brewly CLI', () => {
  test('prints help without starting Electron', () => {
    const cli = path.join(__dirname, '..', '..', 'bin', 'brewly', 'index.ts');
    const output = execFileSync(process.execPath, ['-r', 'ts-node/register', cli, 'help'], {
      encoding: 'utf8',
    });
    expect(output).toMatch(/brewly start/);
    expect(output).toMatch(/agent/);
    expect(output).toMatch(/power/);
    expect(output).toMatch(/migrate/);
    expect(output).toMatch(/launch-agent/);
    expect(output).toMatch(/start \| stop \| pause \| resume/);
    expect(output).toMatch(/--env-file PATH/);
  });

  test('prints dedicated LaunchAgent help with the nested help flag', () => {
    const manageScript = path.join(
      __dirname,
      '..',
      '..',
      'scripts',
      'manageLaunchAgent',
      'index.ts',
    );
    const output = execFileSync(
      process.execPath,
      ['-r', 'ts-node/register', manageScript, '--help'],
      { encoding: 'utf8' },
    );

    expect(output).toMatch(/Brewly — LaunchAgent help/);
    expect(output).toMatch(/install: Create and load/);
    expect(output).toMatch(/start: Start a stopped service/);
    expect(output).toMatch(/--help, -h/);
  });
});
