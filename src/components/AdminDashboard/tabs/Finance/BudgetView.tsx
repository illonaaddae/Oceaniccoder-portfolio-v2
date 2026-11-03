import { useRef, useState } from "react";
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
  focusField,
  inputToMinor,
  minorToInput,
  monthLabel,
  muted,
  strong,
  useFocusAfterRender,
  useFocusFirstField,
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
  // Every stored plan as this editor opened, by month. Saving to any month
  // (the one it opened on, a new one, or a changed "Plan starts in") then
  // tells the server what it expects there, so a plan another screen saved
  // for that month since is never overwritten.
  const [openedPlans] = useState(
    () => new Map(state.data.budgets.map((b) => [b.month, b.updatedAt])),
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

  const formRef = useFocusFirstField<HTMLFormElement>();
  const focusLater = useFocusAfterRender();
  const addLineRef = useRef<HTMLButtonElement>(null);
  const field = (name: string) => () => {
    const el = formRef.current?.elements.namedItem(name);
    return el instanceof HTMLElement ? el : null;
  };
  /** Shows a refusal and moves focus to the field it is about. */
  const refuse = (message: string, name: string) => {
    setError(message);
    focusField(formRef.current, name);
  };

  const setLine = (id: string, patch: Partial<LineDraft>) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  function addLine() {
    const id = newLineId();
    setLines((ls) => [...ls, { id, label: "", amount: "", fundId: "" }]);
    focusLater(field(`line-${id}-label`));
  }

  /** Removes a line; focus goes to the next line, else the one before, else Add line. */
  function removeLine(index: number) {
    const next = lines[index + 1] ?? lines[index - 1];
    setLines((ls) => ls.filter((_, i) => i !== index));
    focusLater(next ? field(`line-${next.id}-label`) : () => addLineRef.current);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const badAmount = parsed.findIndex((v) => v === null);
    if (netMinor === null || badAmount !== -1)
      return refuse(
        "Amounts must be numbers like 800 or 1,200.50.",
        netMinor === null ? "net" : `line-${lines[badAmount].id}-amount`,
      );
    const unnamed = lines.find((l) => !l.label.trim());
    if (unnamed) return refuse("Every line needs a name.", `line-${unnamed.id}-label`);
    const out: BudgetLine[] = lines.map((l, i) => ({
      id: l.id,
      label: l.label.trim(),
      amountMinor: parsed[i] ?? 0,
      fundId: l.fundId,
    }));
    setSaving(true);
    setError(null);
    try {
      const openedUpdatedAt = openedPlans.get(month);
      const expect = openedUpdatedAt
        ? { expectedUpdatedAt: openedUpdatedAt }
        : { expectNew: true as const };
      await state.mutate((version) =>
        financeApi.saveBudget({ month, netIncomeMinor: netMinor, lines: out, ...expect }, version),
      );
      state.announce(`Saved the plan from ${monthLabel(month)}`);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the plan.");
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4" aria-label="Edit monthly plan">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MonthField
          label="Plan starts in"
          value={month}
          onChange={setMonth}
          hint="It applies from this month until a later plan starts. Saving the same month replaces it."
        />
        <MoneyField label="Take-home pay (GH₵)" name="net" value={net} onChange={setNet} required />
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
              name={`line-${l.id}-label`}
              value={l.label}
              onChange={(v) => setLine(l.id, { label: v })}
              maxLength={60}
            />
            <MoneyField
              label="Amount"
              name={`line-${l.id}-amount`}
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
              onClick={() => removeLine(i)}
            >
              ×
            </Button>
          </div>
        ))}
        <Button ref={addLineRef} onClick={addLine}>
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
  const openers = useRef<Partial<Record<"this" | "new", HTMLButtonElement | null>>>({});
  const focusLater = useFocusAfterRender();
  /** Closes the editor and puts focus back on the button that opened it. */
  const closeEditor = (opened: "this" | "new") => {
    setEditing("no");
    focusLater(() => openers.current[opened] ?? openers.current.this);
  };
  const budget = activeBudget(state.data.budgets, month);
  const fundName = (id: string) => state.data.funds.find((f) => f.id === id)?.name ?? "fund";

  if (editing !== "no")
    return (
      <Card title={editing === "new" ? "New plan" : "Edit plan"}>
        <BudgetEditor
          base={editing === "new" && budget ? { ...budget, month: addMonths(month, 1) } : budget}
          state={state}
          onDone={() => closeEditor(editing)}
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
      await state.mutate((version) => financeApi.deleteBudget(plan.id, version), {
        row: document.getElementById(`plan-${plan.id}`),
      });
      state.announce(`Deleted the plan from ${monthLabel(plan.month)}`);
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
        {/* "this" is the main button whichever it says; "new" is the one after it. */}
        <Button
          ref={(el) => {
            openers.current.this = el;
          }}
          variant="primary"
          onClick={() => setEditing(budget ? "this" : "new")}
        >
          {budget ? "Edit this plan" : "Create a plan"}
        </Button>
        {budget && (
          <Button
            ref={(el) => {
              openers.current.new = el;
            }}
            onClick={() => setEditing("new")}
          >
            Start a new plan from the month after
          </Button>
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
          <ul data-row-list tabIndex={-1} className="space-y-1 text-sm">
            {plans.map((p) => (
              <li
                key={p.id}
                id={`plan-${p.id}`}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span data-row-name tabIndex={-1} style={strong}>
                  From {monthLabel(p.month)}
                </span>
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
