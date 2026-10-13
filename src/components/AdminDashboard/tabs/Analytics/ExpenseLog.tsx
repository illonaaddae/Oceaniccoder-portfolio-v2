import type React from "react";
import { useId, useState } from "react";
import { FaPlus, FaTimes, FaTrash } from "react-icons/fa";
import { createExpense, deleteExpense } from "@/services/api/expenses";
import type { Expense } from "@/types";
import { useConfirm } from "../../ConfirmContext";
import { formatMoney } from "../shared/money";
import { ErrorBanner } from "../shared/controls";
import { EXPENSE_CATEGORY_LABELS } from "./metrics/revenue";
import { formatDay } from "./metrics/format";
import { todayUTC } from "./metrics/range";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };
const strong: React.CSSProperties = { color: "var(--text-primary)" };
const field: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-primary)",
};

const CURRENCIES = ["GHS", "USD", "EUR", "GBP", "NGN", "KES"];
const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as Expense["category"][];

const blankForm = () => ({
  description: "",
  amount: "",
  currency: "GHS",
  category: "domain" as Expense["category"],
  date: todayUTC(),
});

interface ExpenseLogProps {
  expenses: Expense[];
  setExpenses: (update: (prev: Expense[]) => Expense[]) => void;
  /** The list couldn't be read; adding still works. */
  loadFailed?: boolean;
}

/** Every logged expense, latest date first, with add and delete. */
export function ExpenseLog({ expenses, setExpenses, loadFailed = false }: ExpenseLogProps) {
  const confirm = useConfirm();
  const formId = useId();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter a description and an amount above zero.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createExpense({
        description: form.description.trim(),
        amount,
        currency: form.currency,
        category: form.category,
        date: form.date,
      });
      setExpenses((prev) =>
        [created, ...prev].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
      );
      setForm(blankForm());
      setShowForm(false);
      setNotice(`Logged ${created.description}.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Couldn't log the expense: ${err.message}`
          : "Couldn't log the expense. Check that the expenses table exists in Appwrite.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (exp: Expense) => {
    const ok = await confirm({
      message: `Delete "${exp.description}"?`,
      description: "The expense is removed for good and stops counting in the totals.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      await deleteExpense(exp.$id);
      setExpenses((prev) => prev.filter((e) => e.$id !== exp.$id));
      setNotice(`Deleted ${exp.description}.`);
    } catch (err) {
      setError(err instanceof Error ? `Couldn't delete: ${err.message}` : "Couldn't delete.");
    }
  };

  const set =
    <K extends keyof ReturnType<typeof blankForm>>(key: K) =>
    (value: ReturnType<typeof blankForm>[K]) =>
      setForm((f) => ({ ...f, [key]: value }));

  return (
    <section className="glass-card overflow-hidden rounded-xl" aria-labelledby={`${formId}-title`}>
      <div
        className="flex items-center justify-between gap-3 px-5 py-4"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <h3 id={`${formId}-title`} className="text-base font-bold" style={strong}>
          Expense log{" "}
          <span className="text-xs font-normal" style={muted}>
            ({expenses.length}, all dates)
          </span>
        </h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
          aria-controls={`${formId}-form`}
          className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition hover:bg-[var(--accent-teal-subtle)]"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
        >
          {showForm ? <FaTimes aria-hidden="true" /> : <FaPlus aria-hidden="true" />}
          {showForm ? "Cancel" : "Add expense"}
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {notice}
      </p>
      {error && (
        <div className="px-5 pt-3">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {showForm && (
        <form
          id={`${formId}-form`}
          onSubmit={add}
          className="space-y-3 px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold sm:col-span-2" style={muted}>
              Description
              <input
                type="text"
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
                placeholder="e.g. Domain renewal for client.com"
                required
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-normal"
                style={field}
              />
            </label>
            <label className="block text-xs font-semibold" style={muted}>
              Amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => set("amount")(e.target.value)}
                placeholder="0.00"
                required
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-normal"
                style={field}
              />
            </label>
            <label className="block text-xs font-semibold" style={muted}>
              Currency
              <select
                value={form.currency}
                onChange={(e) => set("currency")(e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-normal"
                style={field}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold" style={muted}>
              Category
              <select
                value={form.category}
                onChange={(e) => set("category")(e.target.value as Expense["category"])}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-normal"
                style={field}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {EXPENSE_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold" style={muted}>
              Date
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date")(e.target.value)}
                required
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-normal"
                style={field}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--quote-cta)" }}
          >
            <FaPlus aria-hidden="true" /> {saving ? "Saving…" : "Log expense"}
          </button>
        </form>
      )}

      {expenses.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm" style={muted}>
          {loadFailed
            ? "Expenses couldn't load, so the log may be incomplete. Refresh to try again."
            : "No expenses logged yet. Track domains, hosting, tools and other costs here."}
        </p>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {expenses.map((exp) => (
            <li key={exp.$id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={strong}>
                  {exp.description}
                </p>
                <p className="mt-0.5 text-xs" style={muted}>
                  {EXPENSE_CATEGORY_LABELS[exp.category] ?? exp.category} · {formatDay(exp.date)}
                </p>
              </div>
              <p className="flex-shrink-0 text-sm font-semibold tabular-nums" style={strong}>
                {formatMoney(exp.amount, exp.currency)}
              </p>
              <button
                type="button"
                onClick={() => void remove(exp)}
                aria-label={`Delete ${exp.description}`}
                className="flex-shrink-0 rounded-lg p-2 transition hover:bg-[var(--status-failed-bg)]"
                style={{ color: "var(--status-failed-text)" }}
              >
                <FaTrash aria-hidden="true" className="text-xs" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
