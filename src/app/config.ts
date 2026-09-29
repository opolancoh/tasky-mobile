import Constants from 'expo-constants';

/**
 * Build-time settings from EXPO_PUBLIC_* variables (.env.local, see .env.example).
 * Without EXPO_PUBLIC_API_URL, a development build reaches the API on the Mac that runs Metro, at the
 * address the app loaded its bundle from: the simulator, an emulator and a phone on the same Wi-Fi all
 * work without setup. The API must listen on all interfaces (tasky-api launchSettings: http://*:5186).
 */
const devHost = __DEV__ ? Constants.expoConfig?.hostUri?.split(':')[0] : undefined;

export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? `http://${devHost ?? 'localhost'}:5186/api/v1`,
};
