/** Stores the timestamps used to schedule feedback reminders. */
export interface FeedbackState {
  enabled?: boolean;
  firstSeenAt: string;
  lastShownAt?: string;
  manualFeedbackAt?: string;
  reminderCount?: number;
  windowStartedAt?: string;
}

/** Describes the user-facing reminder configuration and current schedule. */
export interface FeedbackReminderStatus {
  enabled: boolean;
  firstReminder: string;
  lastReminder?: string;
  maxPerWindow: number;
  minimumInterval: string;
  nextEligible?: string;
  repeatInterval: string;
  window: string;
}

/** Configures a deterministic feedback reminder evaluation. */
export interface FeedbackPromptOptions {
  filePath?: string;
  installationDate?: string;
  interactive?: boolean;
  now?: Date;
}

/** Describes the feedback contact shown to the user. */
export interface FeedbackPrompt {
  command: string;
  detail: string;
  links?: readonly FeedbackLink[];
  message: string;
  afterInteraction?: boolean;
}

/** Describes an official feedback or project link. */
export interface FeedbackLink {
  label: string;
  url: string;
}
