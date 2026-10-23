import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { formatNotice } from '../cliNotice';
import { paint } from '../cliOutput';
import {
  FEEDBACK_COMMAND,
  FEEDBACK_FIRST_REMINDER_DAYS,
  FEEDBACK_INTERVAL_MS,
  FEEDBACK_LINKS,
  FEEDBACK_MAX_PER_WINDOW,
  FEEDBACK_MIN_INTERVAL_HOURS,
  FEEDBACK_REMINDER_MESSAGE,
  FEEDBACK_SECOND_REMINDER_DAYS,
  FEEDBACK_REMINDER_TITLE,
  FEEDBACK_STATE_FILE,
} from './constants';
import type {
  FeedbackPrompt,
  FeedbackPromptOptions,
  FeedbackReminderStatus,
  FeedbackState,
} from './types';

/**
 * @function getFeedbackStatePath
 * @description Resolves the managed feedback reminder state path.
 *
 * @param homeDirectory - User home directory used to build the application-support path.
 * @returns The absolute feedback state path.
 * @throws Does not throw for a valid home directory path.
 */
export function getFeedbackStatePath(homeDirectory: string = os.homedir()): string {
  return path.join(homeDirectory, 'Library', 'Application Support', 'brewly', FEEDBACK_STATE_FILE);
}

/**
 * @function readFeedbackState
 * @description Reads feedback reminder state while treating missing or malformed data as absent.
 *
 * @param filePath - State file to read.
 * @returns The stored state, or null when unavailable.
 * @throws Does not throw for filesystem or JSON errors.
 */
function readFeedbackState(filePath: string): FeedbackState | null {
  try {
    const state = JSON.parse(fs.readFileSync(filePath, 'utf8')) as FeedbackState;
    if (typeof state.firstSeenAt !== 'string') return null;
    if (state.lastShownAt !== undefined && typeof state.lastShownAt !== 'string') return null;
    if (state.enabled !== undefined && typeof state.enabled !== 'boolean') return null;
    return state;
  } catch {
    return null;
  }
}

/**
 * @function writeFeedbackState
 * @description Persists feedback reminder timestamps in the managed application-support directory.
 *
 * @param filePath - State file destination.
 * @param state - State to serialize.
 * @returns Nothing.
 * @throws Throws when the state directory or file cannot be written.
 */
function writeFeedbackState(filePath: string, state: FeedbackState): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
}

/**
 * @function getFeedbackPrompt
 * @description Determines whether the interactive CLI should show the periodic feedback notice.
 * The first interactive invocation initializes the clock; later reminders occur every 30 days.
 *
 * @param options - Optional state path, installation date, current time, and interactivity flag.
 * @returns Feedback content when a reminder is due, otherwise null.
 * @throws Does not throw when state is missing or malformed; filesystem write failures may propagate.
 *
 * @example
 * const prompt = getFeedbackPrompt({ interactive: process.stdout.isTTY });
 */
