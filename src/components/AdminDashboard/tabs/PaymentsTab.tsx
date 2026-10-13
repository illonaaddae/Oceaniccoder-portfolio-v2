import React, { useMemo, useState } from "react";
import { FaCreditCard } from "react-icons/fa";
import type { Payment } from "@/services/api/payments";
import { quoteAdmin } from "@/services/api/quotes";
import { TabHeader } from "@/components/ui/TabHeader";
import { FilterPills } from "@/components/ui/FilterPills";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { useConfirm } from "../ConfirmContext";
import { usePaymentsFeed } from "./Payments/usePaymentsFeed";
import { PaymentsTable } from "./Payments/PaymentsTable";
import type { RowAction } from "./shared/RowActions";
import { CountWithTotals, KpiCard, MoneyTotals } from "./shared/KpiCard";
import { ErrorBanner, RefreshControl, SearchField, SelectField } from "./shared/controls";
import { canArchive } from "./Payments/paymentStatus";
import {
  FILTER_LABELS,
  METHOD_OPTIONS,
  computeKpis,
  inFilter,
  matchesSearch,
  toRows,
  type MethodFilter,
  type PaymentFilter,
  type PaymentRow,
} from "./Payments/paymentView";

const PAGE_SIZE = 15;
const FILTERS: PaymentFilter[] = ["all", "paid", "pending", "failed", "abandoned", "archived"];

interface PaymentsTabProps {
  theme: "light" | "dark";
  /** Opens a quote in the Quotes tab, same handoff as the Invoices tab. */
  onOpenQuote?: (quoteId: string) => void;
}

type ArchiveResponse = { payment: { id: string; archivedAt: string | null } };

const muted: React.CSSProperties = { color: "var(--text-secondary)" };

