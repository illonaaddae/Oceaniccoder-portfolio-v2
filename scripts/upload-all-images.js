/**
 * Upload ALL Images Script
 *
 * This script uploads all images from public/images to Appwrite Storage
 * and outputs a mapping of local paths to Appwrite URLs
 *
 * Run with: APPWRITE_API_KEY=your-key node scripts/upload-all-images.js
 */

const { Client, Storage, ID } = require("node-appwrite");
const fs = require("fs");
const path = require("path");

// Configuration
const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6943431e00253c8f9883";
const STORAGE_BUCKET_ID = "69444749001b5f3a325b";

const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

if (!APPWRITE_API_KEY) {
  console.error("❌ Error: APPWRITE_API_KEY environment variable is required");
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const storage = new Storage(client);

// Find all images recursively
function findAllImages(dir, images = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findAllImages(filePath, images);
    } else if (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file)) {
      images.push(filePath);
    }
  }

  return images;
}

async function uploadFile(localPath) {
  const fileName = path.basename(localPath);
  const fileBuffer = fs.readFileSync(localPath);

  // Determine mime type
  const ext = path.extname(localPath).toLowerCase();
  const mimeTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  };
  const mimeType = mimeTypes[ext] || "application/octet-stream";

  try {
    // Create a Blob-like object for Node.js
    const file = new File([fileBuffer], fileName, { type: mimeType });

    const response = await storage.createFile(
      STORAGE_BUCKET_ID,
      ID.unique(),
      file
    );

    const fileUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${response.$id}/view?project=${APPWRITE_PROJECT_ID}`;

    return { success: true, fileId: response.$id, url: fileUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("🚀 Uploading ALL images to Appwrite Storage\n");
  console.log("=".repeat(60));

  const imagesDir = path.resolve(process.cwd(), "public/images");
  const allImages = findAllImages(imagesDir);

  console.log(`\n📁 Found ${allImages.length} images to upload\n`);

  const results = [];
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const imagePath of allImages) {
    const relativePath = imagePath.replace(process.cwd() + "/", "");
    const publicPath = "/" + relativePath.replace("public/", "");

    process.stdout.write(`📤 ${path.basename(imagePath)}... `);

    const result = await uploadFile(imagePath);

    if (result.success) {
      console.log(`✅ ${result.fileId}`);
      results.push({
        localPath: relativePath,
        publicPath: publicPath,
        fileId: result.fileId,
        url: result.url,
      });
      uploaded++;
    } else {
      if (result.error.includes("already exists")) {
        console.log("⏭️  Already exists");
        skipped++;
      } else {
        console.log(`❌ ${result.error}`);
        failed++;
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Upload Summary:");
  console.log(`   ✅ Uploaded: ${uploaded}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);

  // Output mapping file
  const mappingFile = "scripts/image-url-mapping.json";
  fs.writeFileSync(mappingFile, JSON.stringify(results, null, 2));
  console.log(`\n📄 URL mapping saved to: ${mappingFile}`);

  // Output a helpful reference
  console.log("\n📋 Image URL Reference:");
  console.log("-".repeat(60));
  for (const r of results) {
    console.log(`${r.publicPath}`);
    console.log(`  → ${r.url}\n`);
  }
}

main().catch(console.error);
