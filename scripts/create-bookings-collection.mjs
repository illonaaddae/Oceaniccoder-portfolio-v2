import { Client, Databases } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || "6943493400018e7c314c";
const collectionId = "bookings";

if (!apiKey) {
  console.error("APPWRITE_API_KEY is required");
  process.exit(1);
}

const attributes = [
  ["name", 255, true],
  ["email", 255, true],
  ["phone", 50, false],
  ["meetingType", 50, true],
  ["preferredDate", 20, true],
  ["preferredTime", 20, true],
  ["timezone", 100, false],
  ["message", 2000, false],
  ["status", 50, false],
];

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

async function ensureCollection() {
  const collections = await databases.listCollections(databaseId);
  const existing = collections.collections.find((collection) => collection.$id === collectionId);

  if (!existing) {
    await databases.createCollection(databaseId, collectionId, "Bookings", ["create(\"any\")"], true, true);
    console.log("created collection");
  } else {
    console.log("collection exists");
  }
}

async function ensureAttributes() {
  const attributeList = await databases.listAttributes(databaseId, collectionId);
  const existingKeys = new Set(attributeList.attributes.map((attribute) => attribute.key));

  for (const [key, size, required] of attributes) {
    if (existingKeys.has(key)) {
      console.log(`exists attr ${key}`);
      continue;
    }

    await databases.createStringAttribute(databaseId, collectionId, key, size, required);
    console.log(`created attr ${key}`);
  }
}

async function main() {
  await ensureCollection();
  await ensureAttributes();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
