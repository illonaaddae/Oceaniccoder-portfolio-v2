import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Budget, Fund } from "@/types/finance";
import { financeApi } from "@/services/api/finance";
import { addMonths, contributedInto, currentMonth, today } from "@/utils/finance/ledger";
import {
  contributionSeries,
  neededPerMonth,
  progress,
  projectedMonth,
} from "@/utils/finance/projection";
import { useConfirm } from "../../ConfirmContext";
import type { FinanceState } from "./useFinance";
import { FundForm, GROUP_OPTIONS } from "./FundForm";
import {
  Button,
  Card,
  FormError,
  MoneyField,
  ProgressBar,
  TextField,
  DateField,
  cedis,
  inputToMinor,
  monthLabel,
  muted,
  strong,
} from "./ui";

type MoveType = "deposit" | "withdrawal" | "fund_spend" | "opening";

/** One button per way money moves, so the form never asks "what happened". */
const MOVES: Record<MoveType, { button: string; title: string; hint: string; submit: string }> = {
  deposit: {
    button: "Add money",
    title: "Add money",
    hint: "Saved into this fund now, from your cash on hand.",
    submit: "Add",
  },
  withdrawal: {
    button: "Take out",
    title: "Take money out",
    hint: "Back to your cash on hand. It no longer counts as saved.",
    submit: "Take out",
  },
  fund_spend: {
    button: "Pay for something",
    title: "Pay for something",
    hint: "Spent on what this fund was for, such as the rent or the laptop.",
    submit: "Record payment",
  },
  opening: {
    button: "Set what it already holds",
    title: "Money it already held",
    hint: "Money that was in this fund before you started tracking. It isn't counted as this month's saving.",
    submit: "Save",
  },
};

