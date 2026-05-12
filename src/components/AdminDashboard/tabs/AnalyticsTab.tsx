import React, { useEffect, useState, useCallback } from "react";
import {
  FaChartLine,
  FaSync,
  FaMoneyBillWave,
  FaProjectDiagram,
  FaArrowUp,
  FaPlus,
  FaTrash,
  FaWallet,
  FaChartPie,
  FaTimes,
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getInvoices } from "@/services/api/invoices";
import { getExpenses, createExpense, deleteExpense } from "@/services/api/expenses";
import type { Invoice, Expense } from "@/types";

interface AnalyticsTabProps {
  theme: "light" | "dark";
}

const TO_GHS: Record<string, number> = {
  GHS: 1,
  USD: 15.5,
  EUR: 16.9,
  GBP: 19.7,
  NGN: 0.0097,
  KES: 0.12,
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: "₵",
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
  KES: "KSh",
};

const CATEGORY_LABELS: Record<string, string> = {
  domain: "Domain",
  hosting: "Hosting",
  tools: "Tools",
  software: "Software",
  other: "Other",
};

const PIE_COLORS = ["#0c8599", "#26a9c5", "#52bfd7", "#c1ecf4", "#085866", "#064350"];

type Period = "daily" | "weekly" | "monthly" | "yearly";

function toGHS(amount: number, currency: string): number {
  return amount * (TO_GHS[currency] ?? 1);
}

function formatGHS(amount: number): string {
  return `₵${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getPeriodKey(dateStr: string, period: Period): string {
  const d = new Date(dateStr);
  if (period === "daily")
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (period === "weekly") {
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return `W/C ${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  }
  if (period === "monthly")
    return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return d.getFullYear().toString();
}

function buildChartData(invoices: Invoice[], period: Period) {
  const paid = invoices.filter((i) => i.status === "paid" && i.$createdAt);
  const grouped: Record<string, number> = {};
  for (const inv of paid) {
    const key = getPeriodKey(inv.$createdAt!, period);
    grouped[key] = (grouped[key] ?? 0) + toGHS(inv.total, inv.currency);
  }
  return Object.entries(grouped)
    .map(([label, amount]) => ({ label, amount: parseFloat(amount.toFixed(2)) }))
    .slice(-20);
}

function buildCurrencyPieData(invoices: Invoice[]) {
  const paid = invoices.filter((i) => i.status === "paid");
  const grouped: Record<string, number> = {};
  for (const inv of paid) {
    grouped[inv.currency] = (grouped[inv.currency] ?? 0) + inv.total;
  }
  return Object.entries(grouped).map(([currency, value]) => ({
    name: currency,
    value: parseFloat(value.toFixed(2)),
  }));
}

function buildExpensePieData(expenses: Expense[]) {
  const grouped: Record<string, number> = {};
  for (const exp of expenses) {
    grouped[exp.category] = (grouped[exp.category] ?? 0) + toGHS(exp.amount, exp.currency);
  }
  return Object.entries(grouped).map(([cat, value]) => ({
    name: CATEGORY_LABELS[cat] ?? cat,
    value: parseFloat(value.toFixed(2)),
  }));
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}
const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-sm font-semibold shadow-xl"
      style={{ background: "#0d1f3c", border: "1px solid #0d9488", color: "#e2e8f0" }}
    >
      <p className="text-xs mb-0.5" style={{ color: "#94a3b8" }}>
        {label}
      </p>
      <p style={{ color: "#26a9c5" }}>{formatGHS(payload[0].value)}</p>
    </div>
  );
};

