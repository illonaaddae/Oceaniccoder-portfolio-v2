import { useCallback, useEffect, useMemo, useState } from "react";
import { FaFileInvoiceDollar } from "react-icons/fa";
import { getInvoices, updateInvoice } from "@/services/api/invoices";
import { createPayment, getPaymentsForInvoice } from "@/services/api/payments";
import { apiUrl } from "@/utils/apiUrl";
import { adminHeaders } from "@/services/api/adminHeaders";
import type { Invoice } from "@/types";
import type { QuoteSummary } from "@/types/quote";
import { quoteAdmin } from "@/services/api/quotes";
import { useConfirm } from "../ConfirmContext";
import { TabHeader } from "@/components/ui/TabHeader";
import { FilterPills } from "@/components/ui/FilterPills";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { CountWithTotals, KpiCard, MoneyTotals } from "./shared/KpiCard";
import { ErrorBanner, RefreshControl, SearchField, SelectField } from "./shared/controls";
import { muted, type RowMenu } from "./shared/DataTable";
import { formatMoney } from "./shared/money";
import { invoiceBalance } from "./Analytics/metrics/revenue";
import type { RowAction } from "./shared/RowActions";
import { InvoicesTable } from "./Invoices/InvoicesTable";
import {
  INVOICE_FILTER_LABELS,
  SOURCE_OPTIONS,
  computeInvoiceKpis,
  inInvoiceFilter,
  inSource,
  matchesInvoiceSearch,
  parseItems,
  quoteRows,
  toInvoiceRows,
  type InvoiceFilter,
  type InvoiceRow,
  type QuoteInvoiceRow,
  type SourceFilter,
} from "./Invoices/invoiceView";

const PAGE_SIZE = 15;
const FILTERS: InvoiceFilter[] = ["all", "draft", "due", "overdue", "paid", "archived"];

// Methods an admin can record when marking an invoice paid by hand. Apple Pay
// is deliberately absent — it can only arrive through Paystack, which records
// it server-side from the charge channel.
type ManualPaymentMethod = "bank" | "momo" | "card";

const MANUAL_PAYMENT_METHODS: { value: ManualPaymentMethod; label: string }[] = [
  { value: "bank", label: "Bank Transfer" },
  { value: "momo", label: "Mobile Money" },
  { value: "card", label: "Card" },
];

// Only for the payment confirmation email payload; the tab shows "GHS 500.00".
const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: "₵",
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
  KES: "KSh",
};

type ArchiveResponse = { invoice: { id: string; archivedAt: string | null } };

interface InvoicesTabProps {
  theme: "light" | "dark";
  /** Opens a quote in the Quotes tab (quote invoices are managed there). */
  onOpenQuote?: (quoteId: string) => void;
}

