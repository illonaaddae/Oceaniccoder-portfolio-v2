import React, { useEffect, useState, useCallback } from "react";
import { FaCreditCard, FaSync, FaCheckCircle, FaMoneyBillWave } from "react-icons/fa";
import { getPayments, type Payment } from "@/services/api/payments";

interface PaymentsTabProps {
  theme: "light" | "dark";
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: "₵",
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
  KES: "KSh",
};

const METHOD_LABEL: Record<string, string> = {
  card: "Card",
  momo: "Mobile Money",
  bank: "Bank Transfer",
};

const STATUS_PILL: Record<string, string> = {
  success: "bg-green-500/15 text-green-400 border-green-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
};

function formatDateTime(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PaymentsTab({ theme }: PaymentsTabProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPayments(await getPayments());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalReceived = payments
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const successCount = payments.filter((p) => p.status === "success").length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            Payments
          </h1>
          <p
            className={`text-sm sm:text-base ${
              theme === "dark" ? "text-gray-200" : "text-slate-600"
            }`}
          >
            Records of successful and pending payments
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            theme === "dark"
              ? "bg-brand-link hover:bg-brand-accent-strong text-white"
              : "bg-brand-link hover:bg-brand-accent-strong text-white"
          }`}
        >
          <FaSync /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-green-500/15">
            <FaCheckCircle className="text-green-400 text-xl" />
          </div>
          <div>
            <p className={`text-xs ${theme === "dark" ? "text-gray-200" : "text-slate-500"}`}>
              Successful
            </p>
            <p
              className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
            >
              {successCount}
            </p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-brand-link/15">
            <FaMoneyBillWave className="text-brand-link dark:text-oceanic-400 text-xl" />
          </div>
          <div>
            <p className={`text-xs ${theme === "dark" ? "text-gray-200" : "text-slate-500"}`}>
              Total Received (mixed currency)
            </p>
            <p
              className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
            >
              {totalReceived.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-amber-500/15">
            <FaCreditCard className="text-amber-400 text-xl" />
          </div>
          <div>
            <p className={`text-xs ${theme === "dark" ? "text-gray-200" : "text-slate-500"}`}>
              Total Records
            </p>
            <p
              className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
            >
              {payments.length}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <p className={theme === "dark" ? "text-gray-200" : "text-slate-600"}>Loading...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FaCreditCard
            className={`text-4xl mx-auto mb-4 ${
              theme === "dark" ? "text-gray-200" : "text-slate-400"
            }`}
          />
          <p className={theme === "dark" ? "text-gray-200" : "text-slate-600"}>
            No payment records yet
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className={`text-left border-b ${
                  theme === "dark"
                    ? "border-white/10 text-gray-200"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const sym = CURRENCY_SYMBOLS[p.currency] ?? p.currency;
                return (
                  <tr
                    key={p.$id}
                    className={`border-b ${
                      theme === "dark" ? "border-white/5" : "border-slate-100"
                    }`}
                  >
                    <td
                      className={`px-4 py-3 ${
                        theme === "dark" ? "text-gray-200" : "text-slate-700"
                      }`}
                    >
                      {formatDateTime(p.paidAt || p.$createdAt)}
                    </td>
                    <td
                      className={`px-4 py-3 font-mono ${
                        theme === "dark" ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {p.invoiceNumber}
                    </td>
                    <td
                      className={`px-4 py-3 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                    >
                      <div>{p.clientName}</div>
                      <div
                        className={`text-xs ${
                          theme === "dark" ? "text-gray-200" : "text-slate-500"
                        }`}
                      >
                        {p.clientEmail}
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 ${
                        theme === "dark" ? "text-gray-200" : "text-slate-700"
                      }`}
                    >
                      {METHOD_LABEL[p.method] ?? p.method}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        theme === "dark" ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {sym}
                      {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs border ${
                          STATUS_PILL[p.status ?? "success"] ?? STATUS_PILL.success
                        }`}
                      >
                        {p.status ?? "success"}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 font-mono text-xs ${
                        theme === "dark" ? "text-gray-200" : "text-slate-500"
                      }`}
                    >
                      {p.paystackReference ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
