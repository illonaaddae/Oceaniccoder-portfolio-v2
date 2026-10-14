import type React from "react";
import { useId, useState } from "react";
import { FaPlus, FaTimes, FaTrash } from "react-icons/fa";
import { createExpense, deleteExpense } from "@/services/api/expenses";
import type { Expense } from "@/types";
import { Pagination } from "@/components/common/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DatePicker } from "@/components/ui/DatePicker";
import { useConfirm } from "../../ConfirmContext";
import { formatMoney } from "../shared/money";
import { ErrorBanner } from "../shared/controls";
import { EXPENSE_CATEGORY_LABELS } from "./metrics/revenue";
import { formatDay } from "./metrics/format";
import { dayOf, todayUTC } from "./metrics/range";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };
const strong: React.CSSProperties = { color: "var(--text-primary)" };

const PAGE_SIZE = 15;
const CURRENCIES = ["GHS", "USD", "EUR", "GBP", "NGN", "KES"];
const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as Expense["category"][];
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABELS[c] }));

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
  /** The list hasn't arrived yet. */
  loading?: boolean;
  theme: "light" | "dark";
}

/** Every logged expense, latest date first, with add and delete. */
export function ExpenseLog({
  expenses,
  setExpenses,
  loadFailed = false,
  loading = false,
  theme,
}: ExpenseLogProps) {
  const confirm = useConfirm();
  const formId = useId();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const { page, setPage, pageItems, totalItems } = usePagination(expenses, PAGE_SIZE);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0 || !form.date) {
      setError("Enter a description, an amount above zero and a date.");
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
      setPage(1);
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
      setPage(1);
      setNotice(`Deleted ${exp.description}.`);
    } catch (err) {
      setError(err instanceof Error ? `Couldn't delete: ${err.message}` : "Couldn't delete.");
    }
  };

  // Matches CustomSelect and DatePicker at size "sm", so the row lines up.
  const inputClass = `mt-1 block w-full rounded-lg border px-3 py-2 text-sm font-normal transition-all duration-200 focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
    theme === "dark"
      ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-400 focus:border-oceanic-400 focus:ring-oceanic-400"
      : "bg-white/50 border-oceanic-200/50 text-slate-900 placeholder-slate-500 focus:ring-oceanic-600"
  }`;

  const set =
    <K extends keyof ReturnType<typeof blankForm>>(key: K) =>
    (value: ReturnType<typeof blankForm>[K]) =>
      setForm((f) => ({ ...f, [key]: value }));

  return (
    <section className="glass-card rounded-xl" aria-labelledby={`${formId}-title`}>
      <div
        className="flex items-center justify-between gap-3 px-5 py-4"
        style={{ borderBottom: "1px solid var(--analytics-line)" }}
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
          style={{ borderBottom: "1px solid var(--analytics-line)" }}
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
                className={inputClass}
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
                className={`${inputClass} tabular-nums`}
              />
            </label>
            <div className="text-xs font-semibold" style={muted}>
              <span id={`${formId}-currency`}>Currency</span>
              <CustomSelect
                value={form.currency}
                onChange={set("currency")}
                options={CURRENCY_OPTIONS}
                theme={theme}
                labelId={`${formId}-currency`}
                size="sm"
                className="mt-1 font-normal"
              />
            </div>
            <div className="text-xs font-semibold" style={muted}>
              <span id={`${formId}-category`}>Category</span>
              <CustomSelect
                value={form.category}
                onChange={(v) => set("category")(v as Expense["category"])}
                options={CATEGORY_OPTIONS}
                theme={theme}
                labelId={`${formId}-category`}
                size="sm"
                className="mt-1 font-normal"
              />
            </div>
            <div className="text-xs font-semibold" style={muted}>
              <span id={`${formId}-date`}>Date</span>
              <DatePicker
                value={form.date}
                onChange={set("date")}
                theme={theme}
                labelId={`${formId}-date`}
                size="sm"
                placeholder="Pick a date"
                className="mt-1 font-normal"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className={`flex items-center gap-2 rounded-lg bg-oceanic-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-oceanic-700 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 ${
                theme === "dark" ? "focus:ring-oceanic-400" : "focus:ring-oceanic-600"
              }`}
            >
              <FaPlus aria-hidden="true" /> {saving ? "Saving…" : "Log expense"}
            </button>
          </div>
        </form>
      )}

      {expenses.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm" style={muted}>
          {loading
            ? "Loading expenses…"
            : loadFailed
              ? "Expenses couldn't load, so the log may be incomplete. Refresh to try again."
              : "No expenses logged yet. Track domains, hosting, tools and other costs here."}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--analytics-line)]">
          {pageItems.map((exp) => (
            <li key={exp.$id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-medium [overflow-wrap:anywhere] sm:truncate"
                  style={strong}
                >
                  {exp.description}
                </p>
                <p className="mt-0.5 text-xs" style={muted}>
                  {EXPENSE_CATEGORY_LABELS[exp.category] ?? exp.category} ·{" "}
                  {formatDay(dayOf(exp.date) ?? exp.date)}
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
      {totalItems > PAGE_SIZE && (
        <div className="px-5 pb-4">
          <Pagination
            page={page}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            theme={theme}
          />
        </div>
      )}
    </section>
  );
}
