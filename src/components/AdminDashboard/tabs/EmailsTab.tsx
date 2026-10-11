import { useEffect, useState } from "react";
import { fetchEmailPreview, sendTestEmail } from "@/services/api/quotes";

export default function EmailsTab(_props: { theme: string }) {
  const [templates, setTemplates] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ subject?: string; html?: string; text?: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchEmailPreview()
      .then((r) => {
        if (cancelled) return;
        setTemplates(r.templates || []);
        setSelected((r.templates || [])[0] || null);
      })
      .catch((e) => {
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
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const handleSend = () => {
    if (!selected || sending) return;
    setSending(true);
    setStatus(null);
    sendTestEmail(selected)
      .then((r) => setStatus(`Sent to ${r.to}.`))
      .catch((e) => setError(e.message))
      .finally(() => setSending(false));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Emails
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Every client and admin email, with sample data.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <div>
          {templates === null && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Loading templates…
            </p>
          )}
          {templates !== null && templates.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No templates found.
            </p>
          )}
          <ul className="space-y-1">
            {(templates || []).map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => setSelected(t)}
                  className="w-full text-left rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: selected === t ? "var(--accent-teal-subtle)" : "transparent",
                    color: "var(--text-primary)",
                  }}
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card rounded-2xl p-4 space-y-3">
          {selected && !preview && !error && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Loading preview…
            </p>
          )}
          {preview && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {preview.subject}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowText(!showText)}
                    className="px-3 py-1.5 rounded-lg border text-sm"
                    style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                  >
                    {showText ? "HTML" : "Plain text"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
                    style={{
                      background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
                    }}
                  >
                    {sending ? "Sending…" : "Send test to me"}
                  </button>
                </div>
              </div>
              {showText ? (
                <pre
                  className="whitespace-pre-wrap text-sm p-3 rounded-lg"
                  style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
                >
                  {preview.text}
                </pre>
              ) : (
                <iframe
                  title={`${selected} preview`}
                  srcDoc={preview.html}
                  sandbox=""
                  className="w-full h-[720px] rounded-lg bg-white"
                />
              )}
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}
          {status && (
            <p role="status" className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