export function getFeedbackPrompt(options: FeedbackPromptOptions = {}): FeedbackPrompt | null {
  if (options.interactive === false) return null;
  const now = options.now ?? new Date();
  const filePath = options.filePath ?? getFeedbackStatePath();
  const state = readFeedbackState(filePath);
  if (!state) {
    writeFeedbackState(filePath, {
      enabled: true,
      firstSeenAt: options.installationDate ?? now.toISOString(),
    });
    return null;
  }

  const firstSeenAt = Date.parse(state.firstSeenAt);
  if (!Number.isFinite(firstSeenAt) || state.enabled === false) return null;
  const lastShownAt = state.lastShownAt ? Date.parse(state.lastShownAt) : firstSeenAt;
  const reminderCount = state.reminderCount ?? 0;
  const windowStartedAt = state.windowStartedAt ? Date.parse(state.windowStartedAt) : now.getTime();
  const windowExpired = now.getTime() - windowStartedAt >= 24 * 60 * 60 * 1000;
  const countInWindow = windowExpired ? 0 : reminderCount;
  const minimumInterval = FEEDBACK_MIN_INTERVAL_HOURS * 60 * 60 * 1000;
  const intervalDays =
    reminderCount === 0
      ? FEEDBACK_FIRST_REMINDER_DAYS
      : reminderCount === 1
        ? FEEDBACK_SECOND_REMINDER_DAYS
        : FEEDBACK_INTERVAL_MS / (24 * 60 * 60 * 1000);
  if (
    !Number.isFinite(firstSeenAt) ||
    !Number.isFinite(lastShownAt) ||
    countInWindow >= FEEDBACK_MAX_PER_WINDOW ||
    now.getTime() - lastShownAt < Math.max(intervalDays * 24 * 60 * 60 * 1000, minimumInterval)
  )
    return null;

  writeFeedbackState(filePath, {
    ...state,
    enabled: true,
    lastShownAt: now.toISOString(),
    reminderCount: countInWindow + 1,
    windowStartedAt:
      windowExpired || !state.windowStartedAt ? now.toISOString() : state.windowStartedAt,
  });
  return getFeedbackReminder(Boolean(state.manualFeedbackAt));
}

/**
 * @function getFeedbackReminderStatus
 * @description Reads the persisted reminder state and derives its human-readable schedule.
 *
 * @param filePath - Optional reminder state path.
 * @param now - Optional clock value for deterministic tests.
 * @returns Current reminder status.
 * @throws Does not throw when the state file is absent.
 */
export function getFeedbackReminderStatus(
  filePath?: string,
  now: Date = new Date(),
): FeedbackReminderStatus {
  const state = readFeedbackState(filePath ?? getFeedbackStatePath());
  const last = state?.lastShownAt ? new Date(state.lastShownAt) : undefined;
  const next = last
    ? new Date(last.getTime() + (state?.reminderCount === 1 ? 15 : 30) * 24 * 60 * 60 * 1000)
    : state
      ? new Date(Date.parse(state.firstSeenAt) + 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    enabled: state?.enabled !== false,
    firstReminder: 'After 7 days',
    lastReminder: last?.toISOString(),
    maxPerWindow: FEEDBACK_MAX_PER_WINDOW,
    minimumInterval: '4 hours',
    nextEligible: next?.toISOString(),
    repeatInterval: 'Every 30 days',
    window: '24 hours',
  };
}

/**
 * @function updateFeedbackReminders
 * @description Enables, disables, or resets persisted feedback reminders.
 *
 * @param action - Reminder lifecycle action.
 * @param filePath - Optional reminder state path.
 * @returns Nothing.
 * @throws Throws when the state directory cannot be written.
 */
export function updateFeedbackReminders(
  action: 'disable' | 'enable' | 'reset',
  filePath?: string,
): void {
  const target = filePath ?? getFeedbackStatePath();
  const state = readFeedbackState(target) ?? { firstSeenAt: new Date().toISOString() };
  if (action === 'reset')
    writeFeedbackState(target, { enabled: true, firstSeenAt: new Date().toISOString() });
  else if (action === 'enable')
    writeFeedbackState(target, {
      ...state,
      enabled: true,
      lastShownAt: new Date().toISOString(),
      reminderCount: 2,
    });
  else writeFeedbackState(target, { ...state, enabled: false });
}

/**
 * @function recordFeedbackInteraction
 * @description Resets the automatic reminder cycle after voluntary feedback activity.
 *
 * @param filePath - Optional reminder state path.
 * @returns Nothing.
 * @throws Throws when the state directory cannot be written.
 */
export function recordFeedbackInteraction(filePath?: string): void {
  const target = filePath ?? getFeedbackStatePath();
  const state = readFeedbackState(target) ?? { firstSeenAt: new Date().toISOString() };
  const now = new Date().toISOString();
  writeFeedbackState(target, {
    ...state,
    enabled: true,
    lastShownAt: now,
    reminderCount: 2,
    windowStartedAt: now,
    manualFeedbackAt: now,
  });
}

