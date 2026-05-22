import React, { useState } from "react";
import { config } from "@/config/env";

interface BankTransferProps {
  invoiceNumber: string;
}

interface CopyButtonProps {
  text: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all"
      style={{
        background: copied ? "var(--accent-teal-subtle)" : "var(--bg-primary)",
        border: "1px solid var(--border-subtle)",
        color: copied ? "var(--accent-teal)" : "var(--text-secondary)",
        cursor: "pointer",
      }}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect
              x="1"
              y="3"
              width="8"
              height="8"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M3 3V2a1 1 0 011-1h6a1 1 0 011 1v7a1 1 0 01-1 1h-1"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          Copy
        </>
      )}
    </button>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  copyable?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, copyable = false }) => (
  <div
    className="flex items-center justify-between py-3"
    style={{ borderBottom: "1px solid var(--border-subtle)" }}
  >
    <div>
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-0.5"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </p>
      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
    {copyable && <CopyButton text={value} />}
  </div>
);

const BankTransfer: React.FC<BankTransferProps> = ({ invoiceNumber }) => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Bank Transfer
        </h3>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Transfer directly to our bank account.
        </p>
      </div>

      {/* Bank details */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <DetailRow label="Bank" value={config.payment.bankName} />
        <DetailRow label="Account Name" value={config.payment.bankAccountName} />
        <DetailRow label="Account Number" value={config.payment.bankAccountNumber} copyable />
      </div>

      {/* MoMo details */}
      <div>
        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Mobile Money
        </h3>
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          Send via mobile money.
        </p>

        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <DetailRow label="Network" value={config.payment.momoNetwork} />
          <DetailRow label="Number" value={config.payment.momoNumber} copyable />
        </div>
      </div>

      {/* Instruction */}
      <div
        className="rounded-xl p-4 text-sm"
        style={{
          background: "var(--accent-teal-subtle)",
          border: "1px solid var(--accent-teal)",
          color: "var(--text-primary)",
        }}
      >
        <p className="font-semibold mb-1" style={{ color: "var(--accent-teal)" }}>
          After transferring
        </p>
        <p style={{ color: "var(--text-secondary)" }}>
          Send a confirmation email to{" "}
          <a
            href={`mailto:hello@oceaniccoder.dev?subject=Payment for ${invoiceNumber}`}
            style={{ color: "var(--accent-teal)", textDecoration: "underline" }}
          >
            hello@oceaniccoder.dev
          </a>{" "}
          with the subject:{" "}
          <strong style={{ color: "var(--text-primary)" }}>Payment for {invoiceNumber}</strong>
        </p>
      </div>
    </div>
  );
};

export default BankTransfer;
