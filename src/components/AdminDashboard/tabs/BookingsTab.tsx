import React, { useEffect, useState, useCallback } from "react";
import { FaCalendarAlt, FaEnvelope, FaPhone, FaClock, FaSync, FaGlobe, FaCheck, FaTimes } from "react-icons/fa";
import { getBookings, updateBookingStatus } from "@/services/api/bookings";
import type { Booking } from "@/services/api/bookings";

interface BookingsTabProps {
  theme: "light" | "dark";
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const MEETING_LABELS: Record<string, string> = {
  discovery: "Discovery Call",
  project: "Project Discussion",
  mentorship: "Mentorship Session",
  general: "General Chat",
};

export const BookingsTab: React.FC<BookingsTabProps> = ({ theme }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

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

  const handleStatus = async (id: string, status: "confirmed" | "cancelled") => {
    setUpdating(id);
    try {
      await updateBookingStatus(id, status);
      setBookings((prev) =>
        prev.map((b) => (b.$id === id ? { ...b, status } : b)),
      );
    } catch {
      setError("Failed to update booking status.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            Bookings
          </h1>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Meeting requests submitted via the booking page
          </p>
        </div>
        <button
          onClick={() => load()}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
            isDark
              ? "border-slate-700 text-slate-300 hover:bg-slate-800"
              : "border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          <FaSync className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: bookings.length, color: "text-blue-400" },
          { label: "Pending", value: bookings.filter((b) => b.status === "pending").length, color: "text-yellow-400" },
          { label: "Confirmed", value: bookings.filter((b) => b.status === "confirmed").length, color: "text-green-400" },
          { label: "Cancelled", value: bookings.filter((b) => b.status === "cancelled").length, color: "text-red-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl p-4 border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"}`}
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{stat.label}</p>
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-oceanic-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className={`text-center py-20 rounded-xl border ${isDark ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>
          <FaCalendarAlt className="mx-auto text-4xl mb-3 opacity-30" />
          <p className="font-medium">No bookings yet</p>
          <p className="text-sm mt-1">Bookings submitted via /booking will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div
              key={b.$id}
              className={`rounded-xl border p-5 transition-all ${
                isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Left: name + meeting type */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h3 className={`font-bold text-lg ${isDark ? "text-white" : "text-slate-900"}`}>
                      {b.name}
                    </h3>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_STYLES[b.status] ?? STATUS_STYLES.pending}`}>
                      {b.status ?? "pending"}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${isDark ? "bg-oceanic-500/20 text-oceanic-400 border-oceanic-500/30" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                      {MEETING_LABELS[b.meetingType] ?? b.meetingType}
                    </span>
                  </div>

                  {/* Contact info */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className={`flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      <FaEnvelope className="shrink-0 text-oceanic-400" />
                      <a href={`mailto:${b.email}`} className="hover:underline">{b.email}</a>
                    </span>
                    {b.phone && (
                      <span className={`flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        <FaPhone className="shrink-0 text-oceanic-400" />
                        {b.phone}
                      </span>
                    )}
                    <span className={`flex items-center gap-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      <FaClock className="shrink-0" />
                      {b.preferredDate} · {b.preferredTime}
                    </span>
                    {b.timezone && (
                      <span className={`flex items-center gap-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        <FaGlobe className="shrink-0" />
                        {b.timezone}
                      </span>
                    )}
                  </div>

                  {/* Message */}
                  {b.message && (
                    <p className={`mt-3 text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      "{b.message}"
                    </p>
                  )}
                </div>

                {/* Right: date + actions */}
                <div className="flex flex-col items-end gap-3 shrink-0">
                  {b.$createdAt && (
                    <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      {new Date(b.$createdAt).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  )}

                  {/* Action buttons — only show when not already in a final state */}
                  {b.status !== "confirmed" && b.status !== "cancelled" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={updating === b.$id}
                        onClick={() => handleStatus(b.$id!, "confirmed")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all disabled:opacity-50"
                      >
                        <FaCheck className="text-[10px]" />
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={updating === b.$id}
                        onClick={() => handleStatus(b.$id!, "cancelled")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all disabled:opacity-50"
                      >
                        <FaTimes className="text-[10px]" />
                        Decline
                      </button>
                    </div>
                  )}

                  {/* Allow reverting a confirmed booking to pending */}
                  {b.status === "confirmed" && (
                    <button
                      type="button"
                      disabled={updating === b.$id}
                      onClick={() => handleStatus(b.$id!, "cancelled")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all disabled:opacity-50"
                    >
                      <FaTimes className="text-[10px]" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
