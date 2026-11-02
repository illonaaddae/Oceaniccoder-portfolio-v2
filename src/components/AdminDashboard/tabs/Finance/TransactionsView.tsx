import { useMemo, useState } from "react";
import type { Txn, TxnType } from "@/types/finance";
import { financeApi } from "@/services/api/finance";
import { activeBudget, currentMonth, monthOf, today } from "@/utils/finance/ledger";
import { useConfirm } from "../../ConfirmContext";
import type { FinanceState } from "./useFinance";
import {
  Button,
  Card,
  FormError,
  MoneyField,
  Select,
  TextField,
  MonthField,
  DateField,
  cedis,
  inputToMinor,
  monthLabel,
  muted,
  strong,
} from "./ui";

export const TYPE_LABELS: Record<TxnType, string> = {
  income: "Money in",
  expense: "Spending",
  deposit: "Saved into a fund",
  withdrawal: "Taken out of a fund",
  transfer: "Moved between funds",
  fund_spend: "Paid from a fund",
  opening: "Starting balance",
};

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Bonus",
  "Allowance",
  "Family",
  "Gift",
  "Other",
];
// A starting balance is set from Funds, only on a fund with no history yet.
const FORM_TYPES = (Object.keys(TYPE_LABELS) as TxnType[]).filter((t) => t !== "opening");
const NEEDS_FUND = new Set<TxnType>(["deposit", "withdrawal", "transfer", "fund_spend"]);
// Money paid from a fund is not a living cost, so it takes no spending
// category; it is filed under the fund's name, as the Funds view does.
const HAS_CATEGORY = new Set<TxnType>(["income", "expense"]);

