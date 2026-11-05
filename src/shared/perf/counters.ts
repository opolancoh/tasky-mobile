/**
 * Temporary, to find what heats the phone (the Perf log): running totals the Perf log reads every 10 s. Plain numbers,
 * so counting costs nothing while it isn't recording. Remove with the Perf log.
 */
export const perfCounts = {
  /** Shimmers and spinners running now. */
  skeletons: 0,
  spinners: 0,
  /** Since launch. */
  requests: 0,
  retries: 0,
  failed: 0,
  pushes: 0,
};
