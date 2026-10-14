/** Lists the languages currently supported by the tray interface. */
export type SupportedLanguage = 'en' | 'es';

/** Contains every user-facing string rendered by the status bar menu. */
export interface TrayTranslations {
  appName: string;
  menu: {
    pause: string;
    resume: string;
    start: string;
    stop: string;
  };
  status: {
    starting: string;
    'in-schedule': string;
    'outside-schedule': string;
    paused: string;
    stopped: string;
    error: string;
  };
  statusPrefix: string;
}
