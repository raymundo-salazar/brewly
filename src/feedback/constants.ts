import type { FeedbackOption } from './types';

/** Official feedback destinations supported by the Brewly CLI. */
export const FEEDBACK_OPTIONS: readonly FeedbackOption[] = Object.freeze([
  {
    command: 'bug',
    label: 'Report a bug',
    helper: "Something isn't working as expected.",
    url: 'https://github.com/raymundo-salazar/brewly/issues/new',
  },
  {
    command: 'idea',
    label: 'Suggest a feature',
    helper: 'Share an idea or improvement.',
    url: 'https://github.com/raymundo-salazar/brewly/discussions/new?category=ideas',
  },
  {
    command: 'question',
    label: 'Ask a question',
    helper: 'Get help or ask how something works.',
    url: 'https://github.com/raymundo-salazar/brewly/discussions/new?category=q-a',
  },
  {
    command: 'discuss',
    label: 'Join the community',
    helper: 'Connect with the Brewly community.',
    url: 'https://github.com/raymundo-salazar/brewly/discussions',
  },
  {
    command: 'star',
    label: 'Star on GitHub',
    helper: 'Enjoying Brewly? Give us a star!',
    url: 'https://github.com/raymundo-salazar/brewly',
  },
  {
    command: 'sponsor',
    label: 'Support Brewly',
    helper: 'Help keep the project growing.',
    url: 'https://github.com/sponsors/raymundo-salazar',
  },
] as const);
