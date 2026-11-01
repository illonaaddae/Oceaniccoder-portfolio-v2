import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FinanceData, Fund, Txn } from "@/types/finance";
import { ConfirmProvider } from "../../ConfirmContext";
import { currentMonth } from "@/utils/finance/ledger";

const list = vi.fn();
const addTxn = vi.fn();
vi.mock("@/services/api/finance", () => ({
  financeApi: { list: () => list(), addTxn: (t: unknown) => addTxn(t) },
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

  it("shows the server's refusal when a withdrawal is more than the fund holds", async () => {
    addTxn.mockRejectedValueOnce(new Error("New laptop only holds GHS 300.00."));
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Funds" }));
    const card = screen.getAllByRole("button", { name: "Move money" })[1];
    await userEvent.click(card);
    await userEvent.selectOptions(screen.getByLabelText("What happened"), "withdrawal");
    await userEvent.type(screen.getByLabelText(/Amount/), "500");
    await userEvent.click(screen.getByRole("button", { name: "Record" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("only holds GHS 300.00");
    expect(addTxn).toHaveBeenCalledWith(
      expect.objectContaining({ type: "withdrawal", amountMinor: 50000, fundId: "g" }),
    );
  });

  it("says so when the ledger can't load instead of showing zeros", async () => {
    list.mockReset().mockRejectedValue(new Error("Sign in to the dashboard and try again."));
    renderTab();
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign in to the dashboard");
    expect(screen.queryByText("Personal wealth")).toBeNull();
  });
});
