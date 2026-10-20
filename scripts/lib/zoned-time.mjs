// A command-line time must carry Z or an offset: without one, Node reads a
// date-time as local time and a bare date as UTC, so the window moves.
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;

/** The time as a UTC ISO string, or null unless it is ISO with a zone. */
export function parseZonedTime(value) {
  if (typeof value !== "string" || !ISO_WITH_ZONE.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}
