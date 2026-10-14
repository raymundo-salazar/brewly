import type { TrayAction, TrayIconStatus, TrayStatus } from './types';

/** Maps monitor states to @1x and @2x PNG assets shipped with the package. */
export const TRAY_STATUS_ASSETS: Record<TrayIconStatus, { standard: string; retina: string }> = {
  starting: {
    standard: 'mac-idle-keeper-inactive@1x.png',
    retina: 'mac-idle-keeper-inactive@2x.png',
  },
  'in-schedule': {
    standard: 'mac-idle-keeper-active@1x.png',
    retina: 'mac-idle-keeper-active@2x.png',
  },
  'outside-schedule': {
    standard: 'mac-idle-keeper-idle@1x.png',
    retina: 'mac-idle-keeper-idle@2x.png',
  },
  error: {
    standard: 'mac-idle-keeper-error@1x.png',
    retina: 'mac-idle-keeper-error@2x.png',
  },
};

/** Maps the paused state to @1x and @2x light-appearance PNG assets. */
export const TRAY_PAUSE_ASSET = {
  standard: 'mac-idle-keeper-pause-light@1x.png',
  retina: 'mac-idle-keeper-pause-light@2x.png',
};

/** Maps lifecycle actions to native macOS SF Symbol names. */
export const TRAY_ACTION_ICONS: Record<TrayAction, string> = {
  pause: 'pause.fill',
  resume: 'play.fill',
  stop: 'stop.fill',
};

/** Defines the logical size used for lifecycle icons inside the tray menu. */
export const TRAY_MENU_ICON_SIZE = 12;

/** Provides visible Unicode fallbacks when macOS cannot render a packaged icon. */
export const TRAY_STATUS_SYMBOLS: Record<TrayStatus, string> = {
  starting: '🔘',
  'in-schedule': '🟢',
  'outside-schedule': '🟡',
  paused: '⏸️',
  error: '🔴',
};