export default function PaymentsTab({ theme, onOpenQuote }: PaymentsTabProps) {
  const confirm = useConfirm();
  const feed = usePaymentsFeed();
  const { payments, setPayments } = feed;
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [method, setMethod] = useState<MethodFilter>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  // Abandonment depends on the clock, so re-derive whenever the list reloads
  // (at least every poll) rather than once.
  const rows = useMemo(
    () => toRows(payments, (feed.updatedAt ?? new Date()).getTime()),
    [payments, feed.updatedAt],
  );
  const kpis = useMemo(
    () => computeKpis(rows, feed.updatedAt ?? new Date()),
    [rows, feed.updatedAt],
  );

  const searched = useMemo(
    () =>
      rows.filter(
        (r) =>
          (method === "all" || r.payment.method === method) && matchesSearch(r.payment, search),
      ),
    [rows, method, search],
  );
  const shown = useMemo(() => searched.filter((r) => inFilter(r, filter)), [searched, filter]);
  const { page, setPage, pageItems, totalItems } = usePagination(shown, PAGE_SIZE);

  // usePagination only clamps the page; a new filter or search starts at page 1.
  const withPageReset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };
  const changeFilter = withPageReset(setFilter);
  const changeMethod = withPageReset(setMethod);
  const changeSearch = withPageReset(setSearch);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const applyArchive = (res: ArchiveResponse) =>
    setPayments((prev: Payment[]) =>
      prev.map((p) =>
        p.$id === res.payment.id ? { ...p, archivedAt: res.payment.archivedAt } : p,
      ),
    );

  const archive = async (p: Payment) => {
    const ok = await confirm({
      message: "Archive this payment attempt?",
      description:
        "It moves to the Archived filter and stops counting in the totals. You can restore it at any time.",
      confirmLabel: "Archive",
    });
    if (!ok) return;
    setBusy(p.$id);
    setActionError(null);
    try {
      applyArchive(await quoteAdmin<ArchiveResponse>("archivePayment", { id: p.$id }));
      setNotice(`Archived ${p.paystackReference || p.invoiceNumber}.`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't archive the payment.");
    } finally {
      setBusy(null);
    }
  };

  const restore = async (p: Payment) => {
    setBusy(p.$id);
    setActionError(null);
    try {
      applyArchive(await quoteAdmin<ArchiveResponse>("restorePayment", { id: p.$id }));
      setNotice(`Restored ${p.paystackReference || p.invoiceNumber}.`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't restore the payment.");
    } finally {
      setBusy(null);
    }
  };

  const copyReference = async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref);
      setNotice(`Copied ${ref}.`);
    } catch {
      setActionError(
        "Couldn't copy to the clipboard. Select the reference in the details instead.",
      );
    }
  };

  const actionsFor = (row: PaymentRow): { actions: RowAction[]; note?: string } => {
    const p = row.payment;
    const actions: RowAction[] = [
      { label: expanded.has(p.$id) ? "Hide details" : "Details", onSelect: () => toggle(p.$id) },
    ];
    const quoteId = p.quoteId;
    if (quoteId && onOpenQuote)
      actions.push({ label: "Open quote", onSelect: () => onOpenQuote(quoteId) });
    if (p.paystackReference) {
      const ref = p.paystackReference;
      actions.push({ label: "Copy reference", onSelect: () => void copyReference(ref) });
    }
    if (busy === p.$id) return { actions, note: "Saving…" };
    if (row.archived) actions.push({ label: "Restore", onSelect: () => void restore(p) });
    else if (canArchive(p)) actions.push({ label: "Archive", onSelect: () => void archive(p) });
    else if (row.status === "paid")
      return { actions, note: "Paid payments stay on record and can't be archived." };
    else
      return {
        actions,
        note: "Money was taken on this payment (refund or follow-up owed), so it stays on record.",
      };
    return { actions };
  };

  const count = (f: PaymentFilter) => searched.filter((r) => inFilter(r, f)).length;
  const rate = kpis.successRate === null ? "None yet" : `${Math.round(kpis.successRate * 100)}%`;
  const firstLoad = feed.loading && !feed.updatedAt;
  const error = actionError ?? feed.error;

  return (
    <div className="space-y-6">
      <TabHeader
        theme={theme}
        title="Payments"
        subtitle="Every payment and checkout attempt, newest first."
        customAction={
          <RefreshControl
            updatedAt={feed.updatedAt}
            stale={feed.stale}
            loading={feed.loading}
            onRefresh={feed.refresh}
          />
        }
      />

      {error && (
        <ErrorBanner
          message={error}
          onDismiss={() => {
            setActionError(null);
            feed.clearError();
          }}
        />
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {notice}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Received this month">
          <MoneyTotals totals={kpis.thisMonth} />
        </KpiCard>
        <KpiCard label="Received all time">
          <MoneyTotals totals={kpis.allTime} />
        </KpiCard>
        <KpiCard label="Awaiting payment">
          <CountWithTotals
            count={kpis.awaitingCount}
            noun={["payment", "payments"]}
            totals={kpis.awaiting}
          />
        </KpiCard>
        <KpiCard label="Success rate">
          <p className="mt-1 text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {rate}
          </p>
          <p className="text-xs" style={muted}>
            Paid out of paid, failed and abandoned
          </p>
        </KpiCard>
      </div>

      <FilterPills
        tabs={FILTERS.map((f) => ({ key: f, label: FILTER_LABELS[f], count: count(f) }))}
        active={filter}
        onChange={(k) => changeFilter(k as PaymentFilter)}
        theme={theme}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField
          label="Search payments"
          value={search}
          onChange={changeSearch}
          placeholder="Client, email, reference, invoice or quote number"
        />
        <SelectField
          label="Method"
          value={method}
          options={METHOD_OPTIONS}
          onChange={changeMethod}
        />
      </div>

      {firstLoad ? (
        <p className="py-12 text-center" style={muted}>
          Loading payments…
        </p>
      ) : shown.length === 0 ? (
        <EmptyState
          theme={theme}
          icon={FaCreditCard}
          message={
            payments.length === 0
              ? "No payments yet. They appear here when a client starts a checkout."
              : search || method !== "all"
                ? "No payments match your search."
                : filter === "all"
                  ? "Nothing here. Abandoned and archived attempts are under their own filters."
                  : `No ${FILTER_LABELS[filter].toLowerCase()} payments.`
          }
        />
      ) : (
        <div>
          <PaymentsTable
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
