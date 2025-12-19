/**
 * Image Migration Script
 *
 * This script uploads existing images from public/images to Appwrite Storage
 * and updates the database records with the new URLs.
 *
 * Run with: node scripts/migrate-images-to-appwrite.js
 *
 * PREREQUISITES:
 * 1. Create a Storage bucket in Appwrite Console named "portfolio-images"
 * 2. Set bucket permissions: Read access for "Any"
 * 3. Create an API key with Storage permissions
 * 4. Set APPWRITE_API_KEY environment variable
 */

const { Client, Storage, Databases, ID } = require("node-appwrite");
const fs = require("fs");
const path = require("path");

// Configuration - matches your appwrite.ts
const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6943431e00253c8f9883";
const APPWRITE_DATABASE_ID = "6943493400018e7c314c";
const STORAGE_BUCKET_ID = "69444749001b5f3a325b";

// Get API key from environment
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

if (!APPWRITE_API_KEY) {
  console.error("❌ Error: APPWRITE_API_KEY environment variable is required");
  console.log("\nTo get an API key:");
  console.log("1. Go to https://cloud.appwrite.io");
  console.log("2. Navigate to your project → Settings → API Keys");
  console.log(
    "3. Create a new API key with Storage (Create, Read) and Databases (Read, Update) permissions"
  );
  console.log("\nThen run:");
  console.log(
    "APPWRITE_API_KEY=your-key-here node scripts/migrate-images-to-appwrite.js"
  );
  process.exit(1);
}

// Initialize Appwrite client with API key
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const storage = new Storage(client);
const databases = new Databases(client);

// Collection IDs
const COLLECTIONS = {
  GALLERY: "gallery",
  EDUCATION: "education",
  PROJECTS: "projects",
};

// Image to collection/field mapping based on your database
const IMAGES_TO_MIGRATE = [
  // Gallery images
  {
    localPath: "public/images/Futurize.webp",
    collection: "gallery",
    field: "src",
    altField: "alt",
    altValue: "Futurize AI Hackathon",
  },
  {
    localPath: "public/images/Headshot.webp",
    collection: "gallery",
    field: "src",
    altField: "alt",
    altValue: "Headshot",
  },
  {
    localPath: "public/images/Best-Female-Student-In-STEM.webp",
    collection: "gallery",
    field: "src",
    altField: "alt",
    altValue: "Best Female Student In STEM",
  },
  {
    localPath: "public/images/Campus-Random-pic.webp",
    collection: "gallery",
    field: "src",
    altField: "alt",
    altValue: "Campus Random Picture",
  },
  {
    localPath: "public/images/Outstanding-student.webp",
    collection: "gallery",
    field: "src",
    altField: "alt",
    altValue: "Outstanding Student",
  },
  {
    localPath: "public/images/Akwaba-night.webp",
    collection: "gallery",
    field: "src",
    altField: "alt",
    altValue: "Akwaba Night",
  },
  {
    localPath: "public/images/Pagentry.webp",
    collection: "gallery",
    field: "src",
    altField: "alt",
    altValue: "Pagentry",
  },

  // Education logo
  {
    localPath: "public/images/ATU-LOGO-.png",
    collection: "education",
    field: "universityLogo",
    identifyBy: "institution",
    identifyValue: "Accra Technical University",
  },
];

async function uploadFile(localPath) {
  const absolutePath = path.resolve(process.cwd(), localPath);

  if (!fs.existsSync(absolutePath)) {
    console.log(`⚠️  File not found: ${localPath}`);
    return null;
  }

  const fileName = path.basename(localPath);
  const fileBuffer = fs.readFileSync(absolutePath);

  try {
    console.log(`📤 Uploading ${fileName}...`);

    const file = await storage.createFile(
      STORAGE_BUCKET_ID,
      ID.unique(),
      new File([fileBuffer], fileName)
    );

    // Construct the view URL
    const fileUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${file.$id}/view?project=${APPWRITE_PROJECT_ID}`;

    console.log(`✅ Uploaded: ${fileName} → ${file.$id}`);
    return fileUrl;
  } catch (error) {
    console.error(`❌ Error uploading ${fileName}:`, error.message);
    return null;
  }
}

async function updateDatabaseRecord(
  collection,
  field,
  newUrl,
  identifyBy,
  identifyValue
) {
  try {
    // List documents to find the one to update
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      collection
    );

    let updated = 0;

    for (const doc of response.documents) {
      let shouldUpdate = false;

      if (identifyBy && identifyValue) {
        // Match by specific field (e.g., institution name)
        if (
          doc[identifyBy] === identifyValue ||
          doc[identifyBy]?.includes(identifyValue)
        ) {
          shouldUpdate = true;
        }
      } else {
        // Update all documents (useful for single-logo updates)
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        await databases.updateDocument(
          APPWRITE_DATABASE_ID,
          collection,
          doc.$id,
          { [field]: newUrl }
        );
        console.log(`📝 Updated ${collection} document: ${doc.$id}`);
        updated++;
      }
    }

    return updated;
  } catch (error) {
    console.error(`❌ Error updating database:`, error.message);
    return 0;
  }
}

async function main() {
  console.log("🚀 Starting Image Migration to Appwrite Storage\n");
  console.log("=".repeat(50));

  let uploadedCount = 0;
  let failedCount = 0;

  // Group images by local path to avoid duplicate uploads
  const uploadedUrls = new Map();

  for (const image of IMAGES_TO_MIGRATE) {
    console.log(`\n📁 Processing: ${image.localPath}`);

    // Check if already uploaded
    let newUrl = uploadedUrls.get(image.localPath);

    if (!newUrl) {
      newUrl = await uploadFile(image.localPath);
      if (newUrl) {
        uploadedUrls.set(image.localPath, newUrl);
        uploadedCount++;
      } else {
        failedCount++;
        continue;
      }
    } else {
      console.log(
        `♻️  Using cached upload for ${path.basename(image.localPath)}`
      );
    }

    // Update database record
    const updated = await updateDatabaseRecord(
      image.collection,
      image.field,
      newUrl,
      image.identifyBy,
      image.identifyValue
    );

    console.log(`   Updated ${updated} record(s) in ${image.collection}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Migration Summary:");
  console.log(`   ✅ Uploaded: ${uploadedCount} files`);
  console.log(`   ❌ Failed: ${failedCount} files`);
  console.log("\n🎉 Migration complete!");

  if (uploadedCount > 0) {
    console.log("\n📝 Next steps:");
    console.log("1. Test your site to verify images load correctly");
    console.log(
      "2. Once verified, you can remove the local images from public/images/"
    );
    console.log("3. Commit and deploy your changes");
  }
}

main().catch(console.error);
