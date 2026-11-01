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
import type { Fund, TxnType } from "@/types/finance";
import { financeApi } from "@/services/api/finance";
import { addMonths, currentMonth, today } from "@/utils/finance/ledger";
import {
  contributionSeries,
  neededPerMonth,
  progress,
  projectedMonth,
} from "@/utils/finance/projection";
import type { FinanceState } from "./useFinance";
import { FundForm, GROUP_OPTIONS } from "./FundForm";
import {
  Button,
  Card,
  FormError,
  MoneyField,
  ProgressBar,
  Select,
  TextField,
  cedis,
  inputToMinor,
  monthLabel,
  muted,
  strong,
} from "./ui";

const MOVE_OPTIONS: { value: TxnType; label: string }[] = [
  { value: "deposit", label: "Put money in (from cash)" },
  { value: "withdrawal", label: "Take money out (to cash)" },
  { value: "fund_spend", label: "Pay for something from this fund" },
  { value: "opening", label: "Balance I already had before tracking" },
];

function MoveMoneyForm({
  fund,
  state,
  onDone,
}: {
  fund: Fund;
  state: FinanceState;
  onDone: () => void;
}) {
  const [type, setType] = useState<TxnType>("deposit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountMinor = inputToMinor(amount);
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
    <form onSubmit={submit} className="mt-3 space-y-3" aria-label={`Move money for ${fund.name}`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label="What happened" value={type} options={MOVE_OPTIONS} onChange={setType} />
        <MoneyField label="Amount (GH₵)" value={amount} onChange={setAmount} required />
        <TextField label="Date" type="date" value={date} onChange={setDate} required />
        <TextField label="Note" value={note} onChange={setNote} maxLength={200} />
      </div>
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

function FundCard({ fund, state }: { fund: Fund; state: FinanceState }) {
  const [mode, setMode] = useState<"view" | "move" | "edit" | "history">("view");
  const [error, setError] = useState<string | null>(null);
  const month = currentMonth();
  const balance = state.balances.get(fund.id) ?? 0;
  const reach = projectedMonth(balance, fund.monthlyMinor, fund.targetMinor, month);
  const needed = neededPerMonth(balance, fund.targetMinor, fund.targetDate, month);
  const history = state.data.txns
    .filter((t) => t.fundId === fund.id || t.toFundId === fund.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  async function setArchived(archived: boolean) {
    try {
      await state.mutate(() => financeApi.saveFund({ ...fund, archived }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the fund.");
    }
  }

  if (mode === "edit")
    return (
      <Card title={`Edit ${fund.name}`}>
        <FundForm
          fund={fund}
          onCancel={() => setMode("view")}
          onSave={async (input) => {
            await state.mutate(() => financeApi.saveFund(input));
            setMode("view");
          }}
        />
      </Card>
    );

  return (
    <Card
      title={GROUP_OPTIONS.find((g) => g.value === fund.group)?.label}
      action={
        fund.archived ? (
          <span className="text-xs" style={muted}>
            Archived
          </span>
        ) : undefined
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold" style={strong}>
          {fund.name}
        </h3>
        <p className="text-lg font-bold tabular-nums" style={strong}>
          {cedis(balance)}
        </p>
      </div>
      {fund.institution && (
        <p className="text-xs" style={muted}>
          Held at {fund.institution}
        </p>
      )}
      {fund.targetMinor > 0 && (
        <div className="mt-3 space-y-1">
          <ProgressBar
            value={progress(balance, fund.targetMinor)}
            label={`${fund.name} progress`}
          />
          <p className="text-sm" style={muted}>
            {cedis(Math.max(0, fund.targetMinor - balance))} to go of {cedis(fund.targetMinor)}
          </p>
        </div>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt style={muted}>Monthly</dt>
        <dd className="tabular-nums" style={strong}>
          {cedis(fund.monthlyMinor)}
        </dd>
        {fund.targetMinor > 0 && (
          <>
            <dt style={muted}>At that pace</dt>
            <dd style={strong}>{reach ? monthLabel(reach) : "Never, set a monthly amount"}</dd>
          </>
        )}
        {fund.targetDate && needed !== null && (
          <>
            <dt style={muted}>Needed by {fund.targetDate}</dt>
            <dd className="tabular-nums" style={strong}>
              {cedis(needed)} a month
            </dd>
          </>
        )}
      </dl>
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
        <p className="mt-3 text-sm" style={muted}>
          {fund.notes}
        </p>
      )}

      {mode === "move" && (
        <MoveMoneyForm fund={fund} state={state} onDone={() => setMode("view")} />
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
        <div className="mt-4 flex flex-wrap gap-2">
          {!fund.archived && (
            <Button variant="primary" onClick={() => setMode("move")}>
              Move money
            </Button>
          )}
          <Button onClick={() => setMode(mode === "history" ? "view" : "history")}>
            {mode === "history" ? "Hide history" : "History"}
          </Button>
          <Button onClick={() => setMode("edit")}>Edit</Button>
          <Button onClick={() => setArchived(!fund.archived)}>
            {fund.archived ? "Restore" : "Archive"}
          </Button>
        </div>
      )}
    </Card>
  );
}

const HORIZONS = [12, 36, 60];

/** Personal wealth if the plan holds: today's balance plus monthly contributions, no returns. */
function WealthProjection({ state }: { state: FinanceState }) {
  const wealth = state.activeFunds.filter((f) => f.group === "wealth");
  const start = currentMonth();
  const series = useMemo(() => {
    const balance = wealth.reduce((acc, f) => acc + (state.balances.get(f.id) ?? 0), 0);
    const monthly = wealth.reduce((acc, f) => acc + f.monthlyMinor, 0);
    return contributionSeries(balance, monthly, 60).map((minor, i) => ({
      month: monthLabel(addMonths(start, i)),
      cedis: minor / 100,
    }));
  }, [start, state.balances, wealth]);
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
          <AreaChart data={series} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              interval={11}
            />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} width={56} />
            <Tooltip formatter={(v: number) => cedis(Math.round(v * 100))} />
            <Area
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {shown.map((f) => (
          <FundCard key={f.id} fund={f} state={state} />
        ))}
      </div>
    </div>
  );
}
