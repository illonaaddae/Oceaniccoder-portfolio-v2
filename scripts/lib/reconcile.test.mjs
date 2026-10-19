// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import {
  UsageError,
  describeTransaction,
  findUnrecorded,
  listSuccessfulTransactions,
  parseReconcileArgs,
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

describe("findUnrecorded", () => {
  it("matches by paystackReference and by the derived payment id", () => {
    const transactions = [{ reference: "IMPORTED" }, { reference: "NEW" }, { reference: "LOST" }];
    const payments = [
      { id: "6943aa00", paystackReference: "IMPORTED" },
      { id: paymentIdFor("NEW") },
    ];
    expect(findUnrecorded(transactions, payments)).toEqual([{ reference: "LOST" }]);
  });

  it("reports a transaction with no reference", () => {
    expect(findUnrecorded([{ amount: 100 }], [])).toEqual([{ amount: 100 }]);
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
