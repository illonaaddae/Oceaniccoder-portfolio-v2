// A per-UTC-day budget shared by every Function instance, kept as one counter
// doc per day in the Cosmos `analytics` container (partition /day, items set
// their own ttl). Used by /api/visit (raw page-view writes) and /api/chat
// (paid OpenAI calls).

const DAY_SECONDS = 24 * 60 * 60;

/**
 * Caps something at `limit` units per UTC day across all instances. Each
 * request reserves its units first with one atomic `incr` patch on the
 * `<key>:<day>` doc (2-day ttl, created on the first request of the day, with
 * a 409 race falling back to the patch) and uses only what the returned
 * total leaves room for. One patch per request; once the day is full this
 * instance stops patching until the next day.
 *
 * Reserved units whose use then fails still count, so the day can end a
 * little under the limit; never over it. Rejects when the counter can't be
 * reached, and the caller decides whether that fails open or closed.
 */
function createDailyCeiling(container, { limit, key }) {
  let fullDay = null;

  const incr = (id, forDay, delta) =>
    container.item(id, forDay).patch([{ op: "incr", path: "/n", value: delta }]);

  async function addToCounter(forDay, delta) {
    const id = `${key}:${forDay}`;
    try {
      return (await incr(id, forDay, delta)).resource.n;
    } catch (err) {
      if (err.code !== 404) throw err;
    }
    try {
      await container.items.create({
        id,
        type: "count",
        day: forDay,
        n: delta,
        ttl: 2 * DAY_SECONDS,
      });
      return delta;
    } catch (err) {
      if (err.code !== 409) throw err;
      return (await incr(id, forDay, delta)).resource.n;
    }
  }

  /**
   * Reserves room for `count` units and returns how many of them may be
   * used (0..count). The patch is atomic, so the returned total is this
   * request's own position in the day: concurrent requests at the boundary
   * can't all slip under the limit.
   */
  return async function reserve(forDay, count) {
    if (fullDay === forDay) return 0;
    const total = await addToCounter(forDay, count);
    if (total >= limit) fullDay = forDay;
    return Math.max(0, Math.min(count, count - (total - limit)));
  };
}

module.exports = { createDailyCeiling };
