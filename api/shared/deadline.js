/* global module */
// Bounds a call that could otherwise hang. A Cosmos endpoint that accepts the
// connection but never answers leaves a query pending until the Functions host
// kills the invocation, so the caller's failure path never runs.
//
// run(signal) gets an AbortSignal to hand to the SDK (Cosmos takes it as the
// `abortSignal` request option) so the request itself is cancelled too. The
// returned promise rejects with "timed out" after `ms` even if run ignores it.

class TimeoutError extends Error {
  constructor() {
    super("timed out");
    this.name = "TimeoutError";
  }
}

function withDeadline(ms, run) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      // Reject first: abort() can reject run's promise synchronously, and the
      // caller should see "timed out", not the SDK's AbortError.
      reject(new TimeoutError());
      controller.abort();
    }, ms);
  });
  const work = new Promise((resolve) => resolve(run(controller.signal)));
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

module.exports = { withDeadline, TimeoutError };
