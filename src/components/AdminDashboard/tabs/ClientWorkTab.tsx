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
  FaClock,
  FaMoneyBillWave,
  FaLayerGroup,
  FaStickyNote,
  FaCalendarAlt,
  FaPlus,
  FaEye,
  FaFileAlt,
} from "react-icons/fa";
import { getInquiries, updateInquiry, deleteInquiry } from "@/services/api/inquiries";
import { getInvoices } from "@/services/api/invoices";
import type { ProjectInquiry, Invoice } from "@/types";
import InvoiceModal from "./ClientWork/InvoiceModal";
import { useConfirm } from "../ConfirmContext";
import { apiUrl } from "@/utils/apiUrl";

interface ClientWorkTabProps {
  theme: "light" | "dark";
}

const STATUS_CONFIG: Record<string, { label: string; pill: string; border: string; dot: string }> =
  {
    new: {
      label: "New",
      pill: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      border: "border-l-blue-500",
      dot: "bg-blue-400",
    },
    reviewed: {
      label: "Reviewed",
      pill: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
      border: "border-l-yellow-500",
      dot: "bg-yellow-400",
    },
    quoted: {
      label: "Quoted",
      pill: "bg-teal-500/15 text-teal-400 border-teal-500/30",
      border: "border-l-teal-500",
      dot: "bg-teal-400",
    },
    declined: {
      label: "Declined",
      pill: "bg-red-500/15 text-red-400 border-red-500/30",
      border: "border-l-red-500",
      dot: "bg-red-400",
    },
  };

