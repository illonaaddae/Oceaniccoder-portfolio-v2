// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import {
  UsageError,
  cosmosHost,
  paystackKeyMode,
  describeTransaction,
  listSuccessfulTransactions,
  parseReconcileArgs,
  reconcileExitCode,
  reconcileTransactions,
} from "./reconcile.mjs";

const require = createRequire(import.meta.url);
const { paymentIdFor } = require("../../api/shared/quotes/repo.cosmos.js");

describe("parseReconcileArgs", () => {
  const live = ["--mode", "live"];

  it("needs a --since with a time and a zone", () => {
    expect(parseReconcileArgs(["--since", "2026-10-28T18:00:00Z", ...live])).toEqual({
      since: "2026-10-28T18:00:00.000Z",
      mode: "live",
    });
    expect(parseReconcileArgs(["--since", "2026-10-28T19:00:00+01:00", ...live]).since).toBe(
      "2026-10-28T18:00:00.000Z",
    );
    expect(() => parseReconcileArgs(live)).toThrow("--since");
    expect(() => parseReconcileArgs(["--since"])).toThrow("--since");
    expect(() => parseReconcileArgs(["--since", "yesterday", ...live])).toThrow("ISO");
    expect(() => parseReconcileArgs(["--since", "2026-13-40T00:00:00Z", ...live])).toThrow("ISO");
    // Without a zone Node reads the time as local, which shifts the window.
    expect(() => parseReconcileArgs(["--since", "2026-10-28T18:00:00", ...live])).toThrow(
      "Z or an offset",
    );
    expect(() => parseReconcileArgs(["--since", "2026-10-28", ...live])).toThrow("Z or an offset");
  });

  it("needs --mode live or test", () => {
    const since = ["--since", "2026-10-28T18:00:00Z"];
    expect(parseReconcileArgs([...since, "--mode", "test"]).mode).toBe("test");
    expect(() => parseReconcileArgs(since)).toThrow("--mode");
    expect(() => parseReconcileArgs([...since, "--mode", "prod"])).toThrow("--mode");
  });

  it("refuses --apply and unknown arguments", () => {
    expect(() => parseReconcileArgs(["--since", "2026-10-28T00:00:00Z", "--apply"])).toThrow(
      "not implemented",
    );
    expect(() => parseReconcileArgs(["--fix"])).toThrow(UsageError);
  });
});

describe("paystackKeyMode", () => {
  it("reads the mode from the key prefix", () => {
    expect(paystackKeyMode("sk_live_abc")).toBe("live");
    expect(paystackKeyMode("sk_test_abc")).toBe("test");
  });

  it("refuses any other key without echoing it", () => {
    for (const key of ["pk_live_abc", "abc", ""]) {
      let error;
      try {
        paystackKeyMode(key);
      } catch (err) {
        error = err;
      }
      expect(error).toBeInstanceOf(UsageError);
      if (key) expect(error.message).not.toContain(key);
    }
  });
});

describe("cosmosHost", () => {
  it("shows only the host of the endpoint", () => {
    expect(cosmosHost("https://oceaniccoder-db.documents.azure.com:443/")).toBe(
      "oceaniccoder-db.documents.azure.com",
    );
    expect(cosmosHost("not a url")).toBe("(unreadable COSMOS_ENDPOINT)");
  });
});