/**
 * @function getFeedbackReminder
 * @description Creates the short feedback content used by the periodic interactive reminder.
 *
 * @returns A compact reminder that directs the user to the full feedback command.
 * @throws Does not throw for the built-in reminder content.
 */
export function getFeedbackReminder(afterInteraction = false): FeedbackPrompt {
  const reminder: FeedbackPrompt = {
    command: FEEDBACK_COMMAND,
    detail: '',
    message: FEEDBACK_REMINDER_MESSAGE,
  };
  if (afterInteraction) reminder.afterInteraction = true;
  return reminder;
}

/**
 * @function formatFeedbackNotice
 * @description Formats the feedback reminder using the shared Brewly notice card design.
 *
 * @param prompt - Feedback contact and message content.
 * @returns A terminal-ready feedback notice.
 * @throws Does not throw for valid feedback content.
 */
export function formatFeedbackNotice(prompt: FeedbackPrompt): string {
  if (!prompt.links?.length) return formatFeedbackReminder(prompt);

  const notice = formatNotice(prompt);

  const links = prompt.links
    .map(({ label, url }) => `  ${paint(`${label}:`, 'gray')} ${url}`)
    .join('\n');
  return `${notice}\n\n${paint('Feedback channels', 'cyan')}\n${links}`;
}

/**
 * @function formatFeedbackReminder
 * @description Formats the compact recurring feedback reminder without the coffee cup artwork.
 * The CTA is highlighted as a terminal command so the required action is clear.
 *
 * @param prompt - Reminder command content.
 * @returns A terminal-ready compact reminder card.
 * @throws Does not throw for valid reminder content.
 */
function formatFeedbackReminder(prompt: FeedbackPrompt): string {
  const ctaLabel = 'Run this command: $ ';
  const width = Math.max(
    FEEDBACK_REMINDER_TITLE.length,
    FEEDBACK_REMINDER_MESSAGE.length,
    ctaLabel.length + prompt.command.length,
  );
  const row = (plainContent: string, styledContent = plainContent): string => {
    const padding = ' '.repeat(width - plainContent.length);
    return `${paint('│', 'yellow')} ${styledContent}${padding} ${paint('│', 'yellow')}`;
  };
  const cta = `${ctaLabel}${prompt.command}`;
  const styledCta = `${paint(ctaLabel, 'gray')}${paint(paint(prompt.command, 'yellow'), 'bold')}`;

  const reminder = [
    paint(`╭${'─'.repeat(width + 2)}╮`, 'yellow'),
    row(FEEDBACK_REMINDER_TITLE, paint(paint(FEEDBACK_REMINDER_TITLE, 'cyan'), 'bold')),
    row(FEEDBACK_REMINDER_MESSAGE, paint(FEEDBACK_REMINDER_MESSAGE, 'gray')),
    row(''),
    row(cta, styledCta),
    paint(`╰${'─'.repeat(width + 2)}╯`, 'yellow'),
  ].join('\n');
  if (!prompt.afterInteraction) return reminder;
  return `${reminder}\n\n${paint('Prefer not to see these reminders?', 'gray')}\n${paint('Run: brewly feedback reminders disable', 'gray')}`;
}

/**
 * @function getFeedbackContact
 * @description Creates the explicit feedback contact content shown by `brewly feedback`.
 *
 * @returns The feedback message and official Brewly contact address.
 * @throws Does not throw for the built-in feedback contact.
 *
 * @example
 * // brewly feedback
 */
export function getFeedbackContact(): FeedbackPrompt {
  return {
    command: FEEDBACK_COMMAND,
    detail: 'Your feedback helps improve Brewly for everyone.',
    links: FEEDBACK_LINKS,
    message: 'Share your experience, ideas, or issues with the Brewly project.',
  };
}

export type {
  FeedbackLink,
  FeedbackPrompt,
  FeedbackPromptOptions,
  FeedbackReminderStatus,
  FeedbackState,
} from './types';