export default function InvoicesTab({ theme, onOpenQuote }: InvoicesTabProps) {
  const confirm = useConfirm();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quoteInvoices, setQuoteInvoices] = useState<QuoteInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [confirming, setConfirming] = useState<Record<string, boolean>>({});
  const [emailError, setEmailError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [filter, setFilter] = useState<InvoiceFilter>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The two sources load independently: a failure in one shows its own
      // banner and leaves the other's invoices on screen.
      const [list, quotes] = await Promise.all([
        getInvoices().then(
          (rows) => {
            setInvoiceError(null);
            return rows;
          },
          (e: unknown) => {
            setInvoiceError(e instanceof Error ? e.message : "Couldn't load invoices.");
            return null;
          },
        ),
        quoteAdmin<{ quotes: QuoteSummary[] }>("list").then(
          (r) => {
            setQuoteError(null);
            return r.quotes;
          },
          (e: unknown) => {
            setQuoteError(e instanceof Error ? e.message : "Couldn't load quote invoices.");
            return [] as QuoteSummary[];
          },
        ),
      ]);
      // Keep what was on screen if the one-off list failed to reload.
      if (list) setInvoices(list);
      setQuoteInvoices(quoteRows(quotes));
      setUpdatedAt(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkPaid = async (inv: Invoice) => {
    // Part of the invoice may already be recorded (a part payment through the
    // pay page). Only the balance is recorded here, or the ledger counts the
    // part payment twice.
    let paid: number;
    let balance: number;
    try {
      ({ paid, balance } = invoiceBalance(inv, await getPaymentsForInvoice(inv.invoiceNumber)));
    } catch (err) {
      setPaymentError(
        `Couldn't check the payments already recorded for ${inv.invoiceNumber}: ` +
          `${err instanceof Error ? err.message : "unknown error"}. Nothing was changed; try again.`,
      );
      return;
    }
    const money = (amount: number) => formatMoney(amount, inv.currency);
    const recording =
      balance <= 0
        ? `${money(paid)} is already recorded, so no new payment is added.`
        : paid > 0
          ? `Records the balance of ${money(balance)} (${money(paid)} is already recorded).`
          : `Records a payment of ${money(balance)}.`;
    const ok = await confirm({
      message: `Mark ${inv.invoiceNumber} as paid?`,
      description: `${recording} The invoice status is updated and a payment confirmation email goes to ${inv.clientEmail}.`,
      confirmLabel: "Mark as Paid",
      variant: "success",
      ...(balance > 0 && {
        choiceLabel: "How was this paid?",
        choices: MANUAL_PAYMENT_METHODS,
        defaultChoice: "bank",
      }),
    });
    if (!ok) return;

    // The dialog resolves the selected method; fall back to "bank" only if some
    // caller path ever confirms without a selection.
    const method = typeof ok === "string" ? (ok as ManualPaymentMethod) : "bank";

    setConfirming((prev) => ({ ...prev, [inv.$id]: true }));
    setPaymentError(null);
    try {
      await updateInvoice(inv.$id, { status: "paid" });

      // Audit log: create matching payment record for invoices marked paid
      // manually — i.e. paid off-platform, so the method is whatever the admin
      // selected in the confirm dialog. Payments made through /pay/ are recorded
      // server-side by /api/paystack-webhook, which derives the method from the
      // Paystack channel instead.
      try {
        if (balance > 0)
          await createPayment({
            invoiceNumber: inv.invoiceNumber,
            clientName: inv.clientName,
            clientEmail: inv.clientEmail,
            amount: balance,
            currency: inv.currency,
            method,
            paidAt: new Date().toISOString(),
            status: "success",
          });
      } catch (payErr) {
        // Don't block flow if payment record fails — invoice update already succeeded.
        // Surface it though: a swallowed failure here leaves the invoice paid with no
        // audit-log row, and the Payments tab silently under-reports revenue.
        console.error("Failed to create payment record:", payErr);
        setPaymentError(
          `Invoice ${inv.invoiceNumber} was marked paid, but the payment record failed to save: ` +
            `${payErr instanceof Error ? payErr.message : "unknown error"}. ` +
            `It will be missing from the Payments tab. Re-run scripts/backfill-payments.mjs to repair.`,
        );
      }

      const items = parseItems(inv.items);
      const sym = CURRENCY_SYMBOLS[inv.currency] ?? inv.currency;

      setEmailError(null);
      try {
        const controller = new AbortController();
        const killTimer = window.setTimeout(() => controller.abort(), 30000);
        let emailRes: Response;
        try {
          emailRes = await fetch(apiUrl("/api/send-payment-confirmation"), {
            method: "POST",
            headers: await adminHeaders(),
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

  // Archive replaces the old permanent delete: the row stays and can be restored.
  const setArchivedAt = (res: ArchiveResponse) =>
    setInvoices((prev) =>
      prev.map((i) =>
        i.$id === res.invoice.id ? { ...i, archivedAt: res.invoice.archivedAt } : i,
      ),
    );

  const handleArchive = async (inv: Invoice) => {
    const ok = await confirm({
      message: `Archive ${inv.invoiceNumber}?`,
      description:
        "It moves to the Archived filter and stops counting in the totals. You can restore it at any time.",
      confirmLabel: "Archive",
    });
    if (!ok) return;
    setBusy(inv.$id);
    setActionError(null);
    try {
      setArchivedAt(await quoteAdmin<ArchiveResponse>("archiveInvoice", { id: inv.$id }));
      setNotice(`Archived ${inv.invoiceNumber}.`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't archive the invoice.");
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async (inv: Invoice) => {
    setBusy(inv.$id);
    setActionError(null);
    try {
      setArchivedAt(await quoteAdmin<ArchiveResponse>("restoreInvoice", { id: inv.$id }));
      setNotice(`Restored ${inv.invoiceNumber}.`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't restore the invoice.");
    } finally {
      setBusy(null);
    }
  };

  const copyNumber = async (number: string) => {
    try {
      await navigator.clipboard.writeText(number);
      setNotice(`Copied ${number}.`);
    } catch {
      setActionError("Couldn't copy to the clipboard. Select the invoice number instead.");
    }
  };

  // Overdue depends on the clock, so derive again whenever the data reloads.
  const rows = useMemo(
    () => toInvoiceRows(invoices, quoteInvoices, updatedAt ?? new Date()),
    [invoices, quoteInvoices, updatedAt],
  );
  const kpis = useMemo(() => computeInvoiceKpis(rows), [rows]);
  const searched = useMemo(
    () => rows.filter((r) => inSource(r, source) && matchesInvoiceSearch(r, search)),
    [rows, source, search],
  );
  const shown = useMemo(
    () => searched.filter((r) => inInvoiceFilter(r, filter)),
    [searched, filter],
  );
  const { page, setPage, pageItems, totalItems } = usePagination(shown, PAGE_SIZE);

  // usePagination only clamps the page; a new filter or search starts at page 1.
  const withPageReset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };
  const changeFilter = withPageReset(setFilter);
  const changeSource = withPageReset(setSource);
  const changeSearch = withPageReset(setSearch);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const actionsFor = (row: InvoiceRow): RowMenu => {
    const actions: RowAction[] = [
      {
        label: expanded.has(row.key) ? "Hide details" : "Details",
        onSelect: () => toggle(row.key),
      },
    ];
    const copy: RowAction = {
      label: "Copy invoice number",
      onSelect: () => void copyNumber(row.number),
    };
    if (row.kind === "quote") {
      const quoteId = row.stage.quoteId;
      if (onOpenQuote) actions.push({ label: "Open quote", onSelect: () => onOpenQuote(quoteId) });
      actions.push(copy);
      return { actions, note: "Managed from its quote." };
    }
    const inv = row.invoice;
    actions.push({
      label: "View pay page",
      onSelect: () =>
        window.open(
          `/pay/${encodeURIComponent(inv.invoiceNumber)}`,
          "_blank",
          "noopener,noreferrer",
        ),
    });
    const unpaid = row.status !== "paid";
    // Mark as paid stays hidden on archived invoices: restore first.
    if (unpaid && !row.archived && !confirming[inv.$id])
      actions.push({ label: "Mark as paid", onSelect: () => void handleMarkPaid(inv) });
    actions.push(copy);
    if (busy === inv.$id || confirming[inv.$id]) return { actions, note: "Saving…" };
    if (row.archived) actions.push({ label: "Restore", onSelect: () => void handleRestore(inv) });
    // Paid invoices are money received: no archive (the server refuses too).
    else if (unpaid) actions.push({ label: "Archive", onSelect: () => void handleArchive(inv) });
    return { actions };
  };

  const count = (f: InvoiceFilter) => searched.filter((r) => inInvoiceFilter(r, f)).length;
  const firstLoad = loading && !updatedAt;

  return (
    <div className="space-y-6">
      <TabHeader
        theme={theme}
        title="Invoices"
        subtitle="Quote stage invoices and one-off invoices, newest first."
        customAction={<RefreshControl updatedAt={updatedAt} loading={loading} onRefresh={load} />}
      />

      {emailError && <ErrorBanner message={emailError} onDismiss={() => setEmailError(null)} />}
      {paymentError && (
        <ErrorBanner message={paymentError} onDismiss={() => setPaymentError(null)} />
      )}
      {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}
      {invoiceError && (
        <ErrorBanner
          message={`One-off invoices couldn't load: ${invoiceError}`}
          onDismiss={() => setInvoiceError(null)}
        />
      )}
      {quoteError && (
        <ErrorBanner
          message={`Quote invoices couldn't load: ${quoteError}`}
          onDismiss={() => setQuoteError(null)}
        />
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {notice}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Invoiced">
          <MoneyTotals totals={kpis.invoiced} />
        </KpiCard>
        <KpiCard label="Paid">
          <MoneyTotals totals={kpis.paid} />
        </KpiCard>
        <KpiCard label="Outstanding">
          <CountWithTotals
            count={kpis.outstandingCount}
            noun={["invoice", "invoices"]}
            totals={kpis.outstanding}
          />
        </KpiCard>
        <KpiCard label="Overdue">
          <CountWithTotals
            count={kpis.overdueCount}
            noun={["invoice", "invoices"]}
            totals={kpis.overdue}
          />
        </KpiCard>
      </div>

      <FilterPills
        tabs={FILTERS.map((f) => ({ key: f, label: INVOICE_FILTER_LABELS[f], count: count(f) }))}
        active={filter}
        onChange={(k) => changeFilter(k as InvoiceFilter)}
        theme={theme}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField
          label="Search invoices"
          value={search}
          onChange={changeSearch}
          placeholder="Invoice number, client, email or quote number"
        />
        <SelectField
          label="Source"
          value={source}
          options={SOURCE_OPTIONS}
          onChange={changeSource}
        />
      </div>

      {firstLoad ? (
        <p className="py-12 text-center" style={muted}>
          Loading invoices…
        </p>
      ) : shown.length === 0 ? (
        <EmptyState
          theme={theme}
          icon={FaFileInvoiceDollar}
          message={
            rows.length === 0
              ? "No invoices yet. They appear here when you send a quote or a one-off invoice."
              : search || source !== "all"
                ? "No invoices match your search."
                : filter === "all"
                  ? "Nothing here. Archived invoices are under their own filter."
                  : `No ${INVOICE_FILTER_LABELS[filter].toLowerCase()} invoices.`
          }
        />
      ) : (
        <div>
          <InvoicesTable
            rows={pageItems}
            expanded={expanded}
            onToggle={toggle}
            actionsFor={actionsFor}
          />
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
