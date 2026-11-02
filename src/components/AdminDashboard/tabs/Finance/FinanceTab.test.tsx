import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FinanceData, Fund, Txn } from "@/types/finance";
import { ConfirmProvider } from "../../ConfirmContext";
import { addMonths, currentMonth } from "@/utils/finance/ledger";
import { DateField, monthLabel } from "./ui";

const list = vi.fn();
const addTxn = vi.fn();
const setExpectedStatus = vi.fn();
const saveFund = vi.fn();
vi.mock("@/services/api/finance", () => ({
  financeApi: {
    list: () => list(),
    addTxn: (t: unknown) => addTxn(t),
    setExpectedStatus: (id: string, status: string) => setExpectedStatus(id, status),
    saveFund: (f: unknown) => saveFund(f),
  },
}));

const { default: FinanceTab } = await import("./FinanceTab");

const stamp = { scope: "me" as const, createdAt: "2026-01-01", updatedAt: "2026-01-01" };
const month = currentMonth();

function fund(id: string, name: string, group: Fund["group"], targetMinor = 0): Fund {
  return {
    ...stamp,
    id,
    kind: "fund",
    name,
    group,
    targetMinor,
    targetDate: "",
    monthlyMinor: 1000,
    institution: "",
    notes: "",
    archived: false,
    sort: 0,
    items: [],
  };
}
function txn(id: string, type: Txn["type"], amountMinor: number, fundId = ""): Txn {
  return {
    ...stamp,
    id,
    kind: "txn",
    type,
    date: `${month}-01`,
    amountMinor,
    fundId,
    toFundId: "",
    category: "",
    note: "",
  };
}

const data: FinanceData = {
  funds: [fund("w", "House Fund", "wealth"), fund("g", "New laptop", "goal", 100000)],
  txns: [
    txn("t1", "income", 50000),
    txn("t2", "deposit", 4000, "w"),
    txn("t3", "deposit", 30000, "g"),
  ],
  budgets: [],
  expected: [
    {
      ...stamp,
      id: "e1",
      kind: "expected",
      source: "Client balance",
      amountMinor: 70000,
      expectedDate: "",
      note: "",
      depositFundId: "g",
      status: "expected",
      receivedTxnIds: [],
    },
  ],
  version: '"v1"',
};

function renderTab() {
  return render(
    <ConfirmProvider>
      <FinanceTab theme="light" />
    </ConfirmProvider>,
  );
}

