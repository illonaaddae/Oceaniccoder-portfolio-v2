import React, { useEffect, useState, useCallback } from "react";
import {
  FaCalendarAlt,
  FaEnvelope,
  FaPhone,
  FaClock,
  FaSync,
  FaGlobe,
  FaCheck,
  FaTimes,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { getBookings, updateBookingStatus, deleteBooking } from "@/services/api/bookings";
import type { Booking } from "@/services/api/bookings";
import { useConfirm } from "../ConfirmContext";
import { Pagination } from "@/components/common/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { FilterPills } from "@/components/ui/FilterPills";

const PAGE_SIZE = 10;

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled";

interface BookingsTabProps {
  theme: "light" | "dark";
}

const STATUS_STYLES: Record<string, { label: string; pill: string; dot: string }> = {
  pending: {
    label: "Pending",
    pill: "bg-warning-400/10 text-warning-400 border-warning-400/30",
    dot: "bg-warning-400",
  },
  confirmed: {
    label: "Confirmed",
    pill: "bg-success-400/10 text-success-400 border-success-400/30",
    dot: "bg-success-400",
  },
  cancelled: {
    label: "Cancelled",
    pill: "bg-error-400/10 text-error-400 border-error-400/30",
    dot: "bg-error-400",
  },
};

const MEETING_LABELS: Record<string, string> = {
  discovery: "Discovery Call",
  project: "Project Discussion",
  mentorship: "Mentorship Session",
  general: "General Chat",
};

export const BookingsTab: React.FC<BookingsTabProps> = ({ theme }) => {
  const confirm = useConfirm();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");

  const isDark = theme === "dark";

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const data = await getBookings();
      setBookings(data);
    } catch {
      setError("Failed to load bookings.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      message: "Delete booking?",
      description: "This will permanently remove the booking.",
    });
    if (!ok) return;
    setUpdating(id);
    try {
      await deleteBooking(id);
      setBookings((prev) => prev.filter((b) => b.$id !== id));
    } catch {
      setError("Failed to delete booking.");
    } finally {
      setUpdating(null);
    }
  };

  const handleStatus = async (booking: Booking, status: "confirmed" | "cancelled") => {
    setUpdating(booking.$id!);
    try {
      await updateBookingStatus(booking.$id!, status);
      setBookings((prev) => prev.map((b) => (b.$id === booking.$id ? { ...b, status } : b)));
    } catch {
      setError("Failed to update booking status.");
    } finally {
      setUpdating(null);
    }
  };

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;
  const hasCancelled = cancelledCount > 0;

  const statCards = [
    {
      key: "all" as const,
      label: "Total",
      count: bookings.length,
      sub: "All requests",
      icon: FaCalendarAlt,
      grad: "from-oceanic-500 to-oceanic-700",
    },
    {
      key: "pending" as const,
      label: "Pending",
      count: pendingCount,
      sub: "Awaiting response",
      icon: FaClock,
      grad: "from-warning-500 to-warning-700",
    },
    {
      key: "confirmed" as const,
      label: "Confirmed",
      count: confirmedCount,
      sub: "Accepted",
      icon: FaCheckCircle,
      grad: "from-success-500 to-success-700",
    },
    ...(hasCancelled
      ? [
          {
            key: "cancelled" as const,
            label: "Cancelled",
            count: cancelledCount,
            sub: "Declined",
            icon: FaTimesCircle,
            grad: "from-error-500 to-error-700",
          },
        ]
      : []),
  ];

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: bookings.length },
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "confirmed", label: "Confirmed", count: confirmedCount },
    ...(hasCancelled
      ? [{ key: "cancelled" as const, label: "Cancelled", count: cancelledCount }]
      : []),
  ];

  const filtered =
    activeStatus === "all"
      ? bookings
      : bookings.filter((b) => (b.status ?? "pending") === activeStatus);
  const { page, setPage, pageItems, totalItems } = usePagination(filtered, PAGE_SIZE);

  const subText = isDark ? "text-slate-400" : "text-slate-500";
  const meetingBadge = isDark
    ? "bg-oceanic-500/20 text-oceanic-400 border-oceanic-500/30"
    : "bg-oceanic-50 text-oceanic-700 border-oceanic-200";

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between gap-3 bg-error-400/10 border border-error-400/40 text-error-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
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
            <FaCalendarAlt className="text-brand-link dark:text-oceanic-400" /> Bookings
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Meeting requests submitted via the booking page
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)" }}
        >
          <FaSync className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {!loading && bookings.length > 0 && (
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
                    <p className={`text-xs mt-0.5 truncate ${subText}`}>{s.sub}</p>
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
          <FilterPills
            tabs={tabs}
            active={activeStatus}
            onChange={(k) => setActiveStatus(k as StatusFilter)}
            theme={theme}
          />
        </>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-oceanic-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="glass-card text-center py-20">
          <FaCalendarAlt className="mx-auto text-4xl mb-3 opacity-30" />
          <p className="font-medium">No bookings yet</p>
          <p className="text-sm mt-1">Bookings submitted via /booking will appear here</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className={subText}>No bookings in this view.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pageItems.map((b) => {
            const sc = STATUS_STYLES[b.status] ?? STATUS_STYLES.pending;
            return (
              <div key={b.$id} className="glass-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {/* Left: name + meeting type */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3
                        className={`font-bold text-lg ${isDark ? "text-white" : "text-slate-900"}`}
                      >
                        {b.name}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${sc.pill}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium ${meetingBadge}`}
                      >
                        {MEETING_LABELS[b.meetingType] ?? b.meetingType}
                      </span>
                    </div>

                    {/* Contact info */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span
                        className={`flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}
                      >
                        <FaEnvelope className="shrink-0 text-brand-link dark:text-oceanic-400" />
                        <a href={`mailto:${b.email}`} className="hover:underline">
                          {b.email}
                        </a>
                      </span>
                      {b.phone && (
                        <span
                          className={`flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}
                        >
                          <FaPhone className="shrink-0 text-brand-link dark:text-oceanic-400" />
                          {b.phone}
                        </span>
                      )}
                      <span
                        className={`flex items-center gap-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}
                      >
                        <FaClock className="shrink-0" />
                        {b.preferredDate} · {b.preferredTime}
                      </span>
                      {b.timezone && (
                        <span
                          className={`flex items-center gap-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}
                        >
                          <FaGlobe className="shrink-0" />
                          {b.timezone}
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    {b.message && (
                      <p
                        className={`mt-3 text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}
                      >
                        "{b.message}"
                      </p>
                    )}
                  </div>

                  {/* Right: date + actions */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    {b.$createdAt && (
                      <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {new Date(b.$createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}

                    {/* Action buttons — only show when not already in a final state */}
                    {b.status !== "confirmed" && b.status !== "cancelled" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={updating === b.$id}
                          onClick={() => handleStatus(b, "confirmed")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-success-400/10 text-success-400 border border-success-400/30 hover:bg-success-400/20 transition-all disabled:opacity-50"
                        >
                          <FaCheck className="text-[10px]" />
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={updating === b.$id}
                          onClick={() => handleStatus(b, "cancelled")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-error-400/10 text-error-400 border border-error-400/30 hover:bg-error-400/20 transition-all disabled:opacity-50"
                        >
                          <FaTimes className="text-[10px]" />
                          Decline
                        </button>
                      </div>
                    )}

                    {/* Allow reverting a confirmed booking to cancelled */}
                    {b.status === "confirmed" && (
                      <button
                        type="button"
                        disabled={updating === b.$id}
                        onClick={() => handleStatus(b, "cancelled")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-error-400/10 text-error-400 border border-error-400/30 hover:bg-error-400/20 transition-all disabled:opacity-50"
                      >
                        <FaTimes className="text-[10px]" />
                        Cancel
                      </button>
                    )}

                    {/* Delete — always visible */}
                    <button
                      type="button"
                      disabled={updating === b.$id}
                      onClick={() => handleDelete(b.$id!)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-error-500/10 text-error-400 border border-error-500/30 hover:bg-error-500/20 transition-all disabled:opacity-50"
                    >
                      <FaTrash className="text-[10px]" />
                      Delete
                    </button>
                  </div>
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
};
