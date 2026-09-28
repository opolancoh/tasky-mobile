import { getCalendars, getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import es from './es.json';

export const languages = ['en', 'es'] as const;
export type Language = (typeof languages)[number];

/** The device's language when supported, else English. After sign-in the profile's language wins. */
export function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return (languages as readonly string[]).includes(code ?? '') ? (code as Language) : 'en';
}

/** The device's IANA time zone, e.g. "America/Bogota"; sent at sign-up, changeable in settings. */
export function deviceTimeZone(): string {
  return getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
}

const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
