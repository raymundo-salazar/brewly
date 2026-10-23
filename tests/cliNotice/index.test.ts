import { formatNotice } from '../../src/cliNotice';

describe('cliNotice', () => {
  test('renders update details with the shared notice layout', () => {
    const notice = formatNotice({
      command: 'npm install --global brewly@latest',
      currentVersion: '2.1.3',
      latestVersion: '2.1.4',
      message: 'A fresh update is ready!',
    });

    expect(notice).toContain('BREWLY');
    expect(notice).toContain('2.1.3  →  2.1.4');
    expect(notice).toContain('npm install --global brewly@latest');
  });

  test('renders neutral detail content for feedback', () => {
    const notice = formatNotice({
      command: 'brewly@raymundosalazar.dev',
      detail: 'Your feedback helps improve Brewly for everyone.',
      message: 'Share your experience, ideas, or issues with the Brewly project.',
    });

    expect(notice).toContain('Your feedback helps improve Brewly for everyone.');
    expect(notice).toContain('brewly@raymundosalazar.dev');
  });
});
