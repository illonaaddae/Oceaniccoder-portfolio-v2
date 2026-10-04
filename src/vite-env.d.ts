/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_APPWRITE_ENDPOINT: string;
  readonly REACT_APP_APPWRITE_PROJECT_ID: string;
  readonly REACT_APP_APPWRITE_DATABASE_ID: string;
  /** Azure Blob `media` container; defaults to the production one. */
  readonly VITE_AZURE_MEDIA_BASE_URL?: string;
  /** "cosmos" reads through /api/data; anything else keeps Appwrite. */
  readonly VITE_DATA_BACKEND?: string;
  /** Cloudflare Turnstile site key for visitor forms (public). */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
