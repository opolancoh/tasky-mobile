import { useEffect, useState } from 'react';

/** How long a save may take before its control shows a spinner (M56): a faster answer shows none, so nothing flickers. */
export const BUSY_DELAY_MS = 300;

/** True once `on` has stayed true for `delayMs`; false again as soon as `on` is. Keep it in the control, not the screen. */
export function useDelayedFlag(on: boolean, delayMs = BUSY_DELAY_MS): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!on) return;
    const timer = setTimeout(() => setElapsed(true), delayMs);
    return () => {
      clearTimeout(timer);
      setElapsed(false);
    };
  }, [on, delayMs]);
  return on && elapsed;
}
