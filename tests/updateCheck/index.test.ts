import { checkForUpdate, formatUpdateNotice } from '../../src/updateCheck';
import type { UpdateResponse } from '../../src/updateCheck';

const response = (value: unknown, ok = true): UpdateResponse => ({
  ok,
  json: () => Promise.resolve(value),
});

describe('updateCheck', () => {
  test('returns the latest version when it is newer', async () => {
    const update = await checkForUpdate('2.1.3', {
      fetcher: () => Promise.resolve(response({ version: '2.1.4' })),
    });

    expect(update).toEqual({
      command: 'npm install --global brewly@latest',
      currentVersion: '2.1.3',
      latestVersion: '2.1.4',
    });
  });

  test.each(['2.1.3', '2.1.4', 'invalid'])(
    'does not report a non-newer version: %s',
    async (currentVersion) => {
      const update = await checkForUpdate(currentVersion, {
        fetcher: () => Promise.resolve(response({ version: '2.1.3' })),
      });

      expect(update).toBeNull();
    },
  );

  test.each([response({ version: '9.9.9' }, false), response({}), response('2.1.4')])(
    'ignores unusable registry responses',
    async (registryResponse) => {
      await expect(
        checkForUpdate('2.1.3', { fetcher: () => Promise.resolve(registryResponse) }),
      ).resolves.toBeNull();
    },
  );

  test('ignores request failures', async () => {
    const update = await checkForUpdate('2.1.3', {
      fetcher: () => Promise.reject(new Error('network unavailable')),
    });

    expect(update).toBeNull();
  });

  test('formats the update instruction', () => {
    const notice = formatUpdateNotice({
      command: 'npm install --global brewly@latest',
      currentVersion: '2.1.3',
      latestVersion: '2.1.4',
    });

    expect(notice).toContain('╭────────────────────────────────────────────────────────────────╮');
    expect(notice).toContain('BREWLY');
    expect(notice).toContain('A fresh update is ready!');
    expect(notice).toContain('2.1.3  →  2.1.4');
    expect(notice).toContain('npm install --global brewly@latest');
    expect(notice).toContain('╰────────────────────────────────────────────────────────────────╯');
  });
});
