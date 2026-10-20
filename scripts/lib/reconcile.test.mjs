// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import {
  UsageError,
  describeTransaction,
  listSuccessfulTransactions,
  parseReconcileArgs,
  reconcileTransactions,
} from "./reconcile.mjs";

const require = createRequire(import.meta.url);
const { paymentIdFor } = require("../../api/shared/quotes/repo.cosmos.js");

describe("parseReconcileArgs", () => {
  it("needs a valid --since", () => {
    expect(parseReconcileArgs(["--since", "2026-10-28T18:00:00Z"])).toEqual({
      since: "2026-10-28T18:00:00.000Z",
    });
    expect(() => parseReconcileArgs([])).toThrow("--since");
    expect(() => parseReconcileArgs(["--since"])).toThrow("--since");
    expect(() => parseReconcileArgs(["--since", "yesterday"])).toThrow("ISO");
    expect(() => parseReconcileArgs(["--since", "2026-13-40"])).toThrow("ISO");
  });

  it("refuses --apply and unknown arguments", () => {
    expect(() => parseReconcileArgs(["--since", "2026-10-28", "--apply"])).toThrow(
      "not implemented",
    );
    expect(() => parseReconcileArgs(["--fix"])).toThrow(UsageError);
  });
});

describe("listSuccessfulTransactions", () => {
  it("follows the pages until pageCount", async () => {
    const pages = { 1: ["a", "b"], 2: ["c"] };
    const asked = [];
    const all = await listSuccessfulTransactions(async (page) => {
      asked.push(page);
      return {
        data: pages[page].map((reference) => ({ reference })),
        meta: { page, pageCount: 2 },
      };
    });
    expect(all.map((t) => t.reference)).toEqual(["a", "b", "c"]);
    expect(asked).toEqual([1, 2]);
  });

  it("stops on an empty page and fails on a malformed one", async () => {
    const empty = await listSuccessfulTransactions(async () => ({
      data: [],
      meta: { pageCount: 9 },
    }));
    expect(empty).toEqual([]);
    await expect(listSuccessfulTransactions(async () => ({ message: "x" }))).rejects.toThrow(
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
