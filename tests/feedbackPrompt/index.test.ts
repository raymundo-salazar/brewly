import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  formatFeedbackNotice,
  getFeedbackContact,
  getFeedbackPrompt,
  getFeedbackReminder,
  getFeedbackReminderStatus,
  getFeedbackStatePath,
  recordFeedbackInteraction,
  updateFeedbackReminders,
} from '../../src/feedbackPrompt';

describe('feedbackPrompt', () => {
  const createStatePath = (): string =>
    path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'brewly-feedback-')), 'feedback-state.json');

  test('initializes without prompting and waits 30 days', () => {
    const filePath = createStatePath();
    const installedAt = new Date('2026-01-01T00:00:00.000Z');

    expect(
      getFeedbackPrompt({
        filePath,
        installationDate: installedAt.toISOString(),
        now: installedAt,
      }),
    ).toBeNull();
    expect(getFeedbackPrompt({ filePath, now: new Date('2026-01-07T23:59:59.999Z') })).toBeNull();
    expect(getFeedbackPrompt({ filePath, now: new Date('2026-01-08T00:00:00.000Z') })).toEqual({
      command: 'brewly feedback',
      detail: '',
      message: "Enjoying Brewly? Help make it better. Ideas, questions, or bugs — we're listening.",
    });
  });

  test('does not prompt when non-interactive and prompts again after another interval', () => {
    const filePath = createStatePath();
    const installedAt = new Date('2026-01-01T00:00:00.000Z');
    getFeedbackPrompt({ filePath, installationDate: installedAt.toISOString(), now: installedAt });

    expect(
      getFeedbackPrompt({
        filePath,
        interactive: false,
        now: new Date('2026-02-01T00:00:00.000Z'),
      }),
    ).toBeNull();
    expect(
      getFeedbackPrompt({ filePath, now: new Date('2026-02-01T00:00:00.001Z') }),
    ).not.toBeNull();
    expect(
      getFeedbackPrompt({ filePath, now: new Date('2026-03-01T00:00:00.000Z') }),
    ).not.toBeNull();
    expect(getFeedbackPrompt({ filePath, now: new Date('2026-03-03T00:00:00.001Z') })).toBeNull();
  });

  test('formats the feedback notice', () => {
    const prompt = {
      command: 'brewly feedback',
      detail: 'Found an issue? Run brewly feedback.',
      message: "Enjoying Brewly? Help make it better. Ideas, questions, or bugs — we're listening.",
    };

    const notice = formatFeedbackNotice(prompt);
    expect(notice).toContain('Brewly · Your Voice Matters');
    expect(notice).toContain(
      "Enjoying Brewly? Help make it better. Ideas, questions, or bugs — we're listening.",
    );
    expect(notice).toContain('Run this command: $ brewly feedback');
  });

  test('returns the official feedback contact', () => {
    const contact = getFeedbackContact();
    expect(contact).toEqual({
      command: 'brewly feedback',
      detail: 'Your feedback helps improve Brewly for everyone.',
      links: [
        { label: 'Email', url: 'mailto:brewly@raymundosalazar.dev' },
        { label: 'GitHub issues', url: 'https://github.com/raymundo-salazar/brewly/issues' },
        { label: 'GitHub repository', url: 'https://github.com/raymundo-salazar/brewly' },
        { label: 'GitHub Sponsors', url: 'https://github.com/sponsors/raymundo-salazar' },
      ],
      message: 'Share your experience, ideas, or issues with the Brewly project.',
    });
    expect(formatFeedbackNotice(contact)).toContain('Feedback channels');
    expect(formatFeedbackNotice(contact)).toContain('GitHub issues');
  });

  test('creates the compact recurring reminder', () => {
    expect(getFeedbackReminder()).toEqual({
      command: 'brewly feedback',
      detail: '',
      message: "Enjoying Brewly? Help make it better. Ideas, questions, or bugs — we're listening.",
    });
    expect(formatFeedbackNotice(getFeedbackReminder(true))).toContain(
      'Prefer not to see these reminders?',
    );
  });

  test('marks reminders after voluntary feedback and preserves the preference note', () => {
    const filePath = createStatePath();
    const installedAt = new Date('2026-01-01T00:00:00.000Z');
    getFeedbackPrompt({ filePath, installationDate: installedAt.toISOString(), now: installedAt });
    recordFeedbackInteraction(filePath);

    const prompt = getFeedbackPrompt({
      filePath,
      now: new Date('2027-01-01T00:00:00.000Z'),
    });
    expect(prompt?.afterInteraction).toBe(true);
    expect(formatFeedbackNotice(prompt!)).toContain('brewly feedback reminders disable');
  });

  test('keeps the current reminder window and reports an empty-state schedule', () => {
    const filePath = createStatePath();
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        firstSeenAt: '2025-01-01T00:00:00.000Z',
        lastShownAt: '2026-01-01T00:00:00.000Z',
        reminderCount: 0,
        windowStartedAt: '2026-01-31T23:00:00.000Z',
      }),
    );
    expect(
      getFeedbackPrompt({ filePath, now: new Date('2026-02-01T00:00:00.000Z') }),
    ).not.toBeNull();
    expect(getFeedbackReminderStatus(createStatePath()).nextEligible).toBeDefined();
  });

  test('resolves the default application-support state path', () => {
    expect(getFeedbackStatePath()).toContain(
      '/Library/Application Support/brewly/feedback-state.json',
    );
    expect(getFeedbackStatePath('/Users/example')).toBe(
      '/Users/example/Library/Application Support/brewly/feedback-state.json',
    );
  });

  test('ignores malformed and invalid persisted state', () => {
    const filePath = createStatePath();
    fs.writeFileSync(filePath, '{invalid');
    expect(getFeedbackPrompt({ filePath, now: new Date('2026-01-01T00:00:00.000Z') })).toBeNull();

    fs.writeFileSync(filePath, JSON.stringify({ firstSeenAt: 42 }));
    expect(getFeedbackPrompt({ filePath, now: new Date('2026-02-01T00:00:00.000Z') })).toBeNull();

    fs.writeFileSync(filePath, JSON.stringify({ firstSeenAt: 'not-a-date' }));
    expect(getFeedbackPrompt({ filePath, now: new Date('2026-02-01T00:00:00.000Z') })).toBeNull();

    fs.writeFileSync(
      filePath,
      JSON.stringify({ firstSeenAt: '2026-01-01T00:00:00.000Z', lastShownAt: 42 }),
    );
    expect(getFeedbackPrompt({ filePath, now: new Date('2026-02-01T00:00:00.000Z') })).toBeNull();

    fs.writeFileSync(
      filePath,
      JSON.stringify({ firstSeenAt: '2026-01-01T00:00:00.000Z', enabled: 'yes' }),
    );
    expect(getFeedbackPrompt({ filePath, now: new Date('2026-02-01T00:00:00.000Z') })).toBeNull();
  });

  test('uses a persisted last-shown timestamp when scheduling a reminder', () => {
    const filePath = createStatePath();
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        firstSeenAt: '2026-01-01T00:00:00.000Z',
        lastShownAt: '2026-02-01T00:00:00.000Z',
      }),
    );

    expect(
      getFeedbackPrompt({ filePath, now: new Date('2026-03-03T00:00:00.000Z') }),
    ).not.toBeNull();

    fs.writeFileSync(
      filePath,
      JSON.stringify({
        firstSeenAt: '2026-01-01T00:00:00.000Z',
        lastShownAt: '2026-02-01T00:00:00.000Z',
        reminderCount: 1,
        windowStartedAt: '2026-02-01T00:00:00.000Z',
      }),
    );
    expect(
      getFeedbackPrompt({ filePath, now: new Date('2026-02-16T00:00:00.000Z') }),
    ).not.toBeNull();

    fs.writeFileSync(
      filePath,
      JSON.stringify({
        firstSeenAt: '2026-01-01T00:00:00.000Z',
        lastShownAt: '2026-02-01T00:00:00.000Z',
        reminderCount: 3,
        windowStartedAt: '2026-02-01T00:00:00.000Z',
      }),
    );
    expect(
      getFeedbackPrompt({ filePath, now: new Date('2026-03-05T00:00:00.000Z') }),
    ).not.toBeNull();
  });

  test('supports reminder lifecycle state and status', () => {
    const filePath = createStatePath();
    expect(getFeedbackPrompt({ filePath })).toBeNull();
    expect(getFeedbackReminderStatus(filePath).enabled).toBe(true);
    updateFeedbackReminders('disable', filePath);
    expect(getFeedbackReminderStatus(filePath).enabled).toBe(false);
    expect(getFeedbackPrompt({ filePath, now: new Date('2027-01-01T00:00:00.000Z') })).toBeNull();
    updateFeedbackReminders('enable', filePath);
    expect(getFeedbackReminderStatus(filePath).enabled).toBe(true);
    recordFeedbackInteraction(filePath);
    expect(getFeedbackReminderStatus(filePath).lastReminder).toBeDefined();
    updateFeedbackReminders('reset', filePath);
    expect(getFeedbackReminderStatus(filePath).lastReminder).toBeUndefined();

    fs.writeFileSync(filePath, JSON.stringify({ firstSeenAt: '2026-01-01T00:00:00.000Z' }));
    expect(getFeedbackReminderStatus(filePath).nextEligible).toBe('2026-01-08T00:00:00.000Z');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        firstSeenAt: '2026-01-01T00:00:00.000Z',
        lastShownAt: '2026-02-01T00:00:00.000Z',
        reminderCount: 1,
      }),
    );
    expect(getFeedbackReminderStatus(filePath).nextEligible).toBe('2026-02-16T00:00:00.000Z');
  });
});
