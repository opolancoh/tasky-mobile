/**
 * Build-time settings from EXPO_PUBLIC_* variables (.env.local, see .env.example).
 * The default reaches the API on this Mac from the iOS simulator; the Android emulator needs
 * http://10.0.2.2:5186/api/v1 and a phone needs the Mac's LAN address.
 */
export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5186/api/v1',
};
