import { getSupportedLanguage, getTrayTranslations } from '../../src/i18n';

describe('i18n', () => {
  test('maps Spanish locales to the Spanish dictionary', () => {
    expect(getSupportedLanguage('es-MX')).toBe('es');
    expect(getTrayTranslations('es-ES').menu).toEqual({
      pause: 'Pausar',
      resume: 'Reanudar',
      stop: 'Detener',
    });
  });

  test('uses English as the fallback for unsupported or missing locales', () => {
    expect(getSupportedLanguage('fr-FR')).toBe('en');
    expect(getSupportedLanguage(undefined)).toBe('en');
    expect(getTrayTranslations('en-US').status['in-schedule']).toBe('In schedule');
  });
});
