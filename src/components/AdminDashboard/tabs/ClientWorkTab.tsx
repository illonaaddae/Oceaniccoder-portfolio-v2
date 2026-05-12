import React, { useEffect, useState, useCallback } from "react";
import {
  FaBriefcase,
  FaSync,
  FaEnvelope,
  FaPhone,
  FaExternalLinkAlt,
  FaTrash,
  FaFileInvoiceDollar,
  FaCheck,
} from "react-icons/fa";
import { getInquiries, updateInquiry, deleteInquiry } from "@/services/api/inquiries";
import type { ProjectInquiry } from "@/types";
import InvoiceModal from "./ClientWork/InvoiceModal";

interface ClientWorkTabProps {
  theme: "light" | "dark";
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  reviewed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  quoted: "bg-oceanic-500/20 text-oceanic-400 border-oceanic-500/30",
  declined: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_OPTIONS = ["new", "reviewed", "quoted", "declined"] as const;

export default function ClientWorkTab({ theme }: ClientWorkTabProps) {
  const [inquiries, setInquiries] = useState<ProjectInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceTarget, setInvoiceTarget] = useState<ProjectInquiry | null>(null);

  const cardBg = theme === "dark" ? "bg-slate-800/60" : "bg-white/80";
  const textSec = theme === "dark" ? "text-slate-400" : "text-slate-500";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInquiries(await getInquiries());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: string, status: ProjectInquiry["status"]) => {
    setInquiries((prev) => prev.map((i) => (i.$id === id ? { ...i, status } : i)));
    await updateInquiry(id, { status });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this inquiry?")) return;
    await deleteInquiry(id);
    setInquiries((prev) => prev.filter((i) => i.$id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FaBriefcase className="text-oceanic-500" /> Client Work
          </h2>
          <p className={`text-sm mt-1 ${textSec}`}>
            {inquiries.length} {inquiries.length === 1 ? "inquiry" : "inquiries"} total
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/inquiry"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            <FaExternalLinkAlt className="text-xs" /> View Form
          </a>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)" }}
          >
            <FaSync className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Share link banner */}
      <div
        className="rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
        style={{ background: "var(--accent-teal-subtle)", border: "1px solid var(--accent-teal)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--accent-teal)" }}>
          Share this link with clients:
        </p>
        <code
          className="text-sm px-3 py-1 rounded-lg select-all"
          style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          oceaniccoder.dev/inquiry
        </code>
      </div>

      {/* Inquiries */}
      {loading ? (
        <div className="text-center py-16 text-[var(--text-secondary)]">Loading...</div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-16">
          <FaBriefcase className="text-5xl text-[var(--text-secondary)] mx-auto mb-4" />
          <p className="text-[var(--text-primary)] font-semibold mb-1">No inquiries yet</p>
          <p className={`text-sm ${textSec}`}>Share your inquiry link to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inq) => (
            <div
              key={inq.$id}
              className={`${cardBg} rounded-2xl p-6 border`}
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{inq.name}</h3>
                  <div className={`flex items-center gap-4 mt-1 text-sm ${textSec} flex-wrap`}>
                    <span className="flex items-center gap-1">
                      <FaEnvelope className="text-oceanic-400" /> {inq.email}
                    </span>
                    {inq.phone && (
                      <span className="flex items-center gap-1">
                        <FaPhone className="text-oceanic-400" /> {inq.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[inq.status] || STATUS_STYLES.new}`}
                  >
                    {inq.status}
                  </span>
                  <select
                    value={inq.status}
                    onChange={(e) =>
                      handleStatusChange(inq.$id, e.target.value as ProjectInquiry["status"])
                    }
                    className="px-2 py-1 rounded-lg text-xs text-[var(--text-primary)] outline-none"
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Details */}
              <div className="grid sm:grid-cols-3 gap-3 mb-4 text-sm">
                <div className="rounded-lg px-3 py-2" style={{ background: "var(--bg-primary)" }}>
                  <p className={`text-xs ${textSec} mb-0.5`}>Project Type</p>
                  <p className="font-medium text-[var(--text-primary)]">{inq.projectType}</p>
                </div>
                {inq.timeline && (
                  <div className="rounded-lg px-3 py-2" style={{ background: "var(--bg-primary)" }}>
                    <p className={`text-xs ${textSec} mb-0.5`}>Timeline</p>
                    <p className="font-medium text-[var(--text-primary)]">{inq.timeline}</p>
                  </div>
                )}
                {inq.budgetRange && (
                  <div className="rounded-lg px-3 py-2" style={{ background: "var(--bg-primary)" }}>
                    <p className={`text-xs ${textSec} mb-0.5`}>Budget</p>
                    <p className="font-medium text-[var(--text-primary)]">{inq.budgetRange}</p>
                  </div>
                )}
              </div>

              <p className={`text-sm ${textSec} mb-3 line-clamp-3`}>{inq.description}</p>

              {inq.features && inq.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {inq.features.map((f) => (
                    <span
                      key={f}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-oceanic-400"
                      style={{ background: "var(--accent-teal-subtle)" }}
                    >
                      <FaCheck className="text-[10px]" /> {f}
                    </span>
                  ))}
                </div>
              )}

              {inq.notes && <p className={`text-sm italic ${textSec} mb-4`}>Notes: {inq.notes}</p>}

              {/* Actions */}
              <div
                className="flex items-center gap-2 pt-4"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <button
                  onClick={() => setInvoiceTarget(inq)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
                  }}
                >
                  <FaFileInvoiceDollar /> Generate Invoice
                </button>
                <a
                  href={`mailto:${inq.email}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <FaEnvelope /> Reply
                </a>
                <button
                  onClick={() => handleDelete(inq.$id)}
                  className="ml-auto p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                  title="Delete inquiry"
                >
                  <FaTrash />
                </button>
              </div>

              <p className={`text-xs ${textSec} mt-2`}>
                Submitted{" "}
                {inq.$createdAt ? new Date(inq.$createdAt).toLocaleDateString() : "recently"}
              </p>
            </div>
          ))}
        </div>
      )}

      {invoiceTarget && (
        <InvoiceModal
          inquiry={invoiceTarget}
          onClose={() => setInvoiceTarget(null)}
          theme={theme}
        />
      )}
    </div>
  );
}
