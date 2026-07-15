import React, { useEffect, useState, useCallback } from "react";
import {
  FaFileInvoiceDollar,
  FaSync,
  FaCheckCircle,
  FaEnvelope,
  FaTrash,
  FaClock,
  FaMoneyBillWave,
} from "react-icons/fa";
import { getInvoices, updateInvoice, deleteInvoice } from "@/services/api/invoices";
import { createPayment } from "@/services/api/payments";
import { apiUrl } from "@/utils/apiUrl";
import type { Invoice } from "@/types";
import { useConfirm } from "../ConfirmContext";
import { Pagination } from "@/components/common/Pagination";
import { usePagination } from "@/hooks/usePagination";

const PAGE_SIZE = 10;

type StatusFilter = "all" | "sent" | "paid";

interface InvoicesTabProps {
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

const STATUS_CONFIG: Record<string, { label: string; pill: string; dot: string }> = {
  sent: {
    label: "Sent",
    pill: "bg-warning-400/10 text-warning-400 border-warning-400/30",
    dot: "bg-warning-400",
  },
  paid: {
    label: "Paid",
    pill: "bg-success-400/10 text-success-400 border-success-400/30",
    dot: "bg-success-400",
  },
  overdue: {
    label: "Overdue",
    pill: "bg-error-400/10 text-error-400 border-error-400/30",
    dot: "bg-error-400",
  },
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function InvoicesTab({ theme }: InvoicesTabProps) {
  const confirm = useConfirm();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<Record<string, boolean>>({});
  const [emailError, setEmailError] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInvoices(await getInvoices());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkPaid = async (inv: Invoice) => {
    const ok = await confirm({
      message: `Mark ${inv.invoiceNumber} as paid?`,
      description: `This will update the invoice status and send a payment confirmation email to ${inv.clientEmail}.`,
      confirmLabel: "Mark as Paid",
      variant: "success",
    });
    if (!ok) return;

    setConfirming((prev) => ({ ...prev, [inv.$id]: true }));
    try {
      await updateInvoice(inv.$id, { status: "paid" });

      // Audit log: create matching payment record for invoices marked paid manually
      // (off-platform — bank transfer, cash, etc.). Paystack-initiated payments
      // are recorded server-side by /api/paystack-webhook, so we skip method=card/momo here.
      try {
        await createPayment({
          invoiceNumber: inv.invoiceNumber,
          clientName: inv.clientName,
          clientEmail: inv.clientEmail,
          amount: inv.total,
          currency: inv.currency,
          method: "bank",
          paidAt: new Date().toISOString(),
          status: "success",
        });
      } catch (payErr) {
        // Don't block flow if payment record fails — invoice update already succeeded.
        console.error("Failed to create payment record:", payErr);
      }

      const items: { description: string; quantity: number; unitPrice: number }[] =
        typeof inv.items === "string" ? (JSON.parse(inv.items) as typeof items) : [];
      const sym = CURRENCY_SYMBOLS[inv.currency] ?? inv.currency;

      setEmailError(null);
      try {
        const controller = new AbortController();
        const killTimer = window.setTimeout(() => controller.abort(), 30000);
        let emailRes: Response;
        try {
          emailRes = await fetch(apiUrl("/api/send-payment-confirmation"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              invoiceNumber: inv.invoiceNumber,
              clientName: inv.clientName,
              clientEmail: inv.clientEmail,
              items,
              total: inv.total,
              currency: inv.currency,
              currencySymbol: sym,
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(killTimer);
        }
        if (!emailRes.ok) {
          const body = (await emailRes.json().catch(() => ({}))) as { error?: string };
          setEmailError(`Email failed (${emailRes.status}): ${body.error ?? "unknown error"}`);
        }
      } catch (emailErr) {
        const msg =
          emailErr instanceof Error && emailErr.name === "AbortError"
            ? "Email request timed out (server was starting up). The email may still be on its way; wait 30s and check the client's inbox before retrying."
            : `Email error: ${emailErr instanceof Error ? emailErr.message : "unknown"}`;
        setEmailError(msg);
      }

      setInvoices((prev) =>
        prev.map((i) => (i.$id === inv.$id ? { ...i, status: "paid" as Invoice["status"] } : i)),
      );
    } finally {
      setConfirming((prev) => ({ ...prev, [inv.$id]: false }));
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      message: "Delete invoice?",
      description: "This will permanently remove the invoice record.",
    });
    if (!ok) return;
    await deleteInvoice(id);
    setInvoices((prev) => prev.filter((i) => i.$id !== id));
  };

  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const pendingCount = invoices.filter((i) => i.status === "sent").length;

  const sumBy = (pred: (i: Invoice) => boolean) =>
    invoices.filter(pred).reduce((s, i) => s + Number(i.total || 0), 0);
  // Dominant currency for the summary figures (invoices are almost always one currency).
  const domCurrency =
    Object.entries(
      invoices.reduce<Record<string, number>>((acc, i) => {
        acc[i.currency] = (acc[i.currency] || 0) + 1;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "GHS";
  const symD = CURRENCY_SYMBOLS[domCurrency] ?? domCurrency;
  const fmtMoney = (n: number) =>
    `${symD}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const statCards = [
    {
      key: "all" as const,
      label: "Total Invoices",
      count: invoices.length,
      amount: sumBy(() => true),
      icon: FaFileInvoiceDollar,
      grad: "from-oceanic-500 to-oceanic-700",
    },
    {
      key: "paid" as const,
      label: "Paid",
      count: paidCount,
      amount: sumBy((i) => i.status === "paid"),
      icon: FaCheckCircle,
      grad: "from-success-500 to-success-700",
    },
    {
      key: "sent" as const,
      label: "Pending",
      count: pendingCount,
      amount: sumBy((i) => i.status === "sent"),
      icon: FaClock,
      grad: "from-warning-500 to-warning-700",
    },
  ];

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: invoices.length },
    { key: "sent", label: "Pending", count: pendingCount },
    { key: "paid", label: "Paid", count: paidCount },
  ];

  const filtered =
    activeStatus === "all" ? invoices : invoices.filter((i) => i.status === activeStatus);
  const { page, setPage, pageItems, totalItems } = usePagination(filtered, PAGE_SIZE);

  const subText = theme === "dark" ? "text-slate-400" : "text-slate-500";
  const pillBase = "px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap";
  const pillInactive =
    theme === "dark" ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-100";

  return (
    <div className="space-y-6">
      {emailError && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between gap-3"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "#f87171",
          }}
        >
          <span>{emailError}</span>
          <button
            type="button"
            onClick={() => setEmailError(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FaFileInvoiceDollar className="text-brand-link dark:text-oceanic-400" /> Invoices
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Track and manage client invoices
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)" }}
        >
          <FaSync className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {!loading && invoices.length > 0 && (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.key} className="glass-card p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={`text-[11px] font-bold uppercase tracking-wider truncate ${subText}`}
                    >
                      {s.label}
                    </p>
                    <p className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{s.count}</p>
                    <p className={`text-xs mt-0.5 truncate ${subText}`}>{fmtMoney(s.amount)}</p>
                  </div>
                  <div
                    className={`p-2.5 rounded-xl bg-gradient-to-br ${s.grad} shadow-lg flex-shrink-0`}
                  >
                    <Icon className="text-white text-lg" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status tabs */}
          <div
            className={`inline-flex flex-wrap gap-1 p-1 rounded-xl ${
              theme === "dark" ? "bg-white/5" : "bg-slate-100"
            }`}
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveStatus(t.key)}
                className={`${pillBase} ${
                  activeStatus === t.key ? "bg-oceanic-600 text-white shadow" : pillInactive
                }`}
              >
                {t.label}
                <span
                  className={`ml-2 text-xs ${activeStatus === t.key ? "text-white/80" : subText}`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {loading ? (
        <div className="text-center py-16" style={{ color: "var(--text-secondary)" }}>
          Loading…
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16">
          <FaFileInvoiceDollar
            className="text-5xl mx-auto mb-4"
            style={{ color: "var(--text-secondary)" }}
          />
          <p className="font-semibold text-[var(--text-primary)] mb-1">No invoices yet</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Generate invoices from Client Work tab.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className={subText}>No invoices in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pageItems.map((inv) => {
            const sc = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.sent;
            const sym = CURRENCY_SYMBOLS[inv.currency] ?? inv.currency;
            const isPaid = inv.status === "paid";
            const isConfirming = confirming[inv.$id];

            return (
              <div
                key={inv.$id}
                className="glass-card overflow-hidden"
                style={{
                  borderLeft: isPaid ? "4px solid #22c55e" : "4px solid var(--accent-teal)",
                }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Left: invoice info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h3 className="text-base font-bold text-[var(--text-primary)]">
                          {inv.invoiceNumber}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${sc.pill}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {inv.clientName}
                      </p>
                      <a
                        href={`mailto:${inv.clientEmail}`}
                        className="text-xs hover:text-[var(--accent-teal)] transition flex items-center gap-1 mt-0.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <FaEnvelope className="text-brand-link dark:text-oceanic-400" />{" "}
                        {inv.clientEmail}
                      </a>
                    </div>

                    {/* Right: amount */}
                    <div className="text-right flex-shrink-0">
                      <p
                        className="text-xl font-extrabold"
                        style={{ color: isPaid ? "#22c55e" : "var(--accent-teal)" }}
                      >
                        {sym}
                        {Number(inv.total).toFixed(2)}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {inv.currency}
                      </p>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div
                    className="flex items-center gap-4 mt-3 text-xs flex-wrap"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span className="flex items-center gap-1">
                      <FaClock className="text-brand-link dark:text-oceanic-400" /> Sent{" "}
                      {formatDate(inv.$createdAt)}
                    </span>
                    {inv.dueDate && (
                      <span className="flex items-center gap-1">
                        <FaMoneyBillWave className="text-brand-link dark:text-oceanic-400" /> Due{" "}
                        {formatDate(inv.dueDate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="px-5 py-3 flex items-center gap-2 flex-wrap"
                  style={{ borderTop: "1px solid var(--border-subtle)" }}
                >
                  {!isPaid && (
                    <button
                      type="button"
                      onClick={() => handleMarkPaid(inv)}
                      disabled={isConfirming}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
                      }}
                    >
                      <FaCheckCircle />
                      {isConfirming ? "Confirming…" : "Mark as Paid"}
                    </button>
                  )}
                  {isPaid && (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-success-400">
                      <FaCheckCircle /> Payment Confirmed
                    </span>
                  )}
                  <a
                    href={`/pay/${inv.invoiceNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition hover:text-[var(--text-primary)]"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    View Pay Page
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(inv.$id)}
                    className="ml-auto p-2 rounded-lg text-error-400 hover:bg-error-500/10 transition"
                    title="Delete invoice"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })}
          <Pagination
            page={page}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            theme={theme}
          />
        </div>
      )}
    </div>
  );
}
