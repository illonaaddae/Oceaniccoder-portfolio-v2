import { Client, Databases, Storage, Account } from "appwrite";

const client = new Client();

// Read from env first; fall back to known production values so existing deploys keep working
const APPWRITE_ENDPOINT =
  import.meta.env.VITE_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID =
  import.meta.env.VITE_APPWRITE_PROJECT_ID || "6943431e00253c8f9883";
const APPWRITE_DATABASE_ID =
  import.meta.env.VITE_APPWRITE_DATABASE_ID || "6943493400018e7c314c";
const APPWRITE_STORAGE_BUCKET_ID =
  import.meta.env.VITE_APPWRITE_BUCKET_ID || "69444749001b5f3a325b";

client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const storage = new Storage(client);
export const account = new Account(client);
export const DATABASE_ID = APPWRITE_DATABASE_ID;
export const STORAGE_BUCKET_ID = APPWRITE_STORAGE_BUCKET_ID;

// Collection IDs
export const COLLECTIONS = {
  PROJECTS: "projects",
  CERTIFICATIONS: "certifications",
  EDUCATION: "education",
  GALLERY: "gallery",
  BLOG_POSTS: "blog_posts",
  BLOG_REACTIONS: "blog_reactions",
  COMMENTS: "comments",
  JOURNEY: "journey",
  MESSAGES: "messages",
  SKILLS: "skills",
  SETTINGS: "settings",
  ABOUT: "about",
  TESTIMONIALS: "testimonials",
  SITE_VIEWS: "site_views",
  BOOKINGS: "bookings",
} as const;

export default client;