export function TxnForm({ state, onDone }: { state: FinanceState; onDone: () => void }) {
  const funds = state.activeFunds;
  const budget = activeBudget(state.data.budgets, currentMonth());
  const spendCategories = [
    ...new Set([...(budget?.lines.filter((l) => !l.fundId).map((l) => l.label) ?? []), "Other"]),
  ];
  const [type, setType] = useState<TxnType>("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [fundId, setFundId] = useState(funds[0]?.id ?? "");
  const [toFundId, setToFundId] = useState(funds[1]?.id ?? "");
  const [category, setCategory] = useState(spendCategories[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = type === "income" ? INCOME_CATEGORIES : spendCategories;
  // Wealth is never spent from directly, so a payment can't come from it.
  const spendable = funds.filter((f) => f.group !== "wealth");
  const fromFunds = type === "fund_spend" ? spendable : funds;
  const fundOptions = fromFunds.map((f) => ({ value: f.id, label: f.name }));
  const toFundOptions = funds.map((f) => ({ value: f.id, label: f.name }));

  function changeType(next: TxnType) {
    setType(next);
    setCategory(next === "income" ? INCOME_CATEGORIES[0] : spendCategories[0]);
    if (next === "fund_spend" && !spendable.some((f) => f.id === fundId))
      setFundId(spendable[0]?.id ?? "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountMinor = inputToMinor(amount);
    if (amountMinor === null) return setError("Amounts must be numbers like 300 or 1,250.50.");
    if (!amountMinor) return setError("Enter an amount more than zero.");
    if (type === "fund_spend" && !fundId)
      return setError(
        "Only rent, goal and emergency funds pay for things. Create one under Funds.",
      );
    if (NEEDS_FUND.has(type) && !fundId) return setError("Create a fund first, under Funds.");
    setSaving(true);
    setError(null);
    try {
      await state.mutate((version) =>
        financeApi.addTxn(
          {
            type,
            date,
            amountMinor,
            fundId: NEEDS_FUND.has(type) ? fundId : "",
            toFundId: type === "transfer" ? toFundId : "",
            category: HAS_CATEGORY.has(type)
              ? category
              : type === "fund_spend"
                ? (funds.find((f) => f.id === fundId)?.name ?? "")
                : "",
            note: note.trim(),
          },
          version,
        ),
      );
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record that.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" aria-label="Record a transaction">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="What happened"
          value={type}
          options={FORM_TYPES.map((t) => ({
            value: t,
            label: TYPE_LABELS[t],
          }))}
          onChange={changeType}
        />
        <MoneyField label="Amount (GH₵)" value={amount} onChange={setAmount} required />
        <DateField label="Date" value={date} onChange={setDate} required />
        {NEEDS_FUND.has(type) && (
          <Select
            label={type === "transfer" ? "From fund" : "Fund"}
            value={fundId}
            options={fundOptions}
            onChange={setFundId}
          />
        )}
        {type === "transfer" && (
          <Select label="To fund" value={toFundId} options={toFundOptions} onChange={setToFundId} />
        )}
        {HAS_CATEGORY.has(type) && (
          <Select
            label="Category"
            value={category}
            options={categories.map((c) => ({ value: c, label: c }))}
            onChange={setCategory}
          />
        )}
        <TextField label="Note" value={note} onChange={setNote} maxLength={200} />
      </div>
      {type === "income" && (
        <p className="text-xs" style={muted}>
          Only record money that has arrived. Money you're still waiting for goes under Expected.
        </p>
      )}
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Record"}
        </Button>
        <Button onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function describe(t: Txn, fundName: (id: string) => string): string {
  if (t.type === "transfer") return `${fundName(t.fundId)} → ${fundName(t.toFundId)}`;
  if (t.fundId) return fundName(t.fundId);
  return t.category || "";
}

const MONEY_IN = new Set<TxnType>(["income", "withdrawal", "opening"]);

export function TransactionsView({ state }: { state: FinanceState }) {
  const [adding, setAdding] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  // The transaction whose delete is running, so its button can't send it twice.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const confirm = useConfirm();
  const fundName = (id: string) =>
    state.data.funds.find((f) => f.id === id)?.name ?? "Deleted fund";

  const rows = useMemo(
    () =>
      state.data.txns
        .filter((t) => monthOf(t.date) === month)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [month, state.data.txns],
  );

  async function remove(t: Txn) {
    const ok = await confirm({
      message: `Delete this ${TYPE_LABELS[t.type].toLowerCase()} of ${cedis(t.amountMinor)}?`,
      description: "Fund balances are worked out again without it.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setDeletingId(t.id);
    try {
      await state.mutate((version) => financeApi.deleteTxn(t.id, version));
    } catch (err) {
      state.report(err, "Couldn't delete it.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-60">
          <MonthField label="Month" value={month} onChange={(v) => v && setMonth(v)} />
        </div>
        {!adding && (
          <Button variant="primary" onClick={() => setAdding(true)}>
            Record a transaction
          </Button>
        )}
      </div>
      {adding && (
        <Card title="Record a transaction">
          <TxnForm state={state} onDone={() => setAdding(false)} />
        </Card>
      )}
      <Card title={monthLabel(month)}>
        {rows.length === 0 ? (
          <p className="text-sm" style={muted}>
            Nothing recorded in {monthLabel(month)}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Transactions in {monthLabel(month)}</caption>
              <thead>
                <tr style={muted}>
                  <th scope="col" className="py-2 text-left font-semibold">
                    Date
                  </th>
                  <th scope="col" className="py-2 text-left font-semibold">
                    What
                  </th>
                  <th scope="col" className="py-2 text-left font-semibold">
                    Details
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Amount
                  </th>
                  <th scope="col" className="py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <td className="py-2 tabular-nums whitespace-nowrap" style={muted}>
                      {t.date}
                    </td>
                    <td className="py-2" style={strong}>
                      {TYPE_LABELS[t.type]}
                    </td>
                    <td className="py-2" style={muted}>
                      {describe(t, fundName)}
                      {t.note && <span className="block text-xs">{t.note}</span>}
                    </td>
                    <td
                      className="py-2 text-right tabular-nums font-semibold whitespace-nowrap"
                      style={strong}
                    >
                      {t.type === "transfer" ? "" : MONEY_IN.has(t.type) ? "+" : "−"}
                      {cedis(t.amountMinor)}
                    </td>
                    <td className="py-2 pl-2 text-right">
                      <Button
                        variant="danger"
                        label={`Delete ${TYPE_LABELS[t.type]} of ${cedis(t.amountMinor)} on ${t.date}`}
                        onClick={() => void remove(t)}
                        disabled={deletingId === t.id}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
