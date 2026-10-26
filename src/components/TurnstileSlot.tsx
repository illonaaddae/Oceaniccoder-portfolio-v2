import type { Turnstile } from "@/hooks/useTurnstile";

/**
 * Where a form's Turnstile widget renders, plus its error if it can't load.
 * The widget itself only appears when Cloudflare wants an interaction; usually
 * it stays invisible.
 */
export default function TurnstileSlot({ turnstile }: { turnstile: Turnstile }) {
  return (
    <div className="my-2">
      <div ref={turnstile.ref} />
      {turnstile.error && (
        <p role="alert" className="text-sm text-red-500 mt-1">
          {turnstile.error}
        </p>
      )}
    </div>
  );
}
