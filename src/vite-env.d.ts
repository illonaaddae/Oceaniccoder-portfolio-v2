/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_APPWRITE_ENDPOINT: string;
  readonly REACT_APP_APPWRITE_PROJECT_ID: string;
  readonly REACT_APP_APPWRITE_DATABASE_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