const STATUS_OPTIONS = ["new", "reviewed", "quoted", "declined"] as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "Recently";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ClientWorkTab({ theme }: ClientWorkTabProps) {
  const confirm = useConfirm();
  const [inquiries, setInquiries] = useState<ProjectInquiry[]>([]);
  const [invoicesByInquiry, setInvoicesByInquiry] = useState<Record<string, Invoice[]>>({});
  const [loading, setLoading] = useState(true);
  const [invoiceTarget, setInvoiceTarget] = useState<{
    inquiry: ProjectInquiry;
    existing?: Invoice;
  } | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<ProjectInquiry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inqs, invs] = await Promise.all([getInquiries(), getInvoices()]);
      setInquiries(inqs);
      const map: Record<string, Invoice[]> = {};
      for (const inv of invs) {
        if (inv.inquiryId) {
          map[inv.inquiryId] = [...(map[inv.inquiryId] ?? []), inv];
        }
      }
      setInvoicesByInquiry(map);
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

    if (status === "reviewed" || status === "quoted" || status === "declined") {
      const inq = inquiries.find((i) => i.$id === id);
      if (inq) {
        void fetch(apiUrl("/api/send-inquiry-status"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            clientName: inq.name,
            clientEmail: inq.email,
            projectType: inq.projectType,
          }),
        });
      }
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      message: "Delete inquiry?",
      description: "This will permanently remove the inquiry.",
    });
    if (!ok) return;
    await deleteInquiry(id);
    setInquiries((prev) => prev.filter((i) => i.$id !== id));
  };

  const newCount = inquiries.filter((i) => i.status === "new").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FaBriefcase className="text-oceanic-500" /> Client Work
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {inquiries.length} {inquiries.length === 1 ? "inquiry" : "inquiries"}
            {newCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">
                {newCount} new
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/inquiry"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition hover:text-[var(--text-primary)]"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
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
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--accent-teal)" }}>
            Client inquiry link
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Share with potential clients to receive project briefs
          </p>
        </div>
        <code
          className="text-sm px-3 py-1.5 rounded-lg select-all font-mono"
          style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          oceaniccoder.dev/inquiry
        </code>
      </div>

      {/* Inquiries */}
      {loading ? (
        <div className="text-center py-16" style={{ color: "var(--text-secondary)" }}>
          Loading...
        </div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-16">
          <FaBriefcase
            className="text-5xl mx-auto mb-4"
            style={{ color: "var(--text-secondary)" }}
          />
          <p className="font-semibold text-[var(--text-primary)] mb-1">No inquiries yet</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Share your inquiry link to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inq) => {
            const sc = STATUS_CONFIG[inq.status] ?? STATUS_CONFIG.new;

            return (
              <div
                key={inq.$id}
                className={`rounded-2xl border-l-4 overflow-hidden ${sc.border}`}
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderLeftWidth: "4px",
                }}
              >
                {/* Card Header */}
                <div className="p-5 pb-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
                      }}
                    >
                      {getInitials(inq.name)}
                    </div>

                    {/* Name + contact */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h3 className="text-base font-bold text-[var(--text-primary)]">
                          {inq.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          {/* Status pill */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${sc.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                          {/* Status changer */}
                          <select
                            value={inq.status}
                            onChange={(e) =>
                              handleStatusChange(
                                inq.$id,
                                e.target.value as ProjectInquiry["status"],
                              )
                            }
                            title="Change status"
                            className="px-2 py-1 rounded-lg text-xs outline-none"
                            style={{
                              background: "var(--bg-primary)",
                              border: "1px solid var(--border-subtle)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-4 mt-1 text-xs flex-wrap"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <a
                          href={`mailto:${inq.email}`}
                          className="flex items-center gap-1 hover:text-[var(--accent-teal)] transition"
                        >
                          <FaEnvelope className="text-oceanic-400" /> {inq.email}
                        </a>
                        {inq.phone && (
                          <span className="flex items-center gap-1">
                            <FaPhone className="text-oceanic-400" /> {inq.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FaCalendarAlt className="text-oceanic-400" />{" "}
                          {formatDate(inq.$createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

                {/* Metadata grid */}
                <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                    style={{ background: "var(--bg-primary)" }}
                  >
                    <FaLayerGroup className="text-oceanic-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p
                        className="text-xs font-medium mb-0.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Project Type
                      </p>
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {inq.projectType}
                      </p>
                    </div>
                  </div>
                  {inq.timeline && (
                    <div
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                      style={{ background: "var(--bg-primary)" }}
                    >
                      <FaClock className="text-oceanic-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p
                          className="text-xs font-medium mb-0.5"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Timeline
                        </p>
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {inq.timeline}
                        </p>
                      </div>
                    </div>
                  )}
                  {inq.budgetRange && (
                    <div
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                      style={{ background: "var(--bg-primary)" }}
                    >
                      <FaMoneyBillWave className="text-oceanic-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p
                          className="text-xs font-medium mb-0.5"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Budget
                        </p>
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {inq.budgetRange}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

                {/* Actions */}
                <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
                  {(() => {
                    const existingInvs = invoicesByInquiry[inq.$id] ?? [];
                    const latest = existingInvs[0];
                    if (latest) {
                      return (
                        <>
                          <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{
                              background: "var(--bg-primary)",
                              border: "1px solid var(--border-subtle)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <FaFileInvoiceDollar className="text-oceanic-400" />
                            <span>{latest.invoiceNumber}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${latest.status === "paid" ? "bg-green-500/20 text-green-400" : "bg-teal-500/20 text-teal-400"}`}
                            >
                              {latest.status}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInvoiceTarget({ inquiry: inq, existing: latest })}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
                            style={{
                              background:
                                "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
                            }}
                          >
                            <FaFileInvoiceDollar /> Edit & Resend
                          </button>
                          <button
                            type="button"
                            onClick={() => setInvoiceTarget({ inquiry: inq })}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition hover:text-[var(--text-primary)]"
                            style={{
                              background: "var(--bg-primary)",
                              border: "1px solid var(--border-subtle)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <FaPlus className="text-xs" /> New Invoice
                          </button>
                        </>
                      );
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => setInvoiceTarget({ inquiry: inq })}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
                        }}
                      >
                        <FaFileInvoiceDollar /> Generate Invoice
                      </button>
                    );
                  })()}
                  <a
                    href={`mailto:${inq.email}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition hover:text-[var(--text-primary)]"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <FaEnvelope /> Reply
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedInquiry(inq)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition hover:text-[var(--text-primary)]"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <FaEye /> Details
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(inq.$id)}
                    className="ml-auto p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                    title="Delete inquiry"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {invoiceTarget && (
        <InvoiceModal
          inquiry={invoiceTarget.inquiry}
          existingInvoice={invoiceTarget.existing}
          onClose={() => {
            setInvoiceTarget(null);
            void load();
          }}
          theme={theme}
        />
      )}

      {selectedInquiry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setSelectedInquiry(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden overflow-y-auto min-w-0"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              maxHeight: "90vh",
            }}
          >
            {/* Modal header */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{
                background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                >
                  {getInitials(selectedInquiry.name)}
                </div>
                <div>
                  <p className="text-base font-bold text-white">{selectedInquiry.name}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {formatDate(selectedInquiry.$createdAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white transition hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Contact */}
              <div
                className="flex flex-wrap gap-3 text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                <a
                  href={`mailto:${selectedInquiry.email}`}
                  className="flex items-center gap-1.5 hover:text-[var(--accent-teal)] transition"
                >
                  <FaEnvelope className="text-oceanic-400" /> {selectedInquiry.email}
                </a>
                {selectedInquiry.phone && (
                  <span className="flex items-center gap-1.5">
                    <FaPhone className="text-oceanic-400" /> {selectedInquiry.phone}
                  </span>
                )}
              </div>

              {/* Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--bg-primary)" }}>
                  <p
                    className="text-xs font-medium mb-0.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Project Type
                  </p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {selectedInquiry.projectType}
                  </p>
                </div>
                {selectedInquiry.timeline && (
                  <div
                    className="rounded-xl px-3 py-2.5"
                    style={{ background: "var(--bg-primary)" }}
                  >
                    <p
                      className="text-xs font-medium mb-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Timeline
                    </p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {selectedInquiry.timeline}
                    </p>
                  </div>
                )}
                {selectedInquiry.budgetRange && (
                  <div
                    className="rounded-xl px-3 py-2.5"
                    style={{ background: "var(--bg-primary)" }}
                  >
                    <p
                      className="text-xs font-medium mb-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Budget
                    </p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {selectedInquiry.budgetRange}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <FaFileAlt className="text-oceanic-400" /> Project Description
                </p>
                <div
                  className="rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words"
                  style={{
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {selectedInquiry.description}
                </div>
              </div>

              {/* Features */}
              {selectedInquiry.features && selectedInquiry.features.length > 0 && (
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wide mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Required Features
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedInquiry.features.map((f) => (
                      <span
                        key={f}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: "var(--accent-teal-subtle)",
                          color: "var(--accent-teal)",
                        }}
                      >
                        <FaCheck className="text-[9px]" /> {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedInquiry.notes && (
                <div
                  className="rounded-xl px-4 py-3 flex gap-2.5"
                  style={{
                    background: "rgba(234,179,8,0.08)",
                    border: "1px solid rgba(234,179,8,0.25)",
                  }}
                >
                  <FaStickyNote className="text-yellow-400 flex-shrink-0 mt-0.5 text-sm" />
                  <p
                    className="text-sm italic leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {selectedInquiry.notes}
                  </p>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex gap-2 pt-1">
                <a
                  href={`mailto:${selectedInquiry.email}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
                  }}
                >
                  <FaEnvelope /> Reply
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedInquiry(null)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition hover:text-[var(--text-primary)]"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
