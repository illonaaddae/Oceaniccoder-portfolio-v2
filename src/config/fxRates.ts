/**
 * Rates for the "approx." GHS totals on the admin Analytics tab. Every money
 * figure is shown in its own currency first; these rates only feed the extra
 * combined line, which always says "approx." and shows `asOf`.
 *
 * To update: change the rates and set `asOf` to the date you checked them
 * (YYYY-MM-DD). A currency missing here is left out of the combined figure and
 * named next to it, never guessed.
 */
export const FX_RATES = {
  asOf: "2026-10-13",
  /** How many GHS one unit of each currency buys. */
  toGHS: {
    GHS: 1,
    USD: 15.5,
    EUR: 16.9,
    GBP: 19.7,
    NGN: 0.0097,
    KES: 0.12,
  } as Record<string, number>,
};
