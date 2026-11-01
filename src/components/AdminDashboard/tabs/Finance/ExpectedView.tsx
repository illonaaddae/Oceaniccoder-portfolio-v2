import { useState } from "react";
import type { ExpectedIncome } from "@/types/finance";
import { financeApi } from "@/services/api/finance";
import { today } from "@/utils/finance/ledger";
import { useConfirm } from "../../ConfirmContext";
import { INCOME_CATEGORIES } from "./TransactionsView";
import type { FinanceState } from "./useFinance";
import {
  Button,
  Card,
  FormError,
  MoneyField,
  Select,
  TextField,
  cedis,
  inputToMinor,
  minorToInput,
  muted,
  strong,
} from "./ui";

function fundChoices(state: FinanceState) {
  return [
    { value: "", label: "Keep as cash" },
    ...state.activeFunds.map((f) => ({ value: f.id, label: `Put into ${f.name}` })),
  ];
}

function ExpectedForm({
  item,
  state,
  onDone,
}: {
  item?: ExpectedIncome;
  state: FinanceState;
  onDone: () => void;
}) {
  const [source, setSource] = useState(item?.source ?? "");
  const [amount, setAmount] = useState(minorToInput(item?.amountMinor ?? 0));
  const [expectedDate, setExpectedDate] = useState(item?.expectedDate ?? "");
  const [depositFundId, setDepositFundId] = useState(item?.depositFundId ?? "");
  const [note, setNote] = useState(item?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountMinor = inputToMinor(amount);
    if (amountMinor === null) return setError("Amounts must be numbers like 1200 or 1,200.50.");
    if (!amountMinor) return setError("Enter an amount more than zero.");
    setSaving(true);
    setError(null);
    try {
      await state.mutate(() =>
        financeApi.saveExpected({
          id: item?.id,
          source: source.trim(),
          amountMinor,
          expectedDate,
          depositFundId,
          note: note.trim(),
        }),
      );
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save it.");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3"
      aria-label={item ? `Edit ${item.source}` : "Add expected income"}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label="From"
          value={source}
          onChange={setSource}
          required
          maxLength={80}
          placeholder="Client balance, bonus, family"
        />
        <MoneyField label="Amount (GH₵)" value={amount} onChange={setAmount} required />
        <TextField
          label="Expected on"
          type="date"
          value={expectedDate}
          onChange={setExpectedDate}
        />
        <Select
          label="When it arrives"
          value={depositFundId}
          options={fundChoices(state)}
          onChange={setDepositFundId}
        />
        <TextField label="Note" value={note} onChange={setNote} maxLength={200} />
      </div>
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function ReceiveForm({
  item,
  state,
  onDone,
}: {
  item: ExpectedIncome;
  state: FinanceState;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(minorToInput(item.amountMinor));
  const [date, setDate] = useState(today());
  const [depositFundId, setDepositFundId] = useState(item.depositFundId);
  const [category, setCategory] = useState("Freelance");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountMinor = inputToMinor(amount);
    if (amountMinor === null) return setError("Amounts must be numbers like 1200 or 1,200.50.");
    if (!amountMinor) return setError("Enter the amount that arrived.");
    setSaving(true);
    setError(null);
    try {
      await state.mutate(() =>
        financeApi.receiveExpected({ id: item.id, amountMinor, date, depositFundId, category }),
      );
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record it.");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 space-y-3"
      aria-label={`Mark ${item.source} as received`}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MoneyField
          label="Amount that arrived (GH₵)"
          value={amount}
          onChange={setAmount}
          required
        />
        <TextField label="Arrived on" type="date" value={date} onChange={setDate} required />
        <Select
          label="What it was"
          value={category}
          options={INCOME_CATEGORIES.map((c) => ({ value: c, label: c }))}
          onChange={setCategory}
        />
        <Select
          label="Put it"
          value={depositFundId}
          options={fundChoices(state)}
          onChange={setDepositFundId}
        />
      </div>
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "It arrived"}
        </Button>
        <Button onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function ExpectedRow({ item, state }: { item: ExpectedIncome; state: FinanceState }) {
  const [mode, setMode] = useState<"view" | "edit" | "receive">("view");
  const fundName = state.data.funds.find((f) => f.id === item.depositFundId)?.name;
  const confirm = useConfirm();

  async function setStatus(status: "expected" | "cancelled") {
    try {
      await state.mutate(() => financeApi.setExpectedStatus(item.id, status));
    } catch (err) {
      state.report(err, "Couldn't update it.");
    }
  }

  async function undoReceive() {
    const ok = await confirm({
      message: `Undo receiving ${item.source}?`,
      description:
        "Its income and any deposit it made are removed, and it goes back to expected so you can record it again.",
      confirmLabel: "Undo",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await state.mutate(() => financeApi.unreceiveExpected(item.id));
    } catch (err) {
      state.report(err, "Couldn't undo it.");
    }
  }

  if (mode === "edit")
    return (
      <li className="py-3">
        <ExpectedForm item={item} state={state} onDone={() => setMode("view")} />
      </li>
    );

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold" style={strong}>
          {item.source}
        </span>
        <span className="tabular-nums font-semibold" style={strong}>
          {cedis(
            item.status === "received"
              ? (item.receivedMinor ?? item.amountMinor)
              : item.amountMinor,
          )}
        </span>
      </div>
      <p className="text-xs" style={muted}>
        {item.status === "received"
          ? `Received ${item.receivedOn}${typeof item.receivedMinor === "number" && item.receivedMinor !== item.amountMinor ? ` · expected ${cedis(item.amountMinor)}` : ""}`
          : item.status === "cancelled"
            ? "Not coming"
            : `${item.expectedDate ? `Expected ${item.expectedDate}` : "No date yet"}${fundName ? ` · goes to ${fundName}` : ""}`}
      </p>
      {item.note && (
        <p className="text-xs" style={muted}>
          {item.note}
        </p>
      )}
      {mode === "receive" && (
        <ReceiveForm item={item} state={state} onDone={() => setMode("view")} />
      )}
      {mode === "view" && item.status === "expected" && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setMode("receive")}>
            It arrived
          </Button>
          <Button onClick={() => setMode("edit")}>Edit</Button>
          <Button onClick={() => void setStatus("cancelled")}>Not coming</Button>
        </div>
      )}
      {item.status === "received" && (
        <div className="mt-2">
          <Button onClick={() => void undoReceive()}>Undo</Button>
        </div>
      )}
      {item.status === "cancelled" && (
        <div className="mt-2">
          <Button onClick={() => void setStatus("expected")}>Expect it again</Button>
        </div>
      )}
    </li>
  );
}

export function ExpectedView({ state }: { state: FinanceState }) {
  const [adding, setAdding] = useState(false);
  const all = [...state.data.expected].sort((a, b) =>
    (a.expectedDate || "9").localeCompare(b.expectedDate || "9"),
  );
  const pending = all.filter((e) => e.status === "expected");
  const done = all.filter((e) => e.status !== "expected");
  const pendingTotal = pending.reduce((acc, e) => acc + e.amountMinor, 0);

  return (
    <div className="space-y-4">
      <p className="text-sm" style={muted}>
        Money you're waiting for: client balances, bonuses, family help. None of it counts in any
        total until you mark it as arrived; then it's recorded once, as income, and put where you
        choose.
      </p>
      {adding ? (
        <Card title="Add expected income">
          <ExpectedForm state={state} onDone={() => setAdding(false)} />
        </Card>
      ) : (
        <Button variant="primary" onClick={() => setAdding(true)}>
          Add expected income
        </Button>
      )}
      <Card
        title="Waiting for"
        action={
          <span className="text-sm font-bold tabular-nums" style={strong}>
            {cedis(pendingTotal)}
          </span>
        }
      >
        {pending.length === 0 ? (
          <p className="text-sm" style={muted}>
            Nothing expected.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {pending.map((e) => (
              <ExpectedRow key={e.id} item={e} state={state} />
            ))}
          </ul>
        )}
      </Card>
      {done.length > 0 && (
        <Card title="Arrived or not coming">
          <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {done.map((e) => (
              <ExpectedRow key={e.id} item={e} state={state} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
