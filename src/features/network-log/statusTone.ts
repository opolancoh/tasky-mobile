import type { NetworkEntry } from '@/shared/network/networkLog';

/** A call's color: 2xx success, 4xx warn, 5xx or no response danger, still running quiet. */
export function statusTone(e: NetworkEntry): 'success' | 'warn' | 'danger' | 'ink3' {
  if (e.ms === undefined) return 'ink3';
  if (e.errorCode) return e.status && e.status < 500 ? 'warn' : 'danger';
  return 'success';
}

/** "200", "TIMEOUT", or "…" while it runs. */
export const statusLabel = (e: NetworkEntry) => (e.ms === undefined ? '…' : e.status ? String(e.status) : (e.errorCode ?? '').toUpperCase());

/** "512 B", "1.2 KB". */
export const sizeLabel = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

/** At least this long is Slow. */
export const SLOW_MS = 1000;
