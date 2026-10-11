import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
  FaBullhorn,
  FaCalendarCheck,
  FaCalendarPlus,
  FaCalendarTimes,
  FaCheckCircle,
  FaChevronDown,
  FaClipboardCheck,
  FaCreditCard,
  FaDesktop,
  FaEnvelope,
  FaEnvelopeOpenText,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaFileSignature,
  FaHandshake,
  FaInbox,
  FaMobileAlt,
  FaMoneyBillWave,
  FaNewspaper,
  FaPaperPlane,
  FaReceipt,
  FaReply,
  FaSearch,
  FaSpinner,
  FaTimesCircle,
  FaUserPlus,
  FaWallet,
} from "react-icons/fa";
import {
  fetchEmailPreview,
  sendTestEmail,
  type EmailGroup,
  type EmailPreviewMail,
  type EmailTemplateInfo,
} from "@/services/api/quotes";

const GROUPS: { id: EmailGroup; label: string }[] = [
  { id: "clients", label: "To clients" },
  { id: "admin", label: "To you" },
];

/** One icon per email, so the list scans like an inbox. */
const ICONS: Record<string, IconType> = {
  bookingConfirmation: FaCalendarCheck,
  quoteSent: FaFileSignature,
  quoteAccepted: FaHandshake,
  paymentRequest: FaWallet,
  paymentReceipt: FaReceipt,
  invoiceSent: FaFileInvoiceDollar,
  invoicePaidReceipt: FaReceipt,
  invoicePaidConfirmation: FaCheckCircle,
  inquiryReviewed: FaSearch,
  inquiryQuoted: FaClipboardCheck,
  inquiryWon: FaHandshake,
  inquiryDeclined: FaTimesCircle,
  messageReply: FaReply,
  newsletterWelcome: FaUserPlus,
  newsletterIssue: FaNewspaper,
  inquiryReceivedAlert: FaInbox,
  bookingHostNotice: FaCalendarPlus,
  bookingHostNoLink: FaCalendarTimes,
  quoteDecisionAlert: FaCheckCircle,
  quoteDeclinedAlert: FaTimesCircle,
  paymentAlert: FaMoneyBillWave,
  paymentAlertProblem: FaExclamationTriangle,
  invoicePaidAlert: FaCreditCard,
  invoiceRecordFailed: FaExclamationTriangle,
  webhookFailed: FaBullhorn,
};

const COLLAPSED_KEY = "oc-admin-email-groups";

function readCollapsed(): EmailGroup[] {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as EmailGroup[]) : [];
  } catch {
    return [];
  }
}

function writeCollapsed(groups: EmailGroup[]) {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(groups));
  } catch {
    /* storage unavailable; the groups just won't remember */
  }
}

// Brand teal: white on it is 8.1:1. --accent-teal is too light for white text in dark mode.
const BRAND = "#085866";