describe("listSuccessfulTransactions", () => {
  const txs = (...refs) => refs.map((reference) => ({ reference }));
  const run = async (pages, perPage = 2) => {
    const asked = [];
    const all = await listSuccessfulTransactions(async (page) => {
      asked.push(page);
      return pages[page] ?? { data: [], meta: {} };
    }, perPage);
    return { refs: all.map((t) => t.reference), asked };
  };

  it("follows offset pages until pageCount", async () => {
    const result = await run({
      1: { data: txs("a", "b"), meta: { page: 1, pageCount: 2, perPage: 2 } },
      2: { data: txs("c"), meta: { page: 2, pageCount: 2, perPage: 2 } },
    });
    expect(result).toEqual({ refs: ["a", "b", "c"], asked: [1, 2] });
  });

  it("follows cursor-shaped pages by page number while next is set", async () => {
    const result = await run({
      1: { data: txs("a", "b"), meta: { next: "cur2", previous: null, perPage: 2 } },
      2: { data: txs("c"), meta: { next: null, previous: "cur1", perPage: 2 } },
    });
    expect(result).toEqual({ refs: ["a", "b", "c"], asked: [1, 2] });
  });

  it("asks for another page after a full cursor-shaped page with no next", async () => {
    const result = await run({
      1: { data: txs("a", "b"), meta: { next: null, previous: null, perPage: 2 } },
      2: { data: [], meta: { next: null, previous: null, perPage: 2 } },
    });
    expect(result).toEqual({ refs: ["a", "b"], asked: [1, 2] });
  });

  it("fails on a full page with neither pageCount nor a cursor", async () => {
    await expect(run({ 1: { data: txs("a", "b"), meta: {} } })).rejects.toThrow(
      "neither pageCount nor a cursor",
    );
    expect(await run({ 1: { data: txs("a"), meta: {} } })).toEqual({ refs: ["a"], asked: [1] });
  });

  it("keeps one copy of a transaction that shifts onto the next page", async () => {
    const result = await run({
      1: { data: txs("a", "b"), meta: { page: 1, pageCount: 2 } },
      2: { data: txs("b", "c"), meta: { page: 2, pageCount: 2 } },
    });
    expect(result).toEqual({ refs: ["a", "b", "c"], asked: [1, 2] });
  });

  it("fails when a page repeats the one before (page number ignored)", async () => {
    const same = { data: txs("a", "b"), meta: { next: "cur", perPage: 2 } };
    await expect(run({ 1: same, 2: same })).rejects.toThrow("same transactions");
  });

  it("stops on an empty page and fails on a malformed one", async () => {
    expect(await run({ 1: { data: [], meta: { pageCount: 9 } } })).toEqual({
      refs: [],
      asked: [1],
    });
    await expect(listSuccessfulTransactions(async () => ({ message: "x" }), 2)).rejects.toThrow(
      "no data list",
    );
  });
});

describe("reconcileTransactions", () => {
  it("matches by paystackReference and by the derived payment id", () => {
    const transactions = [{ reference: "IMPORTED" }, { reference: "NEW" }, { reference: "LOST" }];
    const payments = [
      { id: "6943aa00", paystackReference: "IMPORTED", status: "success" },
      { id: paymentIdFor("NEW"), status: "paid" },
    ];
    expect(reconcileTransactions(transactions, payments)).toEqual({
      unrecorded: [{ reference: "LOST" }],
      unsettled: [],
      problems: [],
    });
  });

  it("reports a transaction with no reference as unrecorded", () => {
    expect(reconcileTransactions([{ amount: 100 }], []).unrecorded).toEqual([{ amount: 100 }]);
  });

  it("does not count a pending row as recorded", () => {
    const tx = { reference: "R1" };
    for (const status of ["pending", "abandoned", undefined]) {
      const result = reconcileTransactions([tx], [{ id: paymentIdFor("R1"), status }]);
      expect(result.unrecorded).toEqual([]);
      expect(result.unsettled).toEqual([{ transaction: tx, status: status ?? null }]);
    }
  });

  it("lists rows settled as failed, duplicate or refunded for a look by hand", () => {
    const tx = { reference: "R1" };
    const result = reconcileTransactions([tx], [{ id: paymentIdFor("R1"), status: "duplicate" }]);
    expect(result.unsettled).toEqual([]);
    expect(result.problems).toEqual([{ transaction: tx, status: "duplicate" }]);
  });

  it("counts a reference as settled when any of its rows is", () => {
    const tx = { reference: "R1" };
    const result = reconcileTransactions(
      [tx],
      [
        { id: "old", paystackReference: "R1", status: "pending" },
        { id: paymentIdFor("R1"), status: "success" },
      ],
    );
    expect(result).toEqual({ unrecorded: [], unsettled: [], problems: [] });
  });
});

describe("reconcileExitCode", () => {
  const tx = { transaction: { reference: "R" }, status: "x" };

  it("is 0 when everything is settled", () => {
    expect(reconcileExitCode({ unrecorded: [], unsettled: [], problems: [] })).toBe(0);
  });

  it("is 4 when only rows to check by hand remain", () => {
    expect(reconcileExitCode({ unrecorded: [], unsettled: [], problems: [tx] })).toBe(4);
  });

  it("is 3 when a charge is unrecorded or unsettled, whatever else is listed", () => {
    expect(reconcileExitCode({ unrecorded: [{}], unsettled: [], problems: [tx] })).toBe(3);
    expect(reconcileExitCode({ unrecorded: [], unsettled: [tx], problems: [] })).toBe(3);
  });
});

describe("describeTransaction", () => {
  it("shows the amount in major units", () => {
    expect(
      describeTransaction({
        reference: "R1",
        paid_at: "2026-10-28T18:00:00Z",
        amount: 12550,
        currency: "GHS",
      }),
    ).toBe("R1  2026-10-28T18:00:00Z  125.50 GHS");
  });
});
