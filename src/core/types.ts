/** A server id (UUID). */
export type Id = string;

/** A calendar date without time or zone, e.g. "2026-09-21". Compare as strings; never turn it into a `Date`. */
export type LocalDate = string;

/** A UTC moment as an ISO string, e.g. "2026-09-21T08:00:00Z". */
export type IsoDateTime = string;

/** A row version, sent back as `If-Match` on writes. */
export type Version = number;
