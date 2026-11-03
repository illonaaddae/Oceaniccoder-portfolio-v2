import { useRef, useState } from "react";
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
  DateField,
  cedis,
  focusField,
  inputToMinor,
  minorToInput,
  muted,
  strong,
  useFocusAfterRender,
  useFocusFirstField,
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
  const [depositFundId, setDepositFundId] = useState(() =>
    state.selectableFundId(item?.depositFundId ?? ""),
  );
  const [note, setNote] = useState(item?.note ?? "");
  // The ledger version this form opened on; see `basedOn` in useFinance.
  const [basedOn] = useState(() => state.data.version);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useFocusFirstField<HTMLFormElement>();
  const refuseAmount = (message: string) => {
    setError(message);
    focusField(formRef.current, "amount");
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const amountMinor = inputToMinor(amount);
    if (amountMinor === null) return refuseAmount("Amounts must be numbers like 1200 or 1,200.50.");
    if (!amountMinor) return refuseAmount("Enter an amount more than zero.");
    setSaving(true);
    setError(null);
    try {
      await state.mutate(
        (version) =>
          financeApi.saveExpected(
            {
              id: item?.id,
              source: source.trim(),
              amountMinor,
              expectedDate,
              depositFundId,
              note: note.trim(),
            },
            version,
          ),
        { basedOn },
      );
      state.announce(`Saved ${source.trim()}`);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save it.");
      setSaving(false);
    }
  }

  return (
    <form
      ref={formRef}
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
        <MoneyField
          label="Amount (GH₵)"
          name="amount"
          value={amount}
          onChange={setAmount}
          required
        />
        <DateField label="Expected on" value={expectedDate} onChange={setExpectedDate} />
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
  row,
  onDone,
}: {
  item: ExpectedIncome;
  state: FinanceState;
  /** The item's row, which moves to the other list once received. */
  row: React.RefObject<HTMLLIElement | null>;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(minorToInput(item.amountMinor));
  const [date, setDate] = useState(today());
  const [depositFundId, setDepositFundId] = useState(() =>
    state.selectableFundId(item.depositFundId),
  );
  const [category, setCategory] = useState("Freelance");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useFocusFirstField<HTMLFormElement>();
  const refuseAmount = (message: string) => {
    setError(message);
    focusField(formRef.current, "amount");
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const amountMinor = inputToMinor(amount);
    if (amountMinor === null) return refuseAmount("Amounts must be numbers like 1200 or 1,200.50.");
    if (!amountMinor) return refuseAmount("Enter the amount that arrived.");
    setSaving(true);
    setError(null);
    try {
      await state.mutate(
        (version) =>
          financeApi.receiveExpected(
            { id: item.id, amountMinor, date, depositFundId, category },
            version,
          ),
        { row: row.current },
      );
      state.announce(`Recorded ${item.source} as received`);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record it.");
      setSaving(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="mt-3 space-y-3"
      aria-label={`Mark ${item.source} as received`}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MoneyField
          label="Amount that arrived (GH₵)"
          name="amount"
          value={amount}
          onChange={setAmount}
          required
        />
        <DateField label="Arrived on" value={date} onChange={setDate} required />
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
  // A change is running; its buttons stay disabled so it can't be sent twice.
  const [busy, setBusy] = useState(false);
  const rowRef = useRef<HTMLLIElement>(null);
  const openers = useRef<Partial<Record<"receive" | "edit", HTMLButtonElement | null>>>({});
  const opener = (key: "receive" | "edit") => (el: HTMLButtonElement | null) => {
    openers.current[key] = el;
  };
  const focusLater = useFocusAfterRender();
  /** Closes a form and puts focus back on the button that opened it. */
  const closeForm = (key: "receive" | "edit") => {
    setMode("view");
    focusLater(() => openers.current[key]);
  };

  async function setStatus(status: "expected" | "cancelled") {
    setBusy(true);
    try {
      await state.mutate((version) => financeApi.setExpectedStatus(item.id, status, version), {
        row: rowRef.current,
      });
      state.announce(
        status === "cancelled"
          ? `Marked ${item.source} as not coming`
          : `${item.source} is expected again`,
      );
    } catch (err) {
      state.report(err, "Couldn't update it.");
    } finally {
      setBusy(false);
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
    setBusy(true);
    try {
      await state.mutate((version) => financeApi.unreceiveExpected(item.id, version), {
        row: rowRef.current,
      });
      state.announce(`Undid receiving ${item.source}`);
    } catch (err) {
      state.report(err, "Couldn't undo it.");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "edit")
    return (
      <li ref={rowRef} className="py-3">
        <ExpectedForm item={item} state={state} onDone={() => closeForm("edit")} />
      </li>
    );

  return (
    <li ref={rowRef} className="py-3 first:pt-0 last:pb-0" aria-labelledby={`expected-${item.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span
          id={`expected-${item.id}`}
          data-row-name
          tabIndex={-1}
          className="font-semibold"
          style={strong}
        >
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
        <ReceiveForm item={item} state={state} row={rowRef} onDone={() => closeForm("receive")} />
      )}
      {mode === "view" && item.status === "expected" && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            ref={opener("receive")}
            variant="primary"
            label={`It arrived: ${item.source}`}
            onClick={() => setMode("receive")}
            disabled={busy}
          >
            It arrived
          </Button>
          <Button
            ref={opener("edit")}
            label={`Edit ${item.source}`}
            onClick={() => setMode("edit")}
            disabled={busy}
          >
            Edit
          </Button>
          <Button
            label={`Not coming: ${item.source}`}
            onClick={() => void setStatus("cancelled")}
            disabled={busy}
          >
            Not coming
          </Button>
        </div>
      )}
      {item.status === "received" && (
        <div className="mt-2">
          <Button
            label={`Undo receiving ${item.source}`}
            onClick={() => void undoReceive()}
            disabled={busy}
          >
            Undo
          </Button>
        </div>
      )}
      {item.status === "cancelled" && (
        <div className="mt-2">
          <Button
            label={`Expect it again: ${item.source}`}
            onClick={() => void setStatus("expected")}
            disabled={busy}
          >
            Expect it again
          </Button>
        </div>
      )}
    </li>
  );
}

export function ExpectedView({ state }: { state: FinanceState }) {
  const [adding, setAdding] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const focusLater = useFocusAfterRender();
  const closeAdd = () => {
    setAdding(false);
    focusLater(() => addRef.current);
  };
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
          <ExpectedForm state={state} onDone={closeAdd} />
        </Card>
      ) : (
        <Button ref={addRef} variant="primary" onClick={() => setAdding(true)}>
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
          <ul
            data-row-list
            tabIndex={-1}
            className="divide-y"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {pending.map((e) => (
              <ExpectedRow key={e.id} item={e} state={state} />
            ))}
          </ul>
        )}
      </Card>
      {done.length > 0 && (
        <Card title="Arrived or not coming">
          <ul
            data-row-list
            tabIndex={-1}
            className="divide-y"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {done.map((e) => (
              <ExpectedRow key={e.id} item={e} state={state} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