function MoveMoneyForm({
  fund,
  state,
  type,
  onDone,
}: {
  fund: Fund;
  state: FinanceState;
  type: MoveType;
  onDone: () => void;
}) {
  const move = MOVES[type];
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountMinor = inputToMinor(amount);
    if (amountMinor === null) return setError("Amounts must be numbers like 300 or 1,250.50.");
    if (!amountMinor) return setError("Enter an amount more than zero.");
    setSaving(true);
    setError(null);
    try {
      await state.mutate(() =>
        financeApi.addTxn({
          type,
          date,
          amountMinor,
          fundId: fund.id,
          toFundId: "",
          category: type === "fund_spend" ? fund.name : "",
          note: note.trim(),
        }),
      );
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record that.");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 space-y-3 rounded-lg border p-4"
      style={{ borderColor: "var(--analytics-line)" }}
      aria-label={`${move.title}: ${fund.name}`}
    >
      <div>
        <h3 className="text-sm font-bold" style={strong}>
          {move.title}
        </h3>
        <p className="mt-0.5 text-xs" style={muted}>
          {move.hint}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MoneyField label="Amount (GH₵)" value={amount} onChange={setAmount} required />
        <DateField label="Date" value={date} onChange={setDate} required />
        <TextField label="Note" value={note} onChange={setNote} maxLength={200} />
      </div>
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : move.submit}
        </Button>
        <Button onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

/** The first month a budget plan saves into the fund, or "" if none does. */
function firstPlannedMonth(budgets: Budget[], fundId: string): string {
  return (
    budgets
      .filter((b) => b.lines.some((l) => l.fundId === fundId && l.amountMinor > 0))
      .map((b) => b.month)
      .sort()[0] ?? ""
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide" style={muted}>
        {label}
      </p>
      <p className="text-lg font-bold tabular-nums" style={strong}>
        {value}
      </p>
    </div>
  );
}

function FundRow({ fund, state }: { fund: Fund; state: FinanceState }) {
  const [mode, setMode] = useState<"view" | "move" | "edit" | "history">("view");
  const [moveType, setMoveType] = useState<MoveType>("deposit");
  const startMove = (type: MoveType) => {
    setMoveType(type);
    setMode("move");
  };
  const [error, setError] = useState<string | null>(null);
  // Archive or delete is running; both stay disabled so neither is sent twice.
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const month = currentMonth();
  const balance = state.balances.get(fund.id) ?? 0;
  const saved = contributedInto(state.data.txns, new Set([fund.id]), month);
  const reach = projectedMonth(balance, fund.monthlyMinor, fund.targetMinor, month, saved);
  const needed = neededPerMonth(balance, fund.targetMinor, fund.targetDate, month, saved);
  const history = state.data.txns
    .filter((t) => t.fundId === fund.id || t.toFundId === fund.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  // A fund the plan only starts paying into later is waiting, not behind.
  const starts = firstPlannedMonth(state.data.budgets, fund.id);
  const notStarted = history.length === 0 && starts > month;

  async function setArchived(archived: boolean) {
    setBusy(true);
    try {
      await state.mutate(() => financeApi.saveFund({ ...fund, archived }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the fund.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      message: `Delete ${fund.name}?`,
      description: "It has no history, so nothing else changes.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await state.mutate(() => financeApi.deleteFund(fund.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete the fund.");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "edit")
    return (
      <li className="py-5 first:pt-0 last:pb-0">
        <h3 className="mb-3 text-base font-bold" style={strong}>
          Edit {fund.name}
        </h3>
        <FundForm
          fund={fund}
          onCancel={() => setMode("view")}
          onSave={async (input) => {
            await state.mutate(() => financeApi.saveFund(input));
            setMode("view");
          }}
        />
      </li>
    );

  return (
    <li className="py-5 first:pt-0 last:pb-0" aria-labelledby={`fund-${fund.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`fund-${fund.id}`} className="text-base font-bold" style={strong}>
          {fund.name}
        </h3>
        {notStarted && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: "var(--accent-teal-subtle)", color: "var(--text-primary)" }}
          >
            Starts {monthLabel(starts)}
          </span>
        )}
        {fund.archived && (
          <span className="text-xs" style={muted}>
            Archived
          </span>
        )}
      </div>
      {fund.institution && (
        <p className="text-xs" style={muted}>
          Held at {fund.institution}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Figure label="Saved" value={cedis(balance)} />
        {fund.targetMinor > 0 && <Figure label="Target" value={cedis(fund.targetMinor)} />}
        <Figure label="Each month" value={cedis(fund.monthlyMinor)} />
      </div>
      {fund.targetMinor > 0 && (
        <div className="mt-3 space-y-1">
          <ProgressBar
            value={progress(balance, fund.targetMinor)}
            label={`${fund.name} progress`}
          />
          <p className="text-sm" style={muted}>
            {balance >= fund.targetMinor
              ? "Target reached"
              : `${cedis(fund.targetMinor - balance)} still to save. ${
                  reach
                    ? `At this pace: ${monthLabel(reach)}.`
                    : "Set a monthly amount to see when."
                }`}
            {fund.targetDate && needed !== null && balance < fund.targetMinor && (
              <>
                {" "}
                To make {fund.targetDate}: {cedis(needed)} a month.
              </>
            )}
          </p>
        </div>
      )}
      {fund.items.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {fund.items.map((it) => (
            <li key={it.id} className="flex flex-wrap justify-between gap-2">
              <span style={strong}>
                {it.boughtMinor !== null ? "✓ " : ""}
                {it.name}
              </span>
              <span className="tabular-nums" style={muted}>
                {it.boughtMinor !== null
                  ? `Paid ${cedis(it.boughtMinor)}`
                  : it.ceilingMinor > it.budgetMinor
                    ? `${cedis(it.budgetMinor)} to ${cedis(it.ceilingMinor)}`
                    : cedis(it.budgetMinor)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {fund.notes && (
        <p className="mt-2 text-sm" style={muted}>
          {fund.notes}
        </p>
      )}

      {mode === "move" && (
        <MoveMoneyForm
          key={moveType}
          fund={fund}
          state={state}
          type={moveType}
          onDone={() => setMode("view")}
        />
      )}
      {mode === "history" && (
        <ul
          className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm"
          aria-label={`${fund.name} history`}
        >
          {history.length === 0 && <li style={muted}>No history yet.</li>}
          {history.map((t) => {
            const into =
              t.type === "deposit" ||
              t.type === "opening" ||
              (t.type === "transfer" && t.toFundId === fund.id);
            return (
              <li key={t.id} className="flex justify-between gap-2">
                <span style={muted}>
                  {t.date} · {t.note || t.type.replace("_", " ")}
                </span>
                <span className="tabular-nums" style={strong}>
                  {into ? "+" : "−"}
                  {cedis(t.amountMinor)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <FormError message={error} />
      {mode !== "move" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!fund.archived && (
            <>
              <Button variant="primary" onClick={() => startMove("deposit")}>
                {MOVES.deposit.button}
              </Button>
              {balance > 0 && (
                <>
                  <Button onClick={() => startMove("withdrawal")}>{MOVES.withdrawal.button}</Button>
                  <Button onClick={() => startMove("fund_spend")}>{MOVES.fund_spend.button}</Button>
                </>
              )}
              {history.length === 0 && (
                <Button variant="quiet" onClick={() => startMove("opening")}>
                  {MOVES.opening.button}
                </Button>
              )}
            </>
          )}
          <span className="ml-auto flex flex-wrap gap-1">
            <Button
              variant="quiet"
              onClick={() => setMode(mode === "history" ? "view" : "history")}
            >
              {mode === "history" ? "Hide history" : "History"}
            </Button>
            <Button variant="quiet" onClick={() => setMode("edit")}>
              Edit
            </Button>
            <Button
              variant="quiet"
              onClick={() => void setArchived(!fund.archived)}
              disabled={busy}
            >
              {fund.archived ? "Restore" : "Archive"}
            </Button>
            {history.length === 0 && (
              <Button variant="quiet" onClick={() => void remove()} disabled={busy}>
                Delete
              </Button>
            )}
          </span>
        </div>
      )}
    </li>
  );
}

const HORIZONS = [12, 36, 60];

/** Personal wealth if the plan holds: today's balance plus monthly contributions, no returns. */
function WealthProjection({ state }: { state: FinanceState }) {
  const { activeFunds, balances } = state;
  const txns = state.data.txns;
  const start = currentMonth();
  const wealth = useMemo(() => activeFunds.filter((f) => f.group === "wealth"), [activeFunds]);
  const series = useMemo(() => {
    const balance = wealth.reduce((acc, f) => acc + (balances.get(f.id) ?? 0), 0);
    const monthly = wealth.reduce((acc, f) => acc + f.monthlyMinor, 0);
    const saved = contributedInto(txns, new Set(wealth.map((f) => f.id)), start);
    return contributionSeries(balance, monthly, 60, saved).map((minor, i) => ({
      month: monthLabel(addMonths(start, i)),
      cedis: minor / 100,
    }));
  }, [balances, start, txns, wealth]);
  if (wealth.length === 0) return null;
  return (
    <Card title="Personal wealth if you keep the plan">
      <dl className="mb-3 grid grid-cols-3 gap-2 text-sm">
        {HORIZONS.map((h) => (
          <div key={h}>
            <dt style={muted}>
              {h / 12} year{h > 12 ? "s" : ""}
            </dt>
            <dd className="font-bold tabular-nums" style={strong}>
              {cedis(Math.round(series[h].cedis * 100))}
            </dd>
          </div>
        ))}
      </dl>
      <div className="h-48" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ left: 8, right: 24, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              interval={11}
            />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} width={56} />
            <Tooltip formatter={(v: number) => cedis(Math.round(v * 100))} />
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="cedis"
              stroke="var(--accent-teal)"
              fill="var(--accent-teal-subtle)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs" style={muted}>
        Contributions only. Interest from treasury bills or funds would be extra and is never
        assumed.
      </p>
    </Card>
  );
}

export function FundsView({ state }: { state: FinanceState }) {
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const archived = state.data.funds.filter((f) => f.archived);
  const shown = showArchived ? [...state.activeFunds, ...archived] : state.activeFunds;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {!adding && (
          <Button variant="primary" onClick={() => setAdding(true)}>
            New fund
          </Button>
        )}
        {archived.length > 0 && (
          <Button onClick={() => setShowArchived((s) => !s)}>
            {showArchived ? "Hide archived" : `Show archived (${archived.length})`}
          </Button>
        )}
      </div>
      {adding && (
        <Card title="New fund">
          <FundForm
            onCancel={() => setAdding(false)}
            onSave={async (input) => {
              await state.mutate(() => financeApi.saveFund(input));
              setAdding(false);
            }}
          />
        </Card>
      )}
      <WealthProjection state={state} />
      {GROUP_OPTIONS.map((g) => {
        const funds = shown.filter((f) => f.group === g.value);
        if (funds.length === 0) return null;
        const total = funds.reduce((acc, f) => acc + (state.balances.get(f.id) ?? 0), 0);
        return (
          <Card
            key={g.value}
            title={g.label}
            action={
              <span className="text-sm font-bold tabular-nums" style={strong}>
                {cedis(total)} saved
              </span>
            }
          >
            <ul className="divide-y divide-[var(--analytics-line)]">
              {funds.map((f) => (
                <FundRow key={f.id} fund={f} state={state} />
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
