import { main } from '../../scripts/packLocal';

describe('packLocal', () => {
  test('prints local installation commands for the generated tarball', () => {
    const output: string[] = [];
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...messages: unknown[]) => {
      output.push(
        messages
          .map((message) =>
            typeof message === 'string' ? message : (JSON.stringify(message) ?? ''),
          )
          .join(' '),
      );
    });

    main();

    expect(output.join('\n')).toMatch(/brewly-\d+\.\d+\.\d+\.tgz/);
    expect(output.join('\n')).toMatch(/npm install --global \.\/brewly-\d+\.\d+\.\d+\.tgz/);
    expect(output.join('\n')).toContain('brewly help');
    expect(output.join('\n')).toContain('brewly agent status');
    logSpy.mockRestore();
  });
});
