import { Client, Databases } from "appwrite";

// Support both Vite (import.meta.env) and Create React App / react-scripts (process.env)
const VITE_ENV =
  typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
const REACT_ENV =
  typeof process !== "undefined" && process.env ? process.env : {};

const getEnv = (viteKey, reactKey, fallback) => {
  return VITE_ENV[viteKey] ?? REACT_ENV[reactKey] ?? fallback;
};

const APPWRITE_ENDPOINT = getEnv(
  "VITE_APPWRITE_ENDPOINT",
  "REACT_APPWRITE_ENDPOINT",
  ""
);
const APPWRITE_PROJECT_ID = getEnv(
  "VITE_APPWRITE_PROJECT_ID",
  "REACT_APPWRITE_PROJECT_ID",
  ""
);
const APPWRITE_API_KEY = getEnv(
  "VITE_APPWRITE_API_KEY",
  "REACT_APPWRITE_API_KEY",
  ""
);
const APPWRITE_DATABASE_ID = getEnv(
  "VITE_APPWRITE_DATABASE_ID",
  "REACT_APPWRITE_DATABASE_ID",
  ""
);
const APPWRITE_COLLECTION_ID = getEnv(
  "VITE_APPWRITE_COLLECTION_ID",
  "REACT_APPWRITE_COLLECTION_ID",
  ""
);

const client = new Client();

// Only call setters when values are present to avoid runtime errors in environments
// where import.meta or specific env keys are unavailable.
if (APPWRITE_ENDPOINT) client.setEndpoint(APPWRITE_ENDPOINT);
if (APPWRITE_PROJECT_ID) client.setProject(APPWRITE_PROJECT_ID);
if (APPWRITE_API_KEY) client.setKey(APPWRITE_API_KEY);

export const databases = new Databases(client);
export const databaseId = APPWRITE_DATABASE_ID;
export const collectionId = APPWRITE_COLLECTION_ID;
