import type { ConfigContext, ExpoConfig } from 'expo/config';

import active from './src/shared/ui/palettes/active.json';

/**
 * app.json plus the colors that come from the active palette (splash and Android icon background),
 * so changing src/shared/ui/palettes/active.json changes them too. Native colors need a rebuild to show.
 * The API address is required everywhere, so it's always known which API the app calls: `.env.local` in
 * development, eas.json's build.production.env for a tester's build (EAS for iOS, scripts/android-build.sh for Android,
 * docs/releases.md). `npx expo start` and the builds stop without it.
 * Plain HTTP is allowed in a build only when that address is http:// (an API at home); Expo Go allows it anyway.
 * EAS CLI commands that only read this config (`eas submit`, `eas credentials`) run without .env files
 * (EXPO_NO_DOTENV) or the build's env: they don't need the address, so it isn't required there.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { light, dark } = require(`./src/shared/ui/palettes/${active.palette}.json`);
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const easCliRead = !!process.env.EXPO_NO_DOTENV && !process.env.EAS_BUILD && !apiUrl;
  if (!easCliRead && (!apiUrl || !/^https?:\/\/[^/\s]+\/api\/v1$/.test(apiUrl))) {
    throw new Error(
      `EXPO_PUBLIC_API_URL ${apiUrl ? `is "${apiUrl}", not an API address` : "isn't set"}: it must be like http://192.168.1.20:5186/api/v1. ` +
        (process.env.EAS_BUILD
          ? 'Set it in eas.json (build.production.env).'
          : 'Set it in .env.local (copy .env.example): localhost for the iOS simulator, this Mac\'s IP for a phone or the Android emulator. Then restart npx expo start.'),
    );
  }
  // The settings this run uses, once, under Expo's "env:" lines (M52). Expo reads this file more than once.
  const printed = globalThis as { azigniaConfigPrinted?: boolean };
  if (!process.env.EAS_BUILD && !printed.azigniaConfigPrinted) {
    printed.azigniaConfigPrinted = true;
    console.log(['Config OK', `  EXPO_PUBLIC_API_URL   ${apiUrl}`, `  EXPO_PUBLIC_HTTP_LOG  ${process.env.EXPO_PUBLIC_HTTP_LOG ?? 'all (default)'}`].join('\n'));
  }
  const cleartext = !!apiUrl?.startsWith('http://');

  const plugins: ExpoConfig['plugins'] = (config.plugins ?? []).map((plugin) =>
    Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
      ? (['expo-splash-screen', { ...plugin[1], backgroundColor: light.bg, dark: { ...plugin[1]?.dark, backgroundColor: dark.bg } }] as [string, unknown])
      : plugin,
  );
  plugins.push(['expo-build-properties', { android: { usesCleartextTraffic: cleartext } }]);
  plugins.push('./plugins/withReleaseSigning');   // Android release signing from keystore.properties (M61)

  // Android's versionCode comes from the version (0.3.1 → 301), so a release fixes it and a build changes no file (M61).
  const [major, minor, patch] = (config.version ?? '').split('.').map(Number);
  if (![major, minor, patch].every((n) => Number.isInteger(n) && n >= 0) || minor > 99 || patch > 99) {
    throw new Error(`app.json's version "${config.version}" must be x.y.z with y and z up to 99.`);
  }

  return {
    ...config,
    name: config.name ?? 'Azignia',
    slug: config.slug ?? 'azignia',
    ios: {
      ...config.ios,
      infoPlist: { ...config.ios?.infoPlist, ...(cleartext ? { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } } : {}) },
    },
    android: {
      ...config.android,
      adaptiveIcon: { ...config.android?.adaptiveIcon, backgroundColor: light.surface },   // the white tile behind the mark (A10)
      versionCode: major * 10000 + minor * 100 + patch,
    },
    plugins,
  };
};
