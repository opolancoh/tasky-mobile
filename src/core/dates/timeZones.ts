/**
 * Time zones offered in Settings (M41): IANA ids the API accepts ([TimeZoneId]), the common ones by region. The device's
 * own zone is offered first even when it isn't listed here. Hermes has no Intl.supportedValuesOf, so the list is ours.
 */
export const timeZones = [
  'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Tijuana', 'America/Phoenix', 'America/Denver', 'America/Mexico_City',
  'America/Chicago', 'America/Guatemala', 'America/Costa_Rica', 'America/El_Salvador', 'America/Tegucigalpa', 'America/Managua', 'America/Panama',
  'America/Bogota', 'America/Lima', 'America/Guayaquil', 'America/New_York', 'America/Toronto', 'America/Havana', 'America/Santo_Domingo',
  'America/Puerto_Rico', 'America/Caracas', 'America/La_Paz', 'America/Halifax', 'America/Santiago', 'America/Asuncion', 'America/Argentina/Buenos_Aires',
  'America/Montevideo', 'America/Sao_Paulo', 'America/St_Johns', 'Atlantic/Azores', 'Atlantic/Canary', 'Europe/London', 'Europe/Dublin',
  'Europe/Lisbon', 'Africa/Casablanca', 'Africa/Lagos', 'Europe/Madrid', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Amsterdam',
  'Europe/Brussels', 'Europe/Zurich', 'Europe/Vienna', 'Europe/Stockholm', 'Europe/Oslo', 'Europe/Copenhagen', 'Europe/Warsaw', 'Europe/Prague',
  'Europe/Budapest', 'Europe/Athens', 'Europe/Bucharest', 'Europe/Helsinki', 'Europe/Kyiv', 'Europe/Istanbul', 'Africa/Cairo', 'Africa/Johannesburg',
  'Africa/Nairobi', 'Asia/Jerusalem', 'Europe/Moscow', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Tehran', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Kathmandu',
  'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Singapore', 'Asia/Manila', 'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Taipei', 'Asia/Seoul',
  'Asia/Tokyo', 'Australia/Perth', 'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Sydney', 'Pacific/Auckland', 'UTC',
] as const;

/** "America/Argentina/Buenos_Aires" → "Buenos Aires"; the region for the second line. */
export const zoneCity = (id: string) => (id.split('/').pop() ?? id).replace(/_/g, ' ');
export const zoneRegion = (id: string) => (id.includes('/') ? id.split('/')[0] : '');
