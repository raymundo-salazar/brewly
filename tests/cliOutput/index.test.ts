import { error, header, info, paint, success, warning } from '../../src/cliOutput';

describe('CliOutput', () => {
  test('prints human-readable output helpers', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(paint('message', 'cyan')).toContain('message');
    header('Header');
    info('Label', 'value');
    success('ok');
    warning('warning');
    error('error');
    expect(log).toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalled();
    log.mockRestore();
    errorLog.mockRestore();
  });

  test('paints with ANSI colors when attached to a TTY', async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: true });
    jest.resetModules();
    await jest.isolateModulesAsync(async () => {
      const { paint } = await import('../../src/cliOutput');
      expect(paint('message', 'green')).toContain('\u001b[');
    });
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: originalIsTTY });
    jest.resetModules();
  });
});
