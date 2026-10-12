import type { HttpLogLevel } from '@/core/http/httpLog';

/**
 * Build-time settings from EXPO_PUBLIC_* variables: .env.local in development (see .env.example), eas.json for builds.
 * This is the only place that reads them. EXPO_PUBLIC_API_URL is required everywhere, so it's always known which API
 * the app calls: app.config.ts stops `npx expo start` and `eas build` without it, and this check stops the app.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiUrl) throw new Error("EXPO_PUBLIC_API_URL isn't set: set it in .env.local (copy .env.example) and restart npx expo start.");

const httpLog = process.env.EXPO_PUBLIC_HTTP_LOG;

export const config = {
  /** The API, e.g. http://192.168.1.20:5186/api/v1. Required. */
  apiUrl,
  /** Development only: what the Metro terminal shows of the API calls (core/http/httpLog.ts). Optional: all. */
  httpLog: (httpLog === 'off' || httpLog === 'errors' ? httpLog : 'all') as HttpLogLevel,
};
