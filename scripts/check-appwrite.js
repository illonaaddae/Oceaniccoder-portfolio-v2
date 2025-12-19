/**
 * Appwrite Configuration Diagnostic Script
 *
 * Run this script to check your Appwrite setup:
 * node scripts/check-appwrite.js
 */

const sdk = require("node-appwrite");

// Your Appwrite Configuration
const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6943431e00253c8f9883";
const APPWRITE_DATABASE_ID = "6943493400018e7c314c";
const STORAGE_BUCKET_ID = "69444749001b5f3a325b";

// Collection IDs to check
const COLLECTIONS = {
  PROJECTS: "projects",
  CERTIFICATIONS: "certifications",
  EDUCATION: "education",
  GALLERY: "gallery",
  BLOG_POSTS: "blog_posts",
  COMMENTS: "comments",
  JOURNEY: "journey",
  MESSAGES: "messages",
  SKILLS: "skills",
  SETTINGS: "settings",
  ABOUT: "about",
};

// Initialize Appwrite Client
const client = new sdk.Client();
client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);

// Note: For full diagnostic, you'd need an API key
// client.setKey('YOUR_API_KEY');

const databases = new sdk.Databases(client);
const storage = new sdk.Storage(client);

async function checkCollection(name, collectionId) {
  try {
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      collectionId,
      []
    );
    console.log(`✅ ${name} (${collectionId}): ${response.total} documents`);
    return { name, status: "ok", count: response.total };
  } catch (error) {
    console.log(`❌ ${name} (${collectionId}): ${error.message}`);
    return { name, status: "error", error: error.message };
  }
}

async function checkStorage() {
  try {
    const response = await storage.listFiles(STORAGE_BUCKET_ID);
    console.log(
      `✅ Storage Bucket (${STORAGE_BUCKET_ID}): ${response.total} files`
    );
    return { status: "ok", count: response.total };
  } catch (error) {
    console.log(`❌ Storage Bucket (${STORAGE_BUCKET_ID}): ${error.message}`);
    return { status: "error", error: error.message };
  }
}

async function main() {
  console.log("\n========================================");
  console.log("  APPWRITE CONFIGURATION DIAGNOSTIC");
  console.log("========================================\n");

  console.log("Configuration:");
  console.log(`  Endpoint: ${APPWRITE_ENDPOINT}`);
  console.log(`  Project ID: ${APPWRITE_PROJECT_ID}`);
  console.log(`  Database ID: ${APPWRITE_DATABASE_ID}`);
  console.log(`  Storage Bucket ID: ${STORAGE_BUCKET_ID}`);
  console.log("\n----------------------------------------\n");

  console.log("Checking Collections:\n");

  const results = [];
  for (const [name, id] of Object.entries(COLLECTIONS)) {
    const result = await checkCollection(name, id);
    results.push(result);
  }

  console.log("\n----------------------------------------\n");
  console.log("Checking Storage:\n");
  await checkStorage();

  console.log("\n----------------------------------------\n");

  const errors = results.filter((r) => r.status === "error");
  if (errors.length > 0) {
    console.log("⚠️  ISSUES FOUND:\n");
    errors.forEach((e) => {
      console.log(`  - ${e.name}: ${e.error}`);
    });
    console.log("\n");
    console.log("To fix these issues, go to your Appwrite Console:");
    console.log(
      "https://cloud.appwrite.io/console/project-6943431e00253c8f9883\n"
    );
    console.log("1. Go to Databases > Select your database");
    console.log("2. Create missing collections with the exact IDs shown above");
    console.log("3. For each collection, go to Settings > Permissions");
    console.log("4. Add these permissions:");
    console.log("   - Role: Any - Read: ✓");
    console.log("   - Role: Users - Create: ✓, Read: ✓, Update: ✓, Delete: ✓");
    console.log("\n");
  } else {
    console.log("✅ All collections are accessible!\n");
  }
}

main().catch(console.error);
