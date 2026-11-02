import { useState } from "react";
import type { Budget, BudgetLine } from "@/types/finance";
import { financeApi } from "@/services/api/finance";
import { activeBudget, addMonths, currentMonth, lineActual } from "@/utils/finance/ledger";
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
  cedis,
  inputToMinor,
  minorToInput,
  monthLabel,
  muted,
  strong,
} from "./ui";

interface LineDraft {
  id: string;
  label: string;
  amount: string;
  fundId: string;
}

const newLineId = () => `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function BudgetEditor({
  base,
  state,
  onDone,
}: {
  base: Budget | null;
  state: FinanceState;
  onDone: () => void;
}) {
  const [month, setMonth] = useState(base ? base.month : currentMonth());
  const [net, setNet] = useState(minorToInput(base?.netIncomeMinor ?? 0));
  const [lines, setLines] = useState<LineDraft[]>(
    (base?.lines ?? []).map((l) => ({
      ...l,
      fundId: state.selectableFundId(l.fundId),
      amount: minorToInput(l.amountMinor),
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fundOptions = [
    { value: "", label: "Spending (no fund)" },
    ...state.activeFunds.map((f) => ({ value: f.id, label: `Save into ${f.name}` })),
  ];
  const parsed = lines.map((l) => inputToMinor(l.amount));
  const netMinor = inputToMinor(net);
  const allocated = parsed.reduce<number>((acc, v) => acc + (v ?? 0), 0);
  const left = (netMinor ?? 0) - allocated;

  const setLine = (id: string, patch: Partial<LineDraft>) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (netMinor === null || parsed.some((v) => v === null))
      return setError("Amounts must be numbers like 800 or 1,200.50.");
    if (lines.some((l) => !l.label.trim())) return setError("Every line needs a name.");
    const out: BudgetLine[] = lines.map((l, i) => ({
      id: l.id,
      label: l.label.trim(),
      amountMinor: parsed[i] ?? 0,
      fundId: l.fundId,
    }));
    setSaving(true);
    setError(null);
    try {
      await state.mutate((version) =>
        financeApi.saveBudget({ month, netIncomeMinor: netMinor, lines: out }, version),
      );
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the plan.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Edit monthly plan">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MonthField
          label="Plan starts in"
          value={month}
          onChange={setMonth}
          hint="It applies from this month until a later plan starts. Saving the same month replaces it."
        />
        <MoneyField label="Take-home pay (GH₵)" value={net} onChange={setNet} required />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold" style={muted}>
          Where it goes
        </legend>
        {lines.map((l, i) => (
          <div
            key={l.id}
            className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[2fr_1fr_2fr_auto]"
          >
            <TextField
              label={`Line ${i + 1}`}
              value={l.label}
              onChange={(v) => setLine(l.id, { label: v })}
              maxLength={60}
            />
            <MoneyField
              label="Amount"
              value={l.amount}
              onChange={(v) => setLine(l.id, { amount: v })}
            />
            <Select
              label="Type"
              value={l.fundId}
              options={fundOptions}
              onChange={(v) => setLine(l.id, { fundId: v })}
            />
            <Button
              variant="danger"
              label={`Remove ${l.label || `line ${i + 1}`}`}
              onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          onClick={() =>
            setLines((ls) => [...ls, { id: newLineId(), label: "", amount: "", fundId: "" }])
          }
        >
          Add line
        </Button>
      </fieldset>
      <p
        className="text-sm font-semibold"
        style={left === 0 ? strong : { color: "var(--status-pending-text)" }}
        aria-live="polite"
      >
        {left === 0
          ? "Every cedi has a job."
          : left > 0
            ? `${cedis(left)} not given a job yet.`
            : `${cedis(-left)} more than your take-home pay.`}
      </p>
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save plan"}
        </Button>
        <Button onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export function BudgetView({ state }: { state: FinanceState }) {
  const [month, setMonth] = useState(currentMonth());
  const [editing, setEditing] = useState<"no" | "this" | "new">("no");
  const confirm = useConfirm();
  const budget = activeBudget(state.data.budgets, month);
  const fundName = (id: string) => state.data.funds.find((f) => f.id === id)?.name ?? "fund";

  if (editing !== "no")
    return (
      <Card title={editing === "new" ? "New plan" : "Edit plan"}>
        <BudgetEditor
          base={editing === "new" && budget ? { ...budget, month: addMonths(month, 1) } : budget}
          state={state}
          onDone={() => setEditing("no")}
        />
      </Card>
    );

  const rows = budget
    ? budget.lines.map((l) => ({ line: l, actual: lineActual(l, state.data.txns, month) }))
    : [];
  const plannedTotal = rows.reduce((acc, r) => acc + r.line.amountMinor, 0);
  const plans = [...state.data.budgets].sort((a, b) => a.month.localeCompare(b.month));

  async function deletePlan(plan: Budget) {
    const ok = await confirm({
      message: `Delete the plan from ${monthLabel(plan.month)}?`,
      description:
        "Months it covered fall back to the plan before it. Transactions are not affected.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await state.mutate((version) => financeApi.deleteBudget(plan.id, version));
    } catch (err) {
      state.report(err, "Couldn't delete the plan.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-60">
          <MonthField label="Month" value={month} onChange={(v) => v && setMonth(v)} />
        </div>
        <Button variant="primary" onClick={() => setEditing(budget ? "this" : "new")}>
          {budget ? "Edit this plan" : "Create a plan"}
        </Button>
        {budget && (
          <Button onClick={() => setEditing("new")}>Start a new plan from the month after</Button>
        )}
      </div>

      {!budget ? (
        <Card>
          <p className="text-sm" style={muted}>
            No plan covers {monthLabel(month)}. Create one to compare what you planned with what
            happened.
          </p>
        </Card>
      ) : (
        <Card title={`${monthLabel(month)} · plan from ${monthLabel(budget.month)}`}>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Planned and actual amounts for {monthLabel(month)}
              </caption>
              <thead>
                <tr style={muted}>
                  <th scope="col" className="py-2 text-left font-semibold">
                    Line
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Planned
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Actual
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Left
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ line, actual }) => {
                  const remaining = line.amountMinor - actual;
                  const over = line.fundId ? false : remaining < 0;
                  return (
                    <tr
                      key={line.id}
                      className="border-t"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      <th scope="row" className="py-2 text-left font-medium" style={strong}>
                        {line.label}
                        <span className="block text-xs font-normal" style={muted}>
                          {line.fundId ? `Saving into ${fundName(line.fundId)}` : "Spending"}
                        </span>
                      </th>
                      <td className="py-2 text-right tabular-nums" style={strong}>
                        {cedis(line.amountMinor)}
                      </td>
                      <td className="py-2 text-right tabular-nums" style={strong}>
                        {cedis(actual)}
                      </td>
                      <td
                        className="py-2 text-right tabular-nums"
                        style={
                          over ? { color: "var(--status-failed-text)", fontWeight: 600 } : muted
                        }
                      >
                        {line.fundId
                          ? remaining > 0
                            ? `${cedis(remaining)} to save`
                            : "Done"
                          : over
                            ? `${cedis(-remaining)} over`
                            : cedis(remaining)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                  <th scope="row" className="py-2 text-left" style={strong}>
                    Take-home pay
                  </th>
                  <td className="py-2 text-right tabular-nums font-bold" style={strong}>
                    {cedis(budget.netIncomeMinor)}
                  </td>
                  <td colSpan={2} className="py-2 text-right text-xs" style={muted}>
                    {plannedTotal === budget.netIncomeMinor
                      ? "Plan adds up"
                      : plannedTotal < budget.netIncomeMinor
                        ? `${cedis(budget.netIncomeMinor - plannedTotal)} unplanned`
                        : `Plan is ${cedis(plannedTotal - budget.netIncomeMinor)} over pay`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-3 text-xs" style={muted}>
            Spending lines count expenses recorded under the same category name, as Spending does;
            money paid from a fund is not counted. Saving lines count money put into their fund.
          </p>
        </Card>
      )}

      {plans.length > 0 && (
        <Card title="All plans">
          <ul className="space-y-1 text-sm">
            {plans.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <span style={strong}>From {monthLabel(p.month)}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums" style={muted}>
                    {cedis(p.netIncomeMinor)}
                  </span>
                  <Button
                    variant="danger"
                    label={`Delete the plan from ${monthLabel(p.month)}`}
                    onClick={() => void deletePlan(p)}
                  >
                    Delete
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
