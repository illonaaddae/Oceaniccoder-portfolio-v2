import { useCallback, useEffect, useRef, useState } from "react";
import { usesCosmos } from "@/services/api/dataApi";

/**
 * Cloudflare Turnstile for visitor forms. Put `ref` on an empty <div> near the
 * submit button and send `token` with the submission; /api/submit checks it.
 * Tokens are single-use, so call `reset()` after a submit that fails.
 *
 * Inactive (no script, `active` false) while the site still writes to
 * Appwrite. Uses Cloudflare's always-pass test key in local development.
 */

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TEST_SITE_KEY = "1x00000000000000000000AA";
const SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || (import.meta.env.DEV ? TEST_SITE_KEY : "");

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing"));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Couldn't load the spam check"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export interface Turnstile {
  /** False while the site still writes to Appwrite; forms skip the check. */
  active: boolean;
  ref: (el: HTMLDivElement | null) => void;
  token: string | null;
  /** Set when the widget can't load or the challenge fails. */
  error: string | null;
  reset: () => void;
}

export function useTurnstile(): Turnstile {
  const active = usesCosmos;
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !element) return undefined;
    if (!SITE_KEY) {
      setError("Spam protection isn't configured.");
      return undefined;
    }
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        widgetId.current = api.render(element, {
          sitekey: SITE_KEY,
          appearance: "interaction-only",
          callback: (t: string) => {
            setToken(t);
            setError(null);
          },
          "expired-callback": () => setToken(null),
          "error-callback": () => {
            setToken(null);
            setError("The spam check failed. Please reload the page and try again.");
          },
        });
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [active, element]);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, []);

  return { active, ref: setElement, token, error, reset };
}
