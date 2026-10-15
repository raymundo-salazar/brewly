import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadEnvFile } from '../../src/env';

describe('Env', () => {
  test('loads values, strips comments, and preserves existing environment values', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'brewly-env-'));
    const filePath = path.join(directory, '.env');
    fs.writeFileSync(
      filePath,
      `# comment\nexport NEW_VALUE="hello"\nSINGLE='quoted'\nTRIMMED=value # comment\nEXISTING=file\nINVALID LINE\nEMPTY=\n`,
    );
    const environment: Record<string, string | undefined> = { EXISTING: 'original' };

    loadEnvFile(filePath, environment);

    expect(environment).toMatchObject({
      NEW_VALUE: 'hello',
      SINGLE: 'quoted',
      TRIMMED: 'value',
      EXISTING: 'original',
      EMPTY: '',
    });
  });

  test('does nothing when the environment file does not exist', () => {
    const environment: Record<string, string | undefined> = {};
    loadEnvFile('/tmp/brewly-missing.env', environment);
    expect(environment).toEqual({});
  });

  test('can use the process environment as the default target', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'brewly-env-'));
    const filePath = path.join(directory, '.env');
    fs.writeFileSync(filePath, 'BREWLY_TEST_VALUE=enabled\n');
    delete process.env.BREWLY_TEST_VALUE;
    loadEnvFile(filePath);
    expect(process.env.BREWLY_TEST_VALUE).toBe('enabled');
    delete process.env.BREWLY_TEST_VALUE;
  });
});
