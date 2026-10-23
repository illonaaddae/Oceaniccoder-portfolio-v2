/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Azure Blob `media` container; defaults to the production one. */
  readonly VITE_AZURE_MEDIA_BASE_URL?: string;
  /** Cloudflare Turnstile site key for visitor forms (public). */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** "true" sends first-party page views to /api/visit; anything else sends none. */
  readonly VITE_ANALYTICS_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
