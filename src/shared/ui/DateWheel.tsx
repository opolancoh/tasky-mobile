import { useCallback, useMemo } from 'react';

import type { LocalDate } from '@/core/types';

import { WheelColumn, WheelFrame } from './WheelColumn';

export interface DateWheelProps {
  /** "2026-09-30". */
  value: LocalDate;
  onChange(value: LocalDate): void;
  /** The month names' language ("September", "septiembre"). */
  locale: string;
  /** The first year offered; the wheel offers `years` years from it. */
  fromYear: number;
  years?: number;
  /** For screen readers. */
  labels: { day: string; month: string; year: string };
}

const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * A date picker in three columns: day, month name, year (in that order in every language). Moving to
 * a shorter month keeps the day within it (31 → 30). The value is a LocalDate: no time, no zone.
 */
export function DateWheel({ value, onChange, locale, fromYear, years = 6, labels }: DateWheelProps) {
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const days = daysIn(y, m);

  const dayLabels = useMemo(() => Array.from({ length: days }, (_, i) => String(i + 1)), [days]);
  const monthLabels = useMemo(() => monthNames(locale), [locale]);
  const yearList = useMemo(() => Array.from({ length: years }, (_, i) => fromYear + i), [fromYear, years]);
  const yearLabels = useMemo(() => yearList.map(String), [yearList]);

  const emit = useCallback(
    (year: number, month: number, day: number) => onChange(`${year}-${pad(month)}-${pad(Math.min(day, daysIn(year, month)))}`),
    [onChange],
  );
  const onDay = useCallback((i: number) => emit(y, m, i + 1), [emit, y, m]);
  const onMonth = useCallback((i: number) => emit(y, i + 1, d), [emit, y, d]);
  const onYear = useCallback((i: number) => emit(yearList[i]!, m, d), [emit, yearList, m, d]);

  return (
    <WheelFrame>
      <WheelColumn labels={dayLabels} index={d - 1} onChange={onDay} accessibilityLabel={labels.day} width={64} />
      <WheelColumn labels={monthLabels} index={m - 1} onChange={onMonth} accessibilityLabel={labels.month} align="left" />
      <WheelColumn labels={yearLabels} index={Math.max(0, yearList.indexOf(y))} onChange={onYear} accessibilityLabel={labels.year} width={80} />
    </WheelFrame>
  );
}

const namesByLocale = new Map<string, string[]>();
/** The twelve month names as the locale writes them ("September", "septiembre"); built once per locale. */
function monthNames(locale: string): string[] {
  let names = namesByLocale.get(locale);
  if (!names) {
    const format = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' });
    names = Array.from({ length: 12 }, (_, i) => format.format(new Date(Date.UTC(2000, i, 15))));
    namesByLocale.set(locale, names);
  }
  return names;
}
