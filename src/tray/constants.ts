import type { TrayStatus, TrayStatusStyle } from './types';

/** Defines the rendered circle size used by the macOS status bar icon. */
export const TRAY_ICON_SIZE = 16;

/** Maps monitor lifecycle states to their status bar colors and labels. */
export const TRAY_STATUS_STYLES: Record<TrayStatus, TrayStatusStyle> = {
  starting: { color: '#808080', label: 'Starting' },
  'in-schedule': { color: '#34C759', label: 'In schedule' },
  'outside-schedule': { color: '#FFCC00', label: 'Outside schedule' },
  error: { color: '#FF3B30', label: 'Error' },
};

/** Provides visible Unicode circle fallbacks when macOS cannot render the SVG icon. */
export const TRAY_STATUS_SYMBOLS: Record<TrayStatus, string> = {
  starting: '🔘',
  'in-schedule': '🟢',
  'outside-schedule': '🟡',
  error: '🔴',
};
