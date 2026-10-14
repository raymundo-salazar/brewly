import type { SupportedLanguage, TrayTranslations } from './types';

/** Provides the English strings used by the status bar interface. */
export const ENGLISH_TRAY_TRANSLATIONS: TrayTranslations = {
  appName: 'Mac Idle Keeper',
  menu: {
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
  },
  status: {
    starting: 'Starting',
    'in-schedule': 'In schedule',
    'outside-schedule': 'Outside schedule',
    paused: 'Paused',
    error: 'Error',
  },
  statusPrefix: 'Status',
};

/** Provides the Spanish strings used by the status bar interface. */
export const SPANISH_TRAY_TRANSLATIONS: TrayTranslations = {
  appName: 'Mac Idle Keeper',
  menu: {
    pause: 'Pausar',
    resume: 'Reanudar',
    stop: 'Detener',
  },
  status: {
    starting: 'Iniciando',
    'in-schedule': 'En horario',
    'outside-schedule': 'Fuera de horario',
    paused: 'Pausado',
    error: 'Error',
  },
  statusPrefix: 'Estado',
};

/** Maps supported language identifiers to their tray dictionaries. */
export const TRAY_TRANSLATIONS: Record<SupportedLanguage, TrayTranslations> = {
  en: ENGLISH_TRAY_TRANSLATIONS,
  es: SPANISH_TRAY_TRANSLATIONS,
};
