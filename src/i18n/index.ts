import { TRAY_TRANSLATIONS } from './constants';
import type { SupportedLanguage, TrayTranslations } from './types';

/**
 * @function getSupportedLanguage
 * @description Converts a macOS locale into a supported application language.
 * Spanish locales use Spanish; all other locales intentionally fall back to English.
 *
 * @param locale - macOS locale such as `es-MX` or `en-US`.
 * @returns The supported language identifier.
 * @throws Does not throw; malformed or missing locale values use English.
 */
export function getSupportedLanguage(locale: string | undefined): SupportedLanguage {
  return locale?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

/**
 * @function getTrayTranslations
 * @description Returns the complete dictionary for the requested macOS locale.
 *
 * @param locale - macOS locale used to select Spanish or English.
 * @returns The localized tray dictionary.
 * @throws Does not throw; unsupported locales use English.
 */
export function getTrayTranslations(locale: string | undefined): TrayTranslations {
  return TRAY_TRANSLATIONS[getSupportedLanguage(locale)];
}

export type { SupportedLanguage, TrayTranslations } from './types';
