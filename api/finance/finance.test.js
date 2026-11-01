// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeFinanceRepo } = await import("../shared/finance/repo.js");

const NOW = new Date("2026-11-05T09:00:00.000Z");

function setup({ admin = true, docs = [] } = {}) {
  const repo = createFakeFinanceRepo(docs);
  const handler = createHandler({
    requireAdmin: async () =>
      admin ? { user: { email: "owner@example.com" } } : { status: 401, error: "Sign in" },
    repo: () => repo,
    now: () => NOW,
  });
  const call = async (body) => {
    const context = { log: { error: vi.fn(), warn: vi.fn() } };
    await handler(context, { method: "POST", body, headers: {} });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };
  return { repo, call };
}

async function makeFund(call, fields = {}) {
  const res = await call({ action: "saveFund", name: "Savings", group: "wealth", ...fields });
  expect(res.status).toBe(200);
  return res.body.fund;
}

describe("/api/finance", () => {
  it("refuses callers who aren't the admin and reads nothing", async () => {
    const { call, repo } = setup({ admin: false });
    const spy = vi.spyOn(repo, "listAll");
    const res = await call({ action: "list" });
    expect(res.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects unknown actions, including inherited object keys", async () => {
    const { call } = setup();
    expect((await call({ action: "toString" })).status).toBe(400);
    expect((await call({ action: "dropAll" })).status).toBe(400);
  });

  it("creates a fund with every record in the 'me' partition", async () => {
    const { call } = setup();
    const fund = await makeFund(call, { targetMinor: 50000, monthlyMinor: 1000 });
    expect(fund).toMatchObject({ kind: "fund", scope: "me", targetMinor: 50000, items: [] });
  });

  it("rejects amounts that aren't whole pesewas", async () => {
    const { call } = setup();
    const fund = await makeFund(call);
    for (const amountMinor of [12.5, -100, 0, "100"]) {
      const res = await call({
        action: "addTxn",
        type: "deposit",
        date: "2026-11-05",
        amountMinor,
        fundId: fund.id,
      });
      expect(res.status).toBe(400);
    }
  });

  it("rejects impossible dates", async () => {
    const { call } = setup();
    const res = await call({
      action: "addTxn",
      type: "income",
      date: "2026-02-30",
      amountMinor: 100,
    });
    expect(res.status).toBe(400);
  });

  it("refuses to take more out of a fund than it holds", async () => {
    const { call } = setup();
    const fund = await makeFund(call);
    await call({
      action: "addTxn",
      type: "deposit",
      date: "2026-11-05",
      amountMinor: 1000,
      fundId: fund.id,
    });
    const res = await call({
      action: "addTxn",
      type: "withdrawal",
      date: "2026-11-06",
      amountMinor: 1001,
      fundId: fund.id,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain("GHS 10.00");
    const ok = await call({
      action: "addTxn",
      type: "withdrawal",
      date: "2026-11-06",
      amountMinor: 1000,
      fundId: fund.id,
    });
    expect(ok.status).toBe(200);
  });

  it("moves money between funds with one transfer and refuses a transfer to itself", async () => {
    const { call } = setup();
    const a = await makeFund(call, { name: "A" });
    const b = await makeFund(call, { name: "B", group: "goal" });
    await call({
      action: "addTxn",
      type: "opening",
      date: "2026-11-01",
      amountMinor: 500,
      fundId: a.id,
    });
    expect(
      (
        await call({
          action: "addTxn",
          type: "transfer",
          date: "2026-11-02",
          amountMinor: 500,
          fundId: a.id,
          toFundId: a.id,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call({
          action: "addTxn",
          type: "transfer",
          date: "2026-11-02",
          amountMinor: 500,
          fundId: a.id,
          toFundId: b.id,
        })
      ).status,
    ).toBe(200);
  });

  it("refuses deposits into a missing or archived fund", async () => {
    const { call } = setup();
    expect(
      (
        await call({
          action: "addTxn",
          type: "deposit",
          date: "2026-11-05",
          amountMinor: 1,
          fundId: "nope",
        })
      ).status,
    ).toBe(400);
    const fund = await makeFund(call);
    await call({
      action: "saveFund",
      id: fund.id,
      name: "Savings",
      group: "wealth",
      archived: true,
    });
    const res = await call({
      action: "addTxn",
      type: "deposit",
      date: "2026-11-05",
      amountMinor: 1,
      fundId: fund.id,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("archived");
  });

  it("won't delete a deposit that a later withdrawal depends on", async () => {
    const { call } = setup();
    const fund = await makeFund(call);
    const dep = await call({
      action: "addTxn",
      type: "deposit",
      date: "2026-11-05",
      amountMinor: 700,
      fundId: fund.id,
    });
    await call({
      action: "addTxn",
      type: "withdrawal",
      date: "2026-11-06",
      amountMinor: 700,
      fundId: fund.id,
    });
    expect((await call({ action: "deleteTxn", id: dep.body.txn.id })).status).toBe(409);
  });

  it("won't delete a fund that has history", async () => {
    const { call } = setup();
    const fund = await makeFund(call);
    await call({
      action: "addTxn",
      type: "deposit",
      date: "2026-11-05",
      amountMinor: 1,
      fundId: fund.id,
    });
    expect((await call({ action: "deleteFund", id: fund.id })).status).toBe(409);
  });

  it("keeps expected income out of the ledger until it is received", async () => {
    const { call } = setup();
    const fund = await makeFund(call, { name: "Laptop", group: "goal" });
    const exp = await call({
      action: "saveExpected",
      source: "Client balance",
      amountMinor: 60000,
      expectedDate: "2026-12-15",
      depositFundId: fund.id,
    });
    expect(exp.status).toBe(200);
    expect((await call({ action: "list" })).body.txns).toHaveLength(0);

    const got = await call({
      action: "receiveExpected",
      id: exp.body.expected.id,
      amountMinor: 55000,
      date: "2026-12-16",
      depositFundId: fund.id,
    });
    expect(got.status).toBe(200);
    const { txns, expected } = (await call({ action: "list" })).body;
    expect(txns.map((t) => [t.type, t.amountMinor])).toEqual([
      ["income", 55000],
      ["deposit", 55000],
    ]);
    expect(expected[0]).toMatchObject({ status: "received", receivedOn: "2026-12-16" });

    // Receiving twice would double count it.
    expect(
      (
        await call({
          action: "receiveExpected",
          id: exp.body.expected.id,
          amountMinor: 55000,
          date: "2026-12-16",
        })
      ).status,
    ).toBe(409);
    // And its transactions can't be deleted on their own.
    expect((await call({ action: "deleteTxn", id: txns[0].id })).status).toBe(409);
  });

  it("replaces the budget for a month that already has one", async () => {
    const { call } = setup();
    const lines = [{ id: "food", label: "Food", amountMinor: 1000 }];
    await call({ action: "saveBudget", month: "2026-11", netIncomeMinor: 5000, lines });
    await call({ action: "saveBudget", month: "2026-11", netIncomeMinor: 6000, lines });
    const { budgets } = (await call({ action: "list" })).body;
    expect(budgets).toHaveLength(1);
    expect(budgets[0].netIncomeMinor).toBe(6000);
  });

  it("refuses a budget line pointing at a missing fund", async () => {
    const { call } = setup();
    const res = await call({
      action: "saveBudget",
      month: "2026-11",
      netIncomeMinor: 5000,
      lines: [{ id: "x", label: "Save", amountMinor: 100, fundId: "missing" }],
    });
    expect(res.status).toBe(400);
  });
});
