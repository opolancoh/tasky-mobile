import { useCallback, useMemo } from 'react';

import type { LocalTime } from '@/core/types';

import { WheelColumn, WheelFrame } from './WheelColumn';

export interface TimeWheelProps {
  /** 24-hour "HH:mm", e.g. "09:00". */
  value: LocalTime;
  onChange(value: LocalTime): void;
  /** Decides 12-hour with AM/PM ("en") or 24-hour ("es"), and the AM/PM words. */
  locale: string;
  /** Minutes between rows: 15 gives 00, 15, 30, 45. A value between steps shows the nearest. */
  minuteStep?: number;
  /** For screen readers. */
  labels: { hour: string; minute: string; period: string };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A time picker: hour, minute, and AM/PM when the locale uses it. The value is always 24-hour
 * "HH:mm" (the API's TimeOnly); only the display follows the locale.
 */
export function TimeWheel({ value, onChange, locale, minuteStep = 15, labels }: TimeWheelProps) {
  const [h, m] = value.split(':').map(Number) as [number, number];
  const twelve = useMemo(() => uses12HourCached(locale), [locale]);

  const hourLabels = useMemo(() => (twelve ? ['12', ...Array.from({ length: 11 }, (_, i) => String(i + 1))] : Array.from({ length: 24 }, (_, i) => pad(i))), [twelve]);
  const minuteLabels = useMemo(() => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => pad(i * minuteStep)), [minuteStep]);
  const periodLabels = useMemo(() => dayPeriods(locale), [locale]);

  const hourIndex = twelve ? h % 12 : h;
  const minuteIndex = Math.min(Math.round(m / minuteStep), minuteLabels.length - 1);
  const pm = h >= 12;

  const emit = useCallback((hour: number, minute: number) => onChange(`${pad(hour)}:${pad(minute)}`), [onChange]);
  const onHour = useCallback((i: number) => emit(twelve ? (i % 12) + (pm ? 12 : 0) : i, m), [emit, twelve, pm, m]);
  const onMinute = useCallback((i: number) => emit(h, i * minuteStep), [emit, h, minuteStep]);
  const onPeriod = useCallback((i: number) => emit((h % 12) + (i === 1 ? 12 : 0), m), [emit, h, m]);

  return (
    <WheelFrame>
      <WheelColumn labels={hourLabels} index={hourIndex} onChange={onHour} accessibilityLabel={labels.hour} align={twelve ? 'right' : 'center'} />
      <WheelColumn labels={minuteLabels} index={minuteIndex} onChange={onMinute} accessibilityLabel={labels.minute} />
      {twelve && <WheelColumn labels={periodLabels} index={pm ? 1 : 0} onChange={onPeriod} accessibilityLabel={labels.period} align="left" />}
    </WheelFrame>
  );
}

const twelveByLocale = new Map<string, boolean>();
/** Intl is slow to build; ask once per locale. */
function uses12HourCached(locale: string): boolean {
  let twelve = twelveByLocale.get(locale);
  if (twelve === undefined) {
    const options = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions() as Intl.ResolvedDateTimeFormatOptions & { hourCycle?: string };
    twelve = options.hourCycle ? options.hourCycle === 'h12' || options.hourCycle === 'h11' : !!options.hour12;
    twelveByLocale.set(locale, twelve);
  }
  return twelve;
}

/** The locale's AM and PM words ("AM"/"PM", "a. m."/"p. m."). */
function dayPeriods(locale: string): [string, string] {
  const format = new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true, timeZone: 'UTC' });
  const period = (hour: number) => format.formatToParts(new Date(Date.UTC(2000, 0, 1, hour))).find((p) => p.type === 'dayPeriod')?.value ?? (hour < 12 ? 'AM' : 'PM');
  return [period(9), period(21)];
}
