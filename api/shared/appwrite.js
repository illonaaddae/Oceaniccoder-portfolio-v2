// Server-side Appwrite client for the quote functions. Uses the API key, which
// bypasses collection permissions, so `quotes` and `locks` can stay closed to
// browsers entirely. This file goes away at the Cosmos cutover.

const sdk = require("node-appwrite");

const ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "6943493400018e7c314c";

function getDatabases() {
  const key = process.env.APPWRITE_API_KEY;
  if (!key) throw new Error("APPWRITE_API_KEY is not configured");
  return new sdk.Databases(
    new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(key),
  );
}

module.exports = { sdk, DATABASE_ID, getDatabases };
