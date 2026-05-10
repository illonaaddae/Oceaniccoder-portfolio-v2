import React, { useState } from "react";
import { FaEnvelope, FaPaperPlane, FaCheckCircle } from "react-icons/fa";
import { apiUrl } from "../../utils/apiUrl";

const NewsletterSignup = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(apiUrl("/api/newsletter-signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to subscribe");
      setStatus("success");
      setEmail("");
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong. Try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
      >
        <FaCheckCircle className="text-4xl text-oceanic-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">You're subscribed!</h3>
        <p className="text-[var(--text-secondary)]">
          You'll get notified when new posts are published.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-8"
      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--accent-teal-subtle)" }}
        >
          <FaEnvelope style={{ color: "var(--accent-teal)" }} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Stay in the loop</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Get notified when I publish new posts.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 px-4 py-3 rounded-xl outline-none text-[var(--text-primary)] transition-all focus:ring-2 focus:ring-oceanic-400/50"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border-subtle)",
            fontSize: "16px",
          }}
        />
        <button
          type="submit"
          disabled={status === "loading" || !email.trim()}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 shrink-0"
          style={{ background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)" }}
        >
          <FaPaperPlane className="text-sm" />
          {status === "loading" ? "Subscribing..." : "Subscribe"}
        </button>
      </form>
      {status === "error" && <p className="mt-3 text-sm text-red-400">{errorMsg}</p>}
      <p className="mt-3 text-xs text-[var(--text-secondary)]">No spam. Unsubscribe anytime.</p>
    </div>
  );
};

export default NewsletterSignup;
