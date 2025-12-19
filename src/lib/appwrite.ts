import { Client, Databases, Storage, Account } from "appwrite";

const client = new Client();

// Configuration - you can update these values directly
const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6943431e00253c8f9883";
const APPWRITE_DATABASE_ID = "6943493400018e7c314c";

client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const storage = new Storage(client);
export const account = new Account(client);
export const DATABASE_ID = APPWRITE_DATABASE_ID;

// Storage Bucket ID - Create this bucket in Appwrite Console with name "portfolio-images"
export const STORAGE_BUCKET_ID = "69444749001b5f3a325b";

// Collection IDs
export const COLLECTIONS = {
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
} as const;

export default client;