/** See every email before a client does, and send yourself a test. */
export default function EmailsTab(_props: { theme: string }) {
  const [templates, setTemplates] = useState<EmailTemplateInfo[] | null>(null);
  const [from, setFrom] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<EmailPreviewMail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showText, setShowText] = useState(false);
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");
  const [collapsed, setCollapsed] = useState<EmailGroup[]>(readCollapsed);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEmailPreview()
      .then((r) => {
        if (cancelled) return;
        const list = r.templates || [];
        setTemplates(list);
        setFrom(r.from || "");
        setSelected(list[0]?.id ?? null);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setTemplates([]);
        setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setPreview(null);
    setStatus(null);
    setError(null);
    setShowText(false);
    fetchEmailPreview(selected)
      .then((r) => {
        if (!cancelled) setPreview(r);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const current = templates?.find((t) => t.id === selected) ?? null;

  const toggleGroup = (g: EmailGroup) => {
    const next = collapsed.includes(g) ? collapsed.filter((x) => x !== g) : [...collapsed, g];
    setCollapsed(next);
    writeCollapsed(next);
  };

  // Below lg the list sits above the preview, so bring the preview into view after a pick.
  const pick = (id: string) => {
    setSelected(id);
    if (typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panelRef.current?.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const handleSend = () => {
    if (!selected || sending) return;
    setSending(true);
    setStatus(null);
    setError(null);
    sendTestEmail(selected)
      .then((r) => setStatus(`Sent to ${r.to}. Check your inbox.`))
      .catch((e: Error) => setError(e.message))
      .finally(() => setSending(false));
  };

  const iconBtn = "h-9 w-9 rounded-md flex items-center justify-center transition-colors";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Emails
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Every email the site sends, shown with sample details. Send yourself a test to see it in
          your own inbox.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <nav aria-label="Emails" className="glass-card rounded-2xl p-2 self-start">
          {templates === null && (
            <p className="text-sm p-3" style={{ color: "var(--text-secondary)" }}>
              Loading emails…
            </p>
          )}
          {templates !== null && templates.length === 0 && (
            <p className="text-sm p-3" style={{ color: "var(--text-secondary)" }}>
              No emails found.
            </p>
          )}
          {templates !== null &&
            GROUPS.map((g) => {
              const list = templates.filter((t) => t.group === g.id);
              if (!list.length) return null;
              const hasSel = list.some((t) => t.id === selected);
              const open = hasSel || !collapsed.includes(g.id);
              return (
                <section key={g.id} aria-label={g.label} className="mb-1 last:mb-0">
                  <h3>
                    <button
                      type="button"
                      onClick={() => !hasSel && toggleGroup(g.id)}
                      aria-expanded={open}
                      aria-controls={`email-group-${g.id}`}
                      className="flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-3 pt-2.5 pb-1 text-xs font-semibold uppercase tracking-wider focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-teal)]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span>{g.label}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="tabular-nums">{list.length}</span>
                        <FaChevronDown
                          aria-hidden
                          className={`h-3 w-3 transition-transform motion-reduce:transition-none ${open ? "" : "-rotate-90"} ${hasSel ? "opacity-0" : ""}`}
                        />
                      </span>
                    </button>
                  </h3>
                  <ul id={`email-group-${g.id}`} hidden={!open} className="grid gap-px">
                    {list.map((t) => {
                      const on = t.id === selected;
                      const Icon = ICONS[t.id] ?? FaEnvelope;
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => pick(t.id)}
                            aria-current={on ? "true" : undefined}
                            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[var(--bg-tertiary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)]"
                            style={on ? { background: BRAND, color: "#fff" } : undefined}
                          >
                            <span
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                              style={
                                on
                                  ? { background: "rgba(255,255,255,0.14)", color: "#fff" }
                                  : {
                                      background: "var(--bg-tertiary)",
                                      color: "var(--text-secondary)",
                                    }
                              }
                            >
                              <Icon aria-hidden className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                              <span
                                className="block truncate text-sm font-medium"
                                style={on ? undefined : { color: "var(--text-primary)" }}
                              >
                                {t.name}
                              </span>
                              <span
                                className="block truncate text-xs"
                                style={{
                                  color: on ? "rgba(255,255,255,0.75)" : "var(--text-secondary)",
                                }}
                              >
                                {t.when}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
        </nav>

        {/* The list scrolls with the page; the preview stays pinned beside it with its own scroll. */}
        <section
          ref={panelRef}
          aria-label="Preview"
          className="glass-card rounded-2xl min-w-0 overflow-hidden self-start scroll-mt-20 lg:sticky lg:top-24 lg:flex lg:h-[calc(100dvh-8rem)] lg:min-h-[32rem] lg:flex-col"
        >
          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b p-4"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="min-w-0">
              <p
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                <FaEnvelopeOpenText aria-hidden style={{ color: "var(--text-secondary)" }} />
                <span className="truncate">{preview?.subject ?? current?.subject ?? ""}</span>
              </p>
              <p className="mt-0.5 text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                From OceanicCoder &lt;{from || "…"}&gt;
                {current ? ` · ${current.when}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label="Preview width"
                className="flex rounded-lg border p-0.5"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                {(["desktop", "mobile"] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWidth(w)}
                    aria-pressed={width === w}
                    aria-label={`${w === "desktop" ? "Desktop" : "Mobile"} width`}
                    className={iconBtn}
                    style={
                      width === w
                        ? { background: BRAND, color: "#fff" }
                        : { color: "var(--text-secondary)" }
                    }
                  >
                    {w === "desktop" ? <FaDesktop aria-hidden /> : <FaMobileAlt aria-hidden />}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowText(!showText)}
                aria-pressed={showText}
                className="min-h-10 rounded-lg border px-3 text-sm"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
              >
                Plain text
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !selected}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:opacity-60"
                style={{ background: BRAND, color: "#fff" }}
              >
                {sending ? (
                  <FaSpinner aria-hidden className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <FaPaperPlane aria-hidden />
                )}
                {sending ? "Sending…" : "Send me a test"}
              </button>
            </div>
          </div>

          {(error || status) && (
            <div className="px-4 pt-3">
              {error && (
                <p
                  role="alert"
                  className="text-sm rounded-lg px-3 py-2"
                  style={{
                    background: "var(--status-failed-bg)",
                    color: "var(--status-failed-text)",
                  }}
                >
                  {error}
                </p>
              )}
              {status && (
                <p
                  role="status"
                  className="text-sm rounded-lg px-3 py-2"
                  style={{
                    background: "var(--status-success-bg)",
                    color: "var(--status-success-text)",
                  }}
                >
                  {status}
                </p>
              )}
            </div>
          )}

          <div
            className="p-3 sm:p-6 lg:min-h-0 lg:flex-1"
            style={{ background: "var(--bg-primary)" }}
          >
            {selected && !preview && !error && (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Loading preview…
              </p>
            )}
            {preview &&
              (showText ? (
                <pre
                  className="whitespace-pre-wrap text-sm p-4 rounded-lg h-full overflow-auto"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                >
                  {preview.text}
                </pre>
              ) : (
                <iframe
                  key={`${selected}-${width}`}
                  title={`Preview: ${current?.name ?? selected}`}
                  srcDoc={preview.html}
                  sandbox=""
                  className={`mx-auto block h-[900px] lg:h-full rounded-lg border bg-white shadow-sm ${
                    width === "mobile" ? "w-[390px] max-w-full" : "w-full"
                  }`}
                  style={{ borderColor: "var(--border-subtle)" }}
                />
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