export default function AnalyticsTab({ theme: _theme }: AnalyticsTabProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("monthly");
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [expensesUnavailable, setExpensesUnavailable] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    currency: "GHS",
    category: "domain" as Expense["category"],
    date: new Date().toISOString().slice(0, 10),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invs, exps] = await Promise.all([getInvoices(), getExpenses()]);
      setInvoices(invs);
      setExpenses(exps);
      if (exps.length === 0) setExpensesUnavailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // --- Computed values ---
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const pendingInvoices = invoices.filter((i) => i.status === "sent");

  const totalEarnedGHS = paidInvoices.reduce((s, i) => s + toGHS(i.total, i.currency), 0);
  const totalPendingGHS = pendingInvoices.reduce((s, i) => s + toGHS(i.total, i.currency), 0);
  const totalExpensesGHS = expenses.reduce((s, e) => s + toGHS(e.amount, e.currency), 0);
  const netIncomeGHS = totalEarnedGHS - totalExpensesGHS;
  const avgProjectGHS = paidInvoices.length > 0 ? totalEarnedGHS / paidInvoices.length : 0;

  // Earnings by currency for visa card
  const earnedByCurrency: Record<string, number> = {};
  for (const inv of paidInvoices) {
    earnedByCurrency[inv.currency] = (earnedByCurrency[inv.currency] ?? 0) + inv.total;
  }
  const primaryCurrencyEntry = Object.entries(earnedByCurrency).sort(
    ([, a], [, b]) =>
      toGHS(b, Object.keys(earnedByCurrency)[0] ?? "GHS") -
      toGHS(a, Object.keys(earnedByCurrency)[0] ?? "GHS"),
  )[0];

  const sinceYear =
    paidInvoices.length > 0
      ? Math.min(...paidInvoices.map((i) => new Date(i.$createdAt ?? Date.now()).getFullYear()))
      : new Date().getFullYear();

  const chartData = buildChartData(invoices, period);
  const currencyPieData = buildCurrencyPieData(invoices);
  const expensePieData = buildExpensePieData(expenses);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    setAdding(true);
    try {
      const created = await createExpense({
        description: form.description,
        amount: parseFloat(form.amount),
        currency: form.currency,
        category: form.category,
        date: form.date,
      });
      setExpenses((prev) => [created, ...prev]);
      setForm({
        description: "",
        amount: "",
        currency: "GHS",
        category: "domain",
        date: new Date().toISOString().slice(0, 10),
      });
      setShowForm(false);
    } catch {
      setExpensesUnavailable(true);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.$id !== id));
  };

  const PERIOD_BTNS: { label: string; value: Period }[] = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
    { label: "Yearly", value: "yearly" },
  ];

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: "var(--text-secondary)" }}>
        Loading analytics…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FaChartLine className="text-oceanic-500" /> Analytics
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Revenue, expenses, and project insights
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)" }}
        >
          <FaSync /> Refresh
        </button>
      </div>

      {/* ── Visa Card ── */}
      <div
        className="relative rounded-2xl p-6 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #000b21 0%, #04333B 55%, #001321 100%)",
          border: "1px solid rgba(12,133,153,0.35)",
          minHeight: "200px",
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -right-16 -top-16 rounded-full opacity-10"
          style={{ width: "240px", height: "240px", background: "#0c8599" }}
        />
        <div
          className="absolute -right-4 top-20 rounded-full opacity-10"
          style={{ width: "140px", height: "140px", background: "#26a9c5" }}
        />

        <div className="relative z-10 flex flex-col h-full gap-4">
          {/* Top row */}
          <div className="flex items-start justify-between">
            {/* Chip */}
            <svg width="44" height="34" viewBox="0 0 44 34" fill="none">
              <rect
                x="0.5"
                y="0.5"
                width="43"
                height="33"
                rx="5.5"
                fill="#c89b30"
                stroke="#b8881f"
              />
              <line x1="0" y1="11" x2="44" y2="11" stroke="#b8881f" strokeWidth="1" />
              <line x1="0" y1="23" x2="44" y2="23" stroke="#b8881f" strokeWidth="1" />
              <line x1="15" y1="0" x2="15" y2="34" stroke="#b8881f" strokeWidth="1" />
              <line x1="29" y1="0" x2="29" y2="34" stroke="#b8881f" strokeWidth="1" />
              <rect x="15" y="11" width="14" height="12" rx="1" fill="#daa83e" />
            </svg>

            {/* Card label */}
            <div className="text-right">
              <p
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                OceanicCoder
              </p>
              <p className="text-sm font-extrabold tracking-wider" style={{ color: "#26a9c5" }}>
                EARNINGS
              </p>
            </div>
          </div>

          {/* Main amount */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Total Earned
            </p>
            <p className="text-3xl font-extrabold" style={{ color: "#ffffff" }}>
              {formatGHS(totalEarnedGHS)}
            </p>
            {/* Currency breakdown */}
            {Object.entries(earnedByCurrency).length > 0 && (
              <div className="flex gap-3 flex-wrap mt-2">
                {Object.entries(earnedByCurrency).map(([cur, amt]) => (
                  <span
                    key={cur}
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(45,212,191,0.15)", color: "#c1ecf4" }}
                  >
                    {CURRENCY_SYMBOLS[cur] ?? cur}
                    {amt.toFixed(2)} {cur}
                  </span>
                ))}
              </div>
            )}
            {paidInvoices.length === 0 && (
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                No paid invoices yet
              </p>
            )}
          </div>

          {/* Bottom row */}
          <div
            className="flex items-end justify-between mt-auto pt-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div>
              <p
                className="text-xs uppercase tracking-widest mb-0.5"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Cardholder
              </p>
              <p
                className="text-sm font-bold tracking-wider"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                ILLONA ADDAE
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-xs uppercase tracking-widest mb-0.5"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Since
              </p>
              <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>
                {sinceYear}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            icon: <FaMoneyBillWave className="text-green-400" />,
            label: "Total Earned",
            value: formatGHS(totalEarnedGHS),
            sub: `${paidInvoices.length} paid invoice${paidInvoices.length !== 1 ? "s" : ""}`,
            color: "#22c55e",
          },
          {
            icon: <FaArrowUp className="text-amber-400" />,
            label: "Pending",
            value: formatGHS(totalPendingGHS),
            sub: `${pendingInvoices.length} awaiting payment`,
            color: "#fbbf24",
          },
          {
            icon: <FaProjectDiagram className="text-[var(--accent-teal)]" />,
            label: "Projects Done",
            value: paidInvoices.length.toString(),
            sub: "completed & paid",
            color: "var(--accent-teal)",
          },
          {
            icon: <FaWallet className="text-purple-400" />,
            label: "Avg. Project",
            value: formatGHS(avgProjectGHS),
            sub: "per paid invoice",
            color: "#a78bfa",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-4"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              {stat.icon}
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                {stat.label}
              </span>
            </div>
            <p className="text-xl font-extrabold" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── Revenue Chart ── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FaChartLine className="text-[var(--accent-teal)]" /> Revenue Over Time
            <span className="text-xs font-normal ml-1" style={{ color: "var(--text-secondary)" }}>
              (GHS equivalent)
            </span>
          </h3>
          <div className="flex gap-1">
            {PERIOD_BTNS.map((btn) => (
              <button
                key={btn.value}
                type="button"
                onClick={() => setPeriod(btn.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                style={{
                  background: period === btn.value ? "var(--accent-teal)" : "var(--bg-primary)",
                  color: period === btn.value ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${period === btn.value ? "transparent" : "var(--border-subtle)"}`,
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div
            className="h-48 flex items-center justify-center"
            style={{ color: "var(--text-secondary)" }}
          >
            No paid invoices to chart yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `₵${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(13,148,136,0.08)" }} />
              <Bar dataKey="amount" fill="#0c8599" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Pie Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by currency */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
        >
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <FaChartPie className="text-[var(--accent-teal)]" /> Revenue by Currency
          </h3>
          {currencyPieData.length === 0 ? (
            <div
              className="h-40 flex items-center justify-center text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              No data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={currencyPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={3}
                >
                  {currencyPieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${CURRENCY_SYMBOLS[String(name)] ?? String(name)}${Number(value ?? 0).toFixed(2)}`,
                    String(name),
                  ]}
                  contentStyle={{
                    background: "#0d1f3c",
                    border: "1px solid #0d9488",
                    borderRadius: "10px",
                    color: "#e2e8f0",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expenses by category */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
        >
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
            <FaChartPie className="text-red-400" /> Expenses by Category
          </h3>
          {expensePieData.length === 0 ? (
            <div
              className="h-40 flex items-center justify-center text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              No expenses logged
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={expensePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={3}
                >
                  {expensePieData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={["#ef4444", "#f97316", "#eab308", "#8b5cf6", "#ec4899"][index % 5]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [formatGHS(Number(value ?? 0)), String(name)]}
                  contentStyle={{
                    background: "#0d1f3c",
                    border: "1px solid #ef4444",
                    borderRadius: "10px",
                    color: "#e2e8f0",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Income vs Expenses summary ── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Earned
            </p>
            <p className="text-xl font-extrabold text-green-400">{formatGHS(totalEarnedGHS)}</p>
          </div>
          <div
            className="text-center"
            style={{
              borderLeft: "1px solid var(--border-subtle)",
              borderRight: "1px solid var(--border-subtle)",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Expenses
            </p>
            <p className="text-xl font-extrabold text-red-400">{formatGHS(totalExpensesGHS)}</p>
          </div>
          <div className="text-center">
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Net Income
            </p>
            <p
              className={`text-xl font-extrabold ${netIncomeGHS >= 0 ? "text-[var(--accent-teal)]" : "text-red-400"}`}
            >
              {formatGHS(netIncomeGHS)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Expenses Log ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FaMoneyBillWave className="text-red-400" /> Expense Log
            {expenses.length > 0 && (
              <span className="text-xs font-normal ml-1" style={{ color: "var(--text-secondary)" }}>
                ({expenses.length})
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)" }}
          >
            {showForm ? <FaTimes /> : <FaPlus />}
            {showForm ? "Cancel" : "Add Expense"}
          </button>
        </div>

        {expensesUnavailable && (
          <div
            className="px-5 py-3 text-xs font-medium"
            style={{ background: "rgba(239,68,68,0.08)", color: "#f87171" }}
          >
            Expenses collection not found in Appwrite. Create an &ldquo;expenses&rdquo; collection
            with fields: description (String), amount (Float), currency (String), category (String),
            date (String).
          </div>
        )}

        {/* Add Expense Form */}
        {showForm && (
          <form
            onSubmit={handleAddExpense}
            className="px-5 py-4 space-y-3"
            style={{
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--bg-primary)",
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Namecheap domain — client.com"
                  required
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Currency
                </label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  {["GHS", "USD", "EUR", "GBP", "NGN", "KES"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as Expense["category"] }))
                  }
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)" }}
            >
              <FaPlus /> {adding ? "Adding…" : "Log Expense"}
            </button>
          </form>
        )}

        {/* Expense list */}
        {expenses.length === 0 && !expensesUnavailable ? (
          <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            No expenses logged yet. Track domains, hosting, tools, and other costs here.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {expenses.map((exp) => {
              const sym = CURRENCY_SYMBOLS[exp.currency] ?? exp.currency;
              return (
                <div key={exp.$id} className="px-5 py-3 flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background:
                        {
                          domain: "#0c8599",
                          hosting: "#0e7490",
                          tools: "#f97316",
                          software: "#8b5cf6",
                          other: "#6b7280",
                        }[exp.category] ?? "#6b7280",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {exp.description}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {CATEGORY_LABELS[exp.category] ?? exp.category} · {exp.date}
                    </p>
                  </div>
                  <p className="text-sm font-bold flex-shrink-0 text-red-400">
                    {sym}
                    {exp.amount.toFixed(2)} {exp.currency}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(exp.$id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition flex-shrink-0"
                  >
                    <FaTrash className="text-xs" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
