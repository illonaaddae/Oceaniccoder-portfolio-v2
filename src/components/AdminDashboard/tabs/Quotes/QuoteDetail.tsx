import { useCallback, useEffect, useRef, useState } from "react";
import { FaTimes, FaCopy, FaWhatsapp, FaExternalLinkAlt, FaCheck } from "react-icons/fa";
import { quoteAdmin } from "@/services/api/quotes";
import { formatDate, formatMinor } from "@/utils/quoteMath";
import { useConfirm } from "../../ConfirmContext";
import { CustomSelect } from "@/components/ui/CustomSelect";
import type { ManualMethod, QuoteDetailResponse } from "@/types/quote";

/**
 * Opens WhatsApp straight to the client's chat. wa.me needs the number with
 * its country code and no symbols, so a Ghana number typed as 024… becomes
 * 23324…. With no number on file it falls back to WhatsApp's contact picker.
 */
export function waLink(phone: string | null | undefined, message: string): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.length === 10 && digits.startsWith("0")) digits = `233${digits.slice(1)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

const btn =
  "px-3 py-2 rounded-lg text-sm font-medium border transition hover:opacity-90 disabled:opacity-50";
const btnStyle = { borderColor: "var(--border-subtle)", color: "var(--text-primary)" };
const primary = {
  background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
  color: "#fff",
  borderColor: "transparent",
};

export default function QuoteDetail({
  id,
  onClose,
  onEdit,
  onChanged,
  theme = "dark",
}: {
  theme?: string;
  id: string;
  onClose: () => void;
  onEdit: (d: QuoteDetailResponse) => void;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [data, setData] = useState<QuoteDetailResponse | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [manual, setManual] = useState<{
    stageId: string;
    method: ManualMethod;
    note: string;
  } | null>(null);

  const load = useCallback(
    async () => setData(await quoteAdmin<QuoteDetailResponse>("get", { id })),
    [id],
  );
  useEffect(() => {
    load().catch((e) => setMessage({ tone: "error", text: e.message }));
  }, [load]);

  const run = async (
    action: string,
    payload: Record<string, unknown> = {},
    success?: string,
  ): Promise<boolean> => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await quoteAdmin<QuoteDetailResponse>(action, { id, ...payload });
      setData(result);
      if (result.link) setLink(result.link);
      else if (
        action === "revise" ||
        action === "cancel" ||
        (result.quote.status !== "sent" && result.quote.status !== "accepted")
      )
        setLink(null);
      let emailNote = "";
      if (result.emailed === false) {
        if (action === "send" || action === "requestStage")
          emailNote = " The email didn't send; copy the link below and share it yourself.";
        else if (action === "recordManual") emailNote = " The receipt email didn't send.";
      }
      setMessage({
        tone: emailNote ? "error" : "ok",
        text: `${success || "Done."}${emailNote}`,
      });
      onChanged();
      return true;
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : "Something went wrong." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="glass-card rounded-2xl p-6">
        {message ? (
          <p style={{ color: "var(--status-failed-text)" }}>{message.text}</p>
        ) : (
          <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
        )}
      </div>
    );
  }
  const { quote, stages, payments } = data;
  const anyPaid =
    stages.some((s) => s.state === "paid") || payments.some((p) => p.status === "success");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link ?? "");
      setMessage({ tone: "ok", text: "Link copied." });
    } catch {
      linkRef.current?.select();
      setMessage({
        tone: "error",
        text: "Couldn't copy, the link is selected; press Ctrl/Cmd+C.",
      });
    }
  };
  const money = (m: number) => formatMinor(m, quote.currency);

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
            {quote.quoteNumber} · rev {quote.revision} · {quote.status}
          </p>
          <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {quote.title}
          </h3>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {quote.clientName} · {quote.clientEmail ?? ""} · {money(quote.totalMinor)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2"
          style={{ color: "var(--text-secondary)" }}
        >
          <FaTimes />
        </button>
      </div>

      <ul className="text-sm space-y-1" style={{ color: "var(--text-secondary)" }}>
        {quote.sentAt && (
          <li>
            Sent {formatDate(quote.sentAt)} · valid until {formatDate(quote.validUntil)}
          </li>
        )}
        {(quote.viewedAt || quote.status === "sent") && (
          <li>{quote.viewedAt ? `Viewed ${formatDate(quote.viewedAt)}` : "Not opened yet"}</li>
        )}
        {quote.acceptedName && (
          <li>
            Accepted by “{quote.acceptedName}” on {formatDate(quote.respondedAt)}
          </li>
        )}
        {quote.declineReason && <li>Declined: {quote.declineReason}</li>}
      </ul>

      {message && (
        <p
          role={message.tone === "ok" ? "status" : "alert"}
          className="text-sm rounded-lg px-3 py-2"
          style={{
            background:
              message.tone === "ok" ? "var(--status-success-bg)" : "var(--status-failed-bg)",
            color:
              message.tone === "ok" ? "var(--status-success-text)" : "var(--status-failed-text)",
          }}
        >
          {message.text}
        </p>
      )}

      {link && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={linkRef}
            aria-label="Quote link"
            readOnly
            value={link}
            className="glass-input flex-1 min-w-[16rem] rounded-lg px-3 py-2 text-sm font-mono"
            onFocus={(e) => e.target.select()}
          />
          <button type="button" className={btn} style={btnStyle} onClick={() => void copyLink()}>
            <FaCopy className="inline mr-1" />
            Copy
          </button>
          <a
            className={btn}
            style={btnStyle}
            target="_blank"
            rel="noopener noreferrer"
            href={waLink(
              quote.clientPhone,
              `Hi ${quote.clientName.split(" ")[0]}, here is your quote from OceanicCoder: ${link}`,
            )}
          >
            <FaWhatsapp className="inline mr-1" />
            {quote.clientPhone ? "Send on WhatsApp" : "WhatsApp"}
          </a>
          <a
            className={btn}
            style={btnStyle}
            target="_blank"
            rel="noopener noreferrer"
            href={`${link}?preview=1`}
          >
            <FaExternalLinkAlt className="inline mr-1" />
            Preview
          </a>
        </div>
      )}

      <div>
        <h4 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Payment stages
        </h4>
        <ul className="space-y-2">
          {stages.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={
                  s.state === "paid"
                    ? { background: "var(--status-success-text)", color: "#ffffff" }
                    : s.state === "due"
                      ? { border: "1px solid var(--accent-teal)", color: "var(--accent-teal)" }
                      : { border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }
                }
              >
                {s.state === "paid" ? <FaCheck /> : s.index + 1}
              </span>
              <span className="flex-1 min-w-[10rem]" style={{ color: "var(--text-primary)" }}>
                {s.label} ({s.percent}%) <span className="font-mono">{money(s.amountMinor)}</span>
                <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>
                  {s.state === "paid"
                    ? `Paid ${formatDate(s.paidAt)}${s.reference ? ` · ${s.reference}` : ""}`
                    : s.state === "due"
                      ? `Due since ${formatDate(s.dueAt)}${s.overdue ? " · overdue" : ""}`
                      : "Not requested yet"}
                </span>
              </span>
              {quote.status === "accepted" && s.index > 0 && s.state === "later" && (
                <button
                  type="button"
                  disabled={busy}
                  className={btn}
                  style={primary}
                  onClick={() =>
                    void run("requestStage", { stageId: s.id }, `${s.label} requested and emailed.`)
                  }
                >
                  Request {s.label.toLowerCase()}
                </button>
              )}
              {quote.status === "accepted" && s.state === "due" && s.index > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Resend request for ${s.label}`}
                  className={btn}
                  style={btnStyle}
                  onClick={() =>
                    void run("requestStage", { stageId: s.id }, "Reminder sent with a fresh link.")
                  }
                >
                  Resend request
                </button>
              )}
              {quote.status === "accepted" && s.state !== "paid" && (
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Record payment for ${s.label}`}
                  className={btn}
                  style={btnStyle}
                  onClick={() => setManual({ stageId: s.id, method: "bank", note: "" })}
                >
                  Record payment
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {manual && (
        <form
          className="rounded-xl border p-4 space-y-3"
          style={{ borderColor: "var(--border-subtle)" }}
          onSubmit={(e) => {
            e.preventDefault();
            void run("recordManual", manual, "Payment recorded and receipt emailed.").then((ok) => {
              if (ok) setManual(null);
            });
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Record a payment received outside Paystack (amount is fixed to the stage amount)
          </p>
          <CustomSelect
            value={manual.method}
            onChange={(value) => setManual({ ...manual, method: value as ManualMethod })}
            options={[
              { value: "bank", label: "Bank transfer" },
              { value: "momo", label: "Mobile Money (direct)" },
              { value: "cash", label: "Cash" },
            ]}
            theme={theme === "light" ? "light" : "dark"}
            ariaLabel="Method"
          />
          <input
            aria-label="Note"
            placeholder="Note, e.g. bank reference"
            maxLength={300}
            value={manual.note}
            onChange={(e) => setManual({ ...manual, note: e.target.value })}
            className="glass-input w-full rounded-lg px-3 py-2"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={btn} style={primary}>
              Record payment
            </button>
            <button type="button" className={btn} style={btnStyle} onClick={() => setManual(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {payments.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm" style={{ color: "var(--text-secondary)" }}>
            Payment attempts ({payments.length})
          </summary>
          <ul
            className="mt-2 text-xs font-mono space-y-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {payments.map((p) => (
              <li key={p.id}>
                {p.reference} · {p.stageId} · {p.method} · {p.status}
                {p.note ? ` · ${p.note}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div
        className="flex flex-wrap gap-2 border-t pt-4"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {quote.status === "draft" && (
          <>
            <button type="button" className={btn} style={btnStyle} onClick={() => onEdit(data)}>
              Edit
            </button>
            <button
              type="button"
              disabled={busy}
              className={btn}
              style={primary}
              onClick={() => void run("send", {}, "Quote sent to the client.")}
            >
              Send to client
            </button>
          </>
        )}
        {(quote.status === "sent" || quote.status === "accepted") && (
          <button
            type="button"
            disabled={busy}
            className={btn}
            style={btnStyle}
            onClick={async () => {
              if (
                await confirm({
                  message: "Make a new link?",
                  description: "The link the client has now will stop working.",
                  confirmLabel: "New link",
                })
              )
                void run("rotate", {}, "New link ready. The old one no longer works.");
            }}
          >
            New link
          </button>
        )}
        {["sent", "declined", "expired"].includes(quote.status) && (
          <button
            type="button"
            disabled={busy}
            className={btn}
            style={btnStyle}
            onClick={async () => {
              if (
                await confirm({
                  message: "Revise this quote?",
                  description:
                    "It goes back to draft and the client's link stops working until you send it again.",
                  confirmLabel: "Revise",
                })
              )
                void run("revise", {}, "Back to draft. Edit it, then send again.");
            }}
          >
            Revise
          </button>
        )}
        {["draft", "sent", "accepted"].includes(quote.status) && !anyPaid && (
          <button
            type="button"
            disabled={busy}
            className={btn}
            style={{ ...btnStyle, color: "var(--status-failed-text)" }}
            onClick={async () => {
              if (
                await confirm({
                  message: "Cancel this quote?",
                  description: "The client's link stops working. This can't be undone.",
                  confirmLabel: "Cancel quote",
                  variant: "danger",
                })
              )
                void run("cancel", {}, "Quote cancelled.");
            }}
          >
            Cancel quote
          </button>
        )}
      </div>
    </div>
  );
}