describe("FinanceTab", () => {
  beforeAll(() => {
    // Recharts' ResponsiveContainer needs it; jsdom has none.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  beforeEach(() => {
    list.mockReset().mockResolvedValue(data);
    addTxn.mockReset();
  });

  it("keeps wealth apart from money reserved for spending, and leaves expected money out", async () => {
    renderTab();
    const wealth = await screen.findByRole("region", { name: "Wealth being built" });
    expect(within(wealth).getByText("House Fund")).toBeInTheDocument();
    expect(within(wealth).queryByText("New laptop")).toBeNull();

    const reserved = screen.getByRole("region", { name: "Reserved for upcoming spending" });
    expect(within(reserved).getByText("New laptop")).toBeInTheDocument();
    // 300 saved of a 1,000 target; the 700 still expected is not added in.
    expect(within(reserved).getAllByText("GH₵ 300.00").length).toBeGreaterThan(0);
    expect(screen.getByRole("progressbar", { name: "New laptop progress" })).toHaveAttribute(
      "aria-valuenow",
      "30",
    );

    const cash = screen.getByText("Cash on hand").parentElement!;
    expect(within(cash).getByText("GH₵ 160.00")).toBeInTheDocument();
  });

  it("only asks for a budget when there isn't one for the month", async () => {
    const { unmount } = renderTab();
    expect(await screen.findByText("Set a budget to see the plan")).toBeInTheDocument();
    unmount();

    list.mockReset().mockResolvedValue({
      ...data,
      budgets: [
        {
          ...stamp,
          id: "b1",
          kind: "budget",
          month,
          netIncomeMinor: 100000,
          lines: [{ id: "l1", label: "Laptop", amountMinor: 5000, fundId: "g" }],
        },
      ],
    });
    renderTab();
    expect(await screen.findByText("Your budget saves nothing into wealth")).toBeInTheDocument();
    expect(screen.queryByText("Set a budget to see the plan")).toBeNull();
  });

  it("shows the server's refusal when a withdrawal is more than the fund holds", async () => {
    addTxn.mockRejectedValueOnce(new Error("New laptop only holds GH₵ 300.00."));
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Funds" }));
    await userEvent.click(screen.getByRole("button", { name: "Take out of New laptop" }));
    const form = screen.getByRole("form", { name: "Take money out: New laptop" });
    await userEvent.type(within(form).getByLabelText(/Amount/), "500");
    await userEvent.click(within(form).getByRole("button", { name: "Take out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("only holds GH₵ 300.00");
    expect(addTxn).toHaveBeenCalledWith(
      expect.objectContaining({ type: "withdrawal", amountMinor: 50000, fundId: "g" }),
    );
  });

  it("offers a fund with no history the money it already held, recorded as an opening balance", async () => {
    list
      .mockReset()
      .mockResolvedValue({ ...data, funds: [...data.funds, fund("r", "Rent", "rent")] });
    addTxn.mockResolvedValueOnce({ txn: txn("t9", "opening", 250000, "r") });
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Funds" }));
    // Only the fund with no history offers it; funds with money also offer Take out.
    expect(screen.getAllByRole("button", { name: /^Set what it already holds/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /^Take out/ })).toHaveLength(2);
    await userEvent.click(
      screen.getByRole("button", { name: "Set what it already holds for Rent" }),
    );
    await userEvent.type(screen.getByLabelText(/Amount/), "2500");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(addTxn).toHaveBeenCalledWith(
      expect.objectContaining({ type: "opening", amountMinor: 250000, fundId: "r" }),
    );
  });

  it("offers no way to pay for something straight from a wealth fund", async () => {
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Funds" }));
    const wealth = screen.getByRole("listitem", { name: "House Fund" });
    expect(within(wealth).getByRole("button", { name: /^Take out/ })).toBeInTheDocument();
    expect(within(wealth).queryByRole("button", { name: /^Pay for something/ })).toBeNull();
    const goal = screen.getByRole("listitem", { name: "New laptop" });
    expect(
      within(goal).getByRole("button", { name: "Pay for something from New laptop" }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Transactions" }));
    await userEvent.click(screen.getByRole("button", { name: "Record a transaction" }));
    const form = screen.getByRole("form", { name: "Record a transaction" });
    await userEvent.click(within(form).getByRole("combobox", { name: /^What happened/ }));
    await userEvent.click(screen.getByRole("option", { name: "Paid from a fund" }));
    expect(within(form).getByRole("combobox", { name: /^Fund/ })).toHaveAccessibleName(
      "Fund New laptop",
    );
    await userEvent.click(within(form).getByRole("combobox", { name: /^Fund/ }));
    expect(screen.queryByRole("option", { name: "House Fund" })).toBeNull();
  });

  it("says so when there are no funds to show", async () => {
    list.mockReset().mockResolvedValue({ ...data, funds: [], txns: [], expected: [] });
    const { unmount } = renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Funds" }));
    expect(screen.getByText(/^No funds yet/)).toBeInTheDocument();
    unmount();

    list.mockReset().mockResolvedValue({
      ...data,
      funds: [{ ...fund("old", "Old phone", "goal"), archived: true }],
      txns: [],
      expected: [],
    });
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Funds" }));
    expect(screen.getByText(/^Every fund is archived/)).toBeInTheDocument();
  });

  it("names each row's buttons after the row, and says whether a fund's history is open", async () => {
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Funds" }));
    // Each name starts with the visible text, for speech input.
    expect(screen.getByRole("button", { name: "Add money to House Fund" })).toHaveTextContent(
      /^Add money$/,
    );
    expect(screen.getByRole("button", { name: "Edit House Fund" })).toHaveTextContent(/^Edit$/);
    expect(screen.getByRole("button", { name: "Archive New laptop" })).toHaveTextContent(
      /^Archive$/,
    );
    const toggle = screen.getByRole("button", { name: "History of New laptop" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAccessibleName("Hide history of New laptop");
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toHaveAccessibleName(
      "New laptop history",
    );

    await userEvent.click(screen.getByRole("button", { name: "Expected" }));
    const row = screen.getByRole("listitem", { name: "Client balance" });
    expect(within(row).getByRole("button", { name: "Not coming: Client balance" })).toBeVisible();
  });

  it("marks a fund the plan only starts paying into later as not started", async () => {
    const later = addMonths(currentMonth(), 2);
    list.mockReset().mockResolvedValue({
      ...data,
      funds: [...data.funds, fund("r", "Next year's rent", "rent", 1200000)],
      budgets: [
        {
          ...stamp,
          id: "b1",
          kind: "budget",
          month: later,
          netIncomeMinor: 100000,
          lines: [{ id: "l1", label: "Rent", amountMinor: 100000, fundId: "r" }],
        },
      ],
    });
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Funds" }));
    const row = screen.getByRole("listitem", { name: "Next year's rent" });
    expect(within(row).getByText(`Starts ${monthLabel(later)}`)).toBeInTheDocument();
    // Funds with money in them don't get the label.
    const laptop = screen.getByRole("listitem", { name: "New laptop" });
    expect(within(laptop).queryByText(/^Starts/)).toBeNull();
  });

  it("shows spending by category against the plan, with fund payments kept apart", async () => {
    const month = currentMonth();
    list.mockReset().mockResolvedValue({
      ...data,
      txns: [
        ...data.txns,
        { ...txn("s1", "expense", 90000), category: "Food", note: "Market run" },
        { ...txn("s2", "expense", 5000), category: "Transport" },
        { ...txn("s3", "fund_spend", 20000, "g"), category: "New laptop" },
      ],
      budgets: [
        {
          ...stamp,
          id: "b1",
          kind: "budget",
          month,
          netIncomeMinor: 300000,
          lines: [
            { id: "l1", label: "Food", amountMinor: 80000, fundId: "" },
            { id: "l2", label: "Transport", amountMinor: 50000, fundId: "" },
          ],
        },
      ],
    });
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Spending" }));
    const where = screen.getByRole("region", { name: "Where it went" });
    expect(within(where).getByText("GH₵ 100.00 over")).toBeInTheDocument();
    expect(within(where).getByText("GH₵ 450.00 left")).toBeInTheDocument();
    // Living costs are 950; the 200 paid from the laptop fund is listed on its own.
    expect(screen.getAllByText("GH₵ 950.00").length).toBeGreaterThan(0);
    const fromFunds = screen.getByRole("region", { name: "Paid from savings" });
    expect(within(fromFunds).getByText("New laptop")).toBeInTheDocument();
    expect(within(fromFunds).getByText("GH₵ 200.00")).toBeInTheDocument();
    expect(within(where).queryByText("New laptop")).toBeNull();
    // A cost with a note leads with it; one without names its category once.
    const biggest = within(screen.getByRole("region", { name: "Biggest costs" })).getAllByRole(
      "listitem",
    );
    expect(biggest[0]).toHaveTextContent(`Market run · Food · ${month}-01`);
    expect(biggest[1]).toHaveTextContent(new RegExp(`^Transport · ${month}-01GH₵`));
  });

  it("files a payment from a fund under the fund's name, not a spending category", async () => {
    addTxn.mockResolvedValueOnce({ txn: txn("t9", "fund_spend", 10000, "g") });
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Transactions" }));
    await userEvent.click(screen.getByRole("button", { name: "Record a transaction" }));
    const form = screen.getByRole("form", { name: "Record a transaction" });
    await userEvent.click(within(form).getByRole("combobox", { name: /^What happened/ }));
    // A starting balance is only offered from Funds, on a fund with no history.
    expect(screen.queryByRole("option", { name: "Starting balance" })).toBeNull();
    await userEvent.click(screen.getByRole("option", { name: "Paid from a fund" }));
    expect(within(form).queryByRole("combobox", { name: /^Category/ })).toBeNull();
    await userEvent.click(within(form).getByRole("combobox", { name: /^Fund/ }));
    await userEvent.click(screen.getByRole("option", { name: "New laptop" }));
    await userEvent.type(within(form).getByLabelText(/Amount/), "100");
    await userEvent.click(within(form).getByRole("button", { name: "Record" }));
    expect(addTxn).toHaveBeenCalledWith(
      expect.objectContaining({ type: "fund_spend", fundId: "g", category: "New laptop" }),
    );
  });

  it("signs only what moves cash in the transactions list", async () => {
    list.mockReset().mockResolvedValue({
      ...data,
      funds: [...data.funds, fund("r", "Rent", "rent")],
      txns: [
        ...data.txns,
        txn("t4", "withdrawal", 1500, "g"),
        txn("t5", "fund_spend", 2000, "g"),
        txn("t6", "opening", 2500, "r"),
      ],
    });
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Transactions" }));
    const amountOf = (type: string) =>
      within(screen.getByRole("row", { name: new RegExp(type) })).getAllByRole("cell")[3];
    expect(amountOf("Money in")).toHaveTextContent(/^\+GH₵ 500\.00$/);
    expect(amountOf("Taken out of a fund")).toHaveTextContent(/^\+GH₵ 15\.00$/);
    expect(amountOf("Paid from a fund")).toHaveTextContent(/^GH₵ 20\.00Cash unchanged$/);
    expect(amountOf("Starting balance")).toHaveTextContent(/^GH₵ 25\.00Cash unchanged$/);
    expect(within(screen.getByRole("table")).getAllByText(/^−GH₵/)).toHaveLength(2);
  });

  it("starts fund selects empty when the saved fund is archived", async () => {
    const old = { ...fund("old", "Old phone", "goal"), archived: true };
    list.mockReset().mockResolvedValue({
      ...data,
      funds: [...data.funds, old],
      expected: [{ ...data.expected[0], depositFundId: "old" }],
      budgets: [
        {
          ...stamp,
          id: "b1",
          kind: "budget",
          month,
          netIncomeMinor: 100000,
          lines: [{ id: "l1", label: "Phone", amountMinor: 5000, fundId: "old" }],
        },
      ],
    });
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Expected" }));
    await userEvent.click(screen.getByRole("button", { name: "It arrived: Client balance" }));
    expect(screen.getByRole("combobox", { name: /^Put it/ })).toHaveAccessibleName(
      "Put it Keep as cash",
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit Client balance" }));
    expect(screen.getByRole("combobox", { name: /^When it arrives/ })).toHaveAccessibleName(
      "When it arrives Keep as cash",
    );

    await userEvent.click(screen.getByRole("button", { name: "Budget" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit this plan" }));
    expect(screen.getByRole("combobox", { name: /^Type/ })).toHaveAccessibleName(
      "Type Spending (no fund)",
    );
  });

  it("marks an action's button busy while its request runs, keeps focus on it and ignores presses", async () => {
    let finishStatus!: () => void;
    setExpectedStatus
      .mockReset()
      .mockReturnValueOnce(new Promise((resolve) => (finishStatus = () => resolve({}))));
    let finishArchive!: () => void;
    saveFund
      .mockReset()
      .mockReturnValueOnce(new Promise((resolve) => (finishArchive = () => resolve({}))));
    renderTab();

    await userEvent.click(await screen.findByRole("button", { name: "Expected" }));
    const notComing = screen.getByRole("button", { name: "Not coming: Client balance" });
    await userEvent.click(notComing);
    expect(notComing).toHaveAttribute("aria-disabled", "true");
    expect(notComing).toHaveFocus();
    expect(screen.getByRole("button", { name: "It arrived: Client balance" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await userEvent.click(notComing);
    finishStatus();
    await waitFor(() => expect(notComing).not.toHaveAttribute("aria-disabled"));
    expect(setExpectedStatus).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Funds" }));
    const archive = screen.getByRole("button", { name: "Archive House Fund" });
    await userEvent.click(archive);
    expect(archive).toHaveAttribute("aria-disabled", "true");
    await userEvent.keyboard("{Enter}");
    finishArchive();
    await waitFor(() => expect(archive).not.toHaveAttribute("aria-disabled"));
    expect(saveFund).toHaveBeenCalledTimes(1);
  });

  it("keeps focus on Refresh while it reloads and ignores repeat presses", async () => {
    renderTab();
    await screen.findByRole("region", { name: "Wealth being built" });
    let finish!: () => void;
    list.mockReturnValueOnce(new Promise((resolve) => (finish = () => resolve(data))));
    const refresh = screen.getByRole("button", { name: "Refresh" });
    await userEvent.click(refresh);
    expect(refresh).toHaveAttribute("aria-disabled", "true");
    expect(refresh).toHaveFocus();
    await userEvent.click(refresh);
    finish();
    await waitFor(() => expect(refresh).toHaveAttribute("aria-disabled", "false"));
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("names a required picker by its label, without the visual asterisk", () => {
    render(<DateField label="Paid on" value="" onChange={() => {}} required />);
    const name = screen.getByRole("button", { name: /^Paid on/ }).getAttribute("aria-labelledby")!;
    const label = document.getElementById(name.split(" ")[0])!;
    expect(label.textContent).toBe("Paid on (required)");
  });

  it("reads a date or month field's hint out with the field", async () => {
    render(<DateField label="Paid on" value="" onChange={() => {}} hint="The day it left." />);
    expect(screen.getByRole("button", { name: /^Paid on/ })).toHaveAccessibleDescription(
      "The day it left.",
    );

    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Budget" }));
    await userEvent.click(screen.getByRole("button", { name: "Create a plan" }));
    // The month button opens the picker; previous and next month have their own names.
    const monthButton = screen
      .getAllByRole("button", { name: /^Plan starts in/ })
      .find((b) => b.getAttribute("aria-haspopup") === "dialog");
    expect(monthButton).toHaveAccessibleDescription(/^It applies from this month/);
  });

  it("says so when the ledger can't load instead of showing zeros", async () => {
    list.mockReset().mockRejectedValue(new Error("Sign in to the dashboard and try again."));
    renderTab();
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign in to the dashboard");
    expect(screen.queryByText("Personal wealth")).toBeNull();
  });
});
