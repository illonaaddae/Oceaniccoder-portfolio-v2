// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeFinanceRepo } = await import("../shared/finance/repo.js");

const NOW = new Date("2026-11-05T09:00:00.000Z");

/** `ticking` moves the clock on a second per request, so updatedAt differs per write. */
function setup({ admin = true, docs = [], ticking = false } = {}) {
  const repo = createFakeFinanceRepo(docs);
  let requests = 0;
  const handler = createHandler({
    requireAdmin: async () =>
      admin ? { user: { email: "owner@example.com" } } : { status: 401, error: "Sign in" },
    repo: () => repo,
    now: () => (ticking ? new Date(NOW.getTime() + 1000 * requests++) : NOW),
  });
  // Like a client that has just loaded: a write without its own `version`
  // carries the current one. Tests about stale screens pass theirs.
  const call = async (body) => {
    if (body.action !== "list" && !("version" in body))
      body = { ...body, version: (await repo.read()).version };
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

describe("staticwebapp.config.json", () => {
  // SWA matches a route exactly unless it ends in a wildcard, so a plain
  // "/api/finance" left "/api/finance/" and "/api/finance/x" open to anyone.
  it("keeps every /api/finance path behind the admin role", async () => {
    const { readFile } = await import("node:fs/promises");
    const config = JSON.parse(
      await readFile(new URL("../../public/staticwebapp.config.json", import.meta.url), "utf8"),
    );
    const adminOnly = (path) =>
      config.routes.some(
        (r) =>
          r.allowedRoles?.includes("admin") &&
          (r.route.endsWith("*") ? path.startsWith(r.route.slice(0, -1)) : path === r.route),
      );
    for (const path of ["/api/finance", "/api/finance/", "/api/finance/list"])
      expect(adminOnly(path)).toBe(true);
  });
});

describe("/api/finance", () => {
  it("refuses callers who aren't the admin and reads nothing", async () => {
    const { call, repo } = setup({ admin: false });
    const spy = vi.spyOn(repo, "read");
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
    expect(res.body.error).toContain("GH₵ 10.00");
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

  it("records overlapping receives of the same payment only once", async () => {
    const { call } = setup();
    const fund = await makeFund(call, { name: "Laptop", group: "goal" });
    const exp = await call({ action: "saveExpected", source: "Client", amountMinor: 5000 });
    const body = {
      action: "receiveExpected",
      id: exp.body.expected.id,
      amountMinor: 5000,
      date: "2026-12-01",
      depositFundId: fund.id,
    };
    const results = await Promise.all([call(body), call(body)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const { txns } = (await call({ action: "list" })).body;
    expect(txns).toHaveLength(2);
  });

  it("undoes a receive so a wrong amount can be corrected", async () => {
    const { call } = setup();
    const fund = await makeFund(call, { name: "Laptop", group: "goal" });
    const exp = await call({
      action: "saveExpected",
      source: "Client",
      amountMinor: 5000,
      depositFundId: fund.id,
    });
    const id = exp.body.expected.id;
    await call({
      action: "receiveExpected",
      id,
      amountMinor: 4000,
      date: "2026-12-01",
      depositFundId: fund.id,
      category: "Bonus",
    });
    let data = (await call({ action: "list" })).body;
    expect(data.expected[0]).toMatchObject({ status: "received", receivedMinor: 4000 });
    expect(data.txns.find((t) => t.type === "income").category).toBe("Bonus");

    expect((await call({ action: "unreceiveExpected", id })).status).toBe(200);
    data = (await call({ action: "list" })).body;
    expect(data.txns).toHaveLength(0);
    expect(data.expected[0]).toMatchObject({ status: "expected", receivedTxnIds: [] });
    expect(
      (await call({ action: "receiveExpected", id, amountMinor: 5000, date: "2026-12-02" })).status,
    ).toBe(200);
  });

  it("won't undo a receive whose deposit was already spent", async () => {
    const { call } = setup();
    const fund = await makeFund(call, { name: "Laptop", group: "goal" });
    const exp = await call({ action: "saveExpected", source: "Client", amountMinor: 5000 });
    await call({
      action: "receiveExpected",
      id: exp.body.expected.id,
      amountMinor: 5000,
      date: "2026-12-01",
      depositFundId: fund.id,
    });
    await call({
      action: "addTxn",
      type: "fund_spend",
      date: "2026-12-02",
      amountMinor: 5000,
      fundId: fund.id,
    });
    expect((await call({ action: "unreceiveExpected", id: exp.body.expected.id })).status).toBe(
      409,
    );
  });

  it("won't archive a fund that still holds money, or change the kind of a fund with history", async () => {
    const { call } = setup();
    const fund = await makeFund(call);
    await call({
      action: "addTxn",
      type: "deposit",
      date: "2026-11-05",
      amountMinor: 100,
      fundId: fund.id,
    });
    const archive = await call({
      action: "saveFund",
      id: fund.id,
      name: "Savings",
      group: "wealth",
      archived: true,
    });
    expect(archive.status).toBe(409);
    const regroup = await call({ action: "saveFund", id: fund.id, name: "Savings", group: "goal" });
    expect(regroup.status).toBe(409);
    expect(
      (await call({ action: "saveFund", id: fund.id, name: "Renamed", group: "wealth" })).status,
    ).toBe(200);
  });

  it("refuses a write when the ledger changed after it was read, and writes nothing", async () => {
    const { call, repo } = setup();
    const fund = await makeFund(call);
    await call({
      action: "addTxn",
      type: "deposit",
      date: "2026-11-05",
      amountMinor: 1000,
      fundId: fund.id,
    });
    const withdraw = {
      action: "addTxn",
      type: "withdrawal",
      date: "2026-11-06",
      amountMinor: 1000,
      fundId: fund.id,
    };
    // Another withdrawal lands between this request's read and its write, so
    // the balance it checked against is gone.
    const read = repo.read.bind(repo);
    vi.spyOn(repo, "read").mockImplementationOnce(async () => {
      const snapshot = await read();
      expect((await call(withdraw)).status).toBe(200);
      return snapshot;
    });
    const { version } = (await call({ action: "list" })).body;
    const res = await call({ ...withdraw, version });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain("Refresh");
    const { txns } = (await call({ action: "list" })).body;
    expect(txns.filter((t) => t.type === "withdrawal")).toHaveLength(1);
  });

  it("refuses a write from a screen loaded before another write, and writes nothing", async () => {
    const { call, repo } = setup();
    const fund = await makeFund(call);
    const first = (await call({ action: "list" })).body;
    const second = (await call({ action: "list" })).body;
    expect(second.version).toBe(first.version);
    expect(typeof first.version).toBe("string");

    const deposit = {
      action: "addTxn",
      type: "deposit",
      date: "2026-11-05",
      amountMinor: 1000,
      fundId: fund.id,
    };
    expect((await call({ ...deposit, version: first.version })).status).toBe(200);
    const before = repo.docs.size;
    const stale = await call({ ...deposit, version: second.version });
    expect(stale.status).toBe(409);
    expect(stale.body.error).toBe(
      "Something changed since this loaded. Refresh to see the latest.",
    );
    expect(repo.docs.size).toBe(before);

    const fresh = (await call({ action: "list" })).body;
    expect(fresh.version).not.toBe(first.version);
    expect((await call({ ...deposit, version: fresh.version })).status).toBe(200);
  });

  it("won't let a fund edit from a stale screen put back an older field", async () => {
    const { call } = setup();
    const fund = await makeFund(call, { targetMinor: 50000 });
    const stale = (await call({ action: "list" })).body;
    // Another screen renames the fund.
    expect((await call({ action: "saveFund", ...fund, name: "House deposit" })).status).toBe(200);
    // The stale screen still holds the old name and sends it with a new target.
    const res = await call({
      action: "saveFund",
      ...stale.funds[0],
      targetMinor: 90000,
      version: stale.version,
    });
    expect(res.status).toBe(409);
    const [saved] = (await call({ action: "list" })).body.funds;
    expect(saved).toMatchObject({ name: "House deposit", targetMinor: 50000 });
  });

  it("refuses a write whose ledger version is not valid", async () => {
    const { call, repo } = setup();
    const res = await call({ action: "saveFund", name: "Savings", group: "wealth", version: 7 });
    expect(res.status).toBe(400);
    expect(repo.docs.size).toBe(0);
  });

  it("won't delete a transaction or undo a receive that touches an archived fund", async () => {
    const { call, repo } = setup();
    const fund = await makeFund(call, { name: "Laptop", group: "goal" });
    const exp = await call({ action: "saveExpected", source: "Client", amountMinor: 5000 });
    await call({
      action: "receiveExpected",
      id: exp.body.expected.id,
      amountMinor: 5000,
      date: "2026-12-01",
      depositFundId: fund.id,
    });
    const spend = await call({
      action: "addTxn",
      type: "fund_spend",
      date: "2026-12-02",
      amountMinor: 5000,
      fundId: fund.id,
    });
    const archive = { action: "saveFund", id: fund.id, name: "Laptop", group: "goal" };
    expect((await call({ ...archive, archived: true })).status).toBe(200);
    const before = repo.docs.size;

    const del = await call({ action: "deleteTxn", id: spend.body.txn.id });
    expect(del.status).toBe(409);
    expect(del.body.error).toBe("Laptop is archived. Restore it first.");
    const undo = await call({ action: "unreceiveExpected", id: exp.body.expected.id });
    expect(undo.status).toBe(409);
    expect(undo.body.error).toContain("Restore it first");
    expect(repo.docs.size).toBe(before);
  });

  it("won't pay for something straight from a wealth fund, but lets money out to cash or another fund", async () => {
    const { call, repo } = setup();
    const wealth = await makeFund(call, { name: "House Fund" });
    const goal = await makeFund(call, { name: "Laptop", group: "goal" });
    const move = (type, fields = {}) =>
      call({
        action: "addTxn",
        type,
        date: "2026-11-05",
        amountMinor: 100,
        fundId: wealth.id,
        ...fields,
      });
    expect((await move("deposit", { amountMinor: 1000 })).status).toBe(200);
    const before = repo.docs.size;
    const spend = await move("fund_spend");
    expect(spend.status).toBe(409);
    expect(spend.body.error).toBe(
      "House Fund is personal wealth, which isn't spent from directly. Take the money out to cash first.",
    );
    expect(repo.docs.size).toBe(before);
    expect((await move("withdrawal")).status).toBe(200);
    expect((await move("transfer", { toFundId: goal.id })).status).toBe(200);
  });

  it("only takes a starting balance for a fund with no history", async () => {
    const { call } = setup();
    const fund = await makeFund(call);
    const opening = {
      action: "addTxn",
      type: "opening",
      date: "2026-11-01",
      amountMinor: 500,
      fundId: fund.id,
    };
    expect((await call(opening)).status).toBe(200);
    const again = await call(opening);
    expect(again.status).toBe(409);
    expect(again.body.error).toContain("already has history");
    expect((await call({ action: "list" })).body.txns).toHaveLength(1);
  });

  it("only checks the funds a delete touches", async () => {
    const neg = {
      id: "neg",
      scope: "me",
      kind: "txn",
      type: "withdrawal",
      date: "2026-11-01",
      amountMinor: 50,
      fundId: "f-bad",
      toFundId: "",
      category: "",
      note: "",
    };
    const spend = {
      id: "spend",
      scope: "me",
      kind: "txn",
      type: "expense",
      date: "2026-11-02",
      amountMinor: 10,
      fundId: "",
      toFundId: "",
      category: "Food",
      note: "",
    };
    const { call } = setup({ docs: [neg, spend] });
    expect((await call({ action: "deleteTxn", id: "spend" })).status).toBe(200);
  });
  it("refuses an edit of a record that changed since its form opened, and keeps the newer value", async () => {
    const { call } = setup({ ticking: true });
    const fund = await makeFund(call, { targetMinor: 50000 });
    // Tab B opens the edit form; tab A then renames the fund.
    const opened = fund.updatedAt;
    expect((await call({ action: "saveFund", ...fund, name: "House deposit" })).status).toBe(200);
    // Tab B refreshed, so its version is current, but its form holds old values.
    const res = await call({
      action: "saveFund",
      ...fund,
      targetMinor: 90000,
      expectedUpdatedAt: opened,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("This changed since you opened it. Cancel and open it again.");
    const [saved] = (await call({ action: "list" })).body.funds;
    expect(saved).toMatchObject({ name: "House deposit", targetMinor: 50000 });
  });

  it("lets an edit save after unrelated writes when its record hasn't changed", async () => {
    const { call } = setup({ ticking: true });
    const fund = await makeFund(call);
    const other = await makeFund(call, { name: "Rent", group: "rent" });
    const lines = [{ id: "food", label: "Food", amountMinor: 1000 }];
    const plan = (
      await call({ action: "saveBudget", month: "2026-11", netIncomeMinor: 5000, lines })
    ).body.budget;
    const income = (await call({ action: "saveExpected", source: "Client", amountMinor: 7000 }))
      .body.expected;
    // Something else in the ledger changes after every form opened.
    expect((await call({ action: "saveFund", ...other, name: "Rent pot" })).status).toBe(200);

    const edits = [
      { action: "saveFund", ...fund, name: "Savings pot", expectedUpdatedAt: fund.updatedAt },
      {
        action: "saveBudget",
        month: "2026-11",
        netIncomeMinor: 6000,
        lines,
        expectedUpdatedAt: plan.updatedAt,
      },
      {
        action: "saveExpected",
        id: income.id,
        source: "Client",
        amountMinor: 8000,
        expectedUpdatedAt: income.updatedAt,
      },
    ];
    for (const edit of edits) expect((await call(edit)).status).toBe(200);
  });

  it("refuses expected-income and budget edits whose record changed or went", async () => {
    const { call } = setup({ ticking: true });
    const lines = [{ id: "food", label: "Food", amountMinor: 1000 }];
    const budget = { action: "saveBudget", month: "2026-11", netIncomeMinor: 5000, lines };
    const plan = (await call(budget)).body.budget;
    expect((await call({ ...budget, netIncomeMinor: 5500 })).status).toBe(200);
    const stalePlan = await call({
      ...budget,
      netIncomeMinor: 6000,
      expectedUpdatedAt: plan.updatedAt,
    });
    expect(stalePlan.status).toBe(409);
    const [kept] = (await call({ action: "list" })).body.budgets;
    expect(kept.netIncomeMinor).toBe(5500);
    // Deleted meanwhile: the save is refused rather than creating the plan again.
    expect((await call({ action: "deleteBudget", id: plan.id })).status).toBe(200);
    expect((await call({ ...budget, expectedUpdatedAt: kept.updatedAt })).status).toBe(409);
    expect((await call({ action: "list" })).body.budgets).toHaveLength(0);

    const item = { action: "saveExpected", source: "Client", amountMinor: 7000 };
    const income = (await call(item)).body.expected;
    expect(
      (await call({ action: "setExpectedStatus", id: income.id, status: "cancelled" })).status,
    ).toBe(200);
    const staleIncome = await call({
      ...item,
      id: income.id,
      amountMinor: 9000,
      expectedUpdatedAt: income.updatedAt,
    });
    expect(staleIncome.status).toBe(409);
    expect(staleIncome.body.error).toContain("changed since you opened it");
  });

  it("moves a fund's updatedAt on archive and restore, so an open edit form is refused", async () => {
    const { call } = setup({ ticking: true });
    const fund = await makeFund(call);
    const archived = (await call({ action: "saveFund", ...fund, archived: true })).body.fund;
    expect(archived.updatedAt).not.toBe(fund.updatedAt);
    const restored = (await call({ action: "saveFund", ...archived, archived: false })).body.fund;
    expect(restored.updatedAt).not.toBe(archived.updatedAt);
    const res = await call({ action: "saveFund", ...fund, expectedUpdatedAt: fund.updatedAt });
    expect(res.status).toBe(409);
  });

  it("rejects an opened-on time that isn't short text, and writes nothing", async () => {
    const { call, repo } = setup();
    const fund = await makeFund(call);
    const before = (await repo.read()).version;
    for (const expectedUpdatedAt of [7, "", "x".repeat(41), {}]) {
      const res = await call({ action: "saveFund", ...fund, name: "New", expectedUpdatedAt });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Cancel and open it again");
    }
    expect((await repo.read()).version).toBe(before);
  });

  it("never blocks a create because of writes elsewhere in the ledger", async () => {
    const { call } = setup({ ticking: true });
    await makeFund(call);
    await call({
      action: "saveFund",
      ...(await makeFund(call, { name: "Rent" })),
      name: "Rent pot",
    });
    expect((await call({ action: "saveFund", name: "Car", group: "goal" })).status).toBe(200);
    expect((await call({ action: "saveExpected", source: "Bonus", amountMinor: 100 })).status).toBe(
      200,
    );
    const lines = [{ id: "food", label: "Food", amountMinor: 1000 }];
    expect(
      (await call({ action: "saveBudget", month: "2026-12", netIncomeMinor: 5000, lines })).status,
    ).toBe(200);
  });
});
