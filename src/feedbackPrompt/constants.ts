/** Official Brewly feedback email address. */
export const FEEDBACK_EMAIL = 'brewly@raymundosalazar.dev';

/** Number of days between feedback prompts. */
export const FEEDBACK_INTERVAL_DAYS = 30;

/** Milliseconds in one feedback reminder interval. */
export const FEEDBACK_INTERVAL_MS = FEEDBACK_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

/** Number of days before the first feedback reminder. */
export const FEEDBACK_FIRST_REMINDER_DAYS = 7;

/** Number of days between the first and second feedback reminders. */
export const FEEDBACK_SECOND_REMINDER_DAYS = 15;

/** Minimum hours between reminders in the same display window. */
export const FEEDBACK_MIN_INTERVAL_HOURS = 4;

/** Maximum reminders allowed in one 24-hour display window. */
export const FEEDBACK_MAX_PER_WINDOW = 3;

/** Filename used for the feedback reminder state. */
export const FEEDBACK_STATE_FILE = 'feedback-state.json';

/** Command shown by the recurring reminder to open the full feedback guide. */
export const FEEDBACK_COMMAND = 'brewly feedback';

/** Title shown by the compact recurring feedback reminder. */
export const FEEDBACK_REMINDER_TITLE = 'Brewly · Your Voice Matters';

/** Body shown by the compact recurring feedback reminder. */
export const FEEDBACK_REMINDER_MESSAGE =
  "Enjoying Brewly? Help make it better. Ideas, questions, or bugs — we're listening.";

/** Official Brewly channels shown by the explicit feedback command. */
export const FEEDBACK_LINKS = Object.freeze([
  { label: 'Email', url: 'mailto:brewly@raymundosalazar.dev' },
  { label: 'GitHub issues', url: 'https://github.com/raymundo-salazar/brewly/issues' },
  { label: 'GitHub repository', url: 'https://github.com/raymundo-salazar/brewly' },
  { label: 'GitHub Sponsors', url: 'https://github.com/sponsors/raymundo-salazar' },
] as const);
