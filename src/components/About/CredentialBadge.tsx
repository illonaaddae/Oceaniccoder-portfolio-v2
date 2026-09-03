import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaCheck, FaRegCopy } from "react-icons/fa";
import { formatCredentialId, isOpaqueCredentialId } from "../../utils/formatCredentialId";

interface CredentialBadgeProps {
  credential: string;
}

/**
 * The credential ID on a certification card. Opaque IDs (UUIDs, badge hashes)
 * are middle-truncated behind an "ID" label with a copy button, because the
 * only thing anyone does with a 36-character UUID is copy it somewhere else.
 * Human labels render in full and skip the copy affordance.
 */
const CredentialBadge = React.memo(({ credential }: CredentialBadgeProps) => {
  const [copied, setCopied] = useState(false);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const value = credential.trim();
  const opaque = isOpaqueCredentialId(value);

  useEffect(
    () => () => {
      if (resetRef.current) clearTimeout(resetRef.current);
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (resetRef.current) clearTimeout(resetRef.current);
      resetRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context or denied permission) — the full
      // ID is still in the title attribute, so the user can select it by hand.
    }
  }, [value]);

  if (!value) return null;

  if (!opaque) {
    return (
      <span className="inline-block text-xs bg-gradient-to-r from-oceanic-500/20 to-oceanic-700/20 text-oceanic-400 px-3 py-1.5 rounded-full border border-oceanic-500/30 sm:whitespace-nowrap font-medium shadow-sm cert-credential">
        {value}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-2 text-xs bg-gradient-to-r from-oceanic-500/20 to-oceanic-700/20 px-3 py-1.5 rounded-full border border-oceanic-500/30 whitespace-nowrap font-medium shadow-sm cert-credential"
      title={value}
    >
      <span className="text-[10px] uppercase tracking-wider text-oceanic-300/80 font-semibold">
        ID
      </span>
      <span className="font-mono text-oceanic-400">{formatCredentialId(value)}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Credential ID copied" : "Copy credential ID"}
        title={copied ? "Copied" : "Copy credential ID"}
        className="p-0.5 rounded text-oceanic-400 hover:text-oceanic-200 hover:bg-oceanic-500/20 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-oceanic-400/60"
      >
        {copied ? (
          <FaCheck className="w-3 h-3 text-green-400" aria-hidden="true" />
        ) : (
          <FaRegCopy className="w-3 h-3" aria-hidden="true" />
        )}
      </button>
    </span>
  );
});

CredentialBadge.displayName = "CredentialBadge";
export default CredentialBadge;
