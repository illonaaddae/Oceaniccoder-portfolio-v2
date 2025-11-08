import { Client, Databases } from "appwrite";

const pick = (...cands) => cands.find((v) => typeof v === "string" && v.trim());

const ENDPOINT = pick(
  typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_APPWRITE_ENDPOINT
    : undefined,
  process?.env?.REACT_APPWRITE_ENDPOINT,
  process?.env?.VITE_APPWRITE_ENDPOINT
);
const PROJECT_ID = pick(
  typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_APPWRITE_PROJECT_ID
    : undefined,
  process?.env?.REACT_APPWRITE_PROJECT_ID,
  process?.env?.VITE_APPWRITE_PROJECT_ID
);
export const databaseId = pick(
  typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_APPWRITE_DATABASE_ID
    : undefined,
  process?.env?.REACT_APPWRITE_DATABASE_ID,
  process?.env?.VITE_APPWRITE_DATABASE_ID
);
export const collectionId = pick(
  typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_APPWRITE_COLLECTION_ID
    : undefined,
  process?.env?.REACT_APPWRITE_COLLECTION_ID,
  process?.env?.VITE_APPWRITE_COLLECTION_ID
);

const client = new Client();

if (ENDPOINT) client.setEndpoint(ENDPOINT);
if (PROJECT_ID) client.setProject(PROJECT_ID);

export const databases = new Databases(client);

// Optional dev sanity log
if (process?.env?.NODE_ENV === "development") {
  // eslint-disable-next-line no-console
  console.log("[Appwrite cfg]", {
    ENDPOINT,
    PROJECT_ID,
    databaseId,
    collectionId,
  });
}
