import {
  databases,
  DATABASE_ID,
  COLLECTIONS,
  storage,
  STORAGE_BUCKET_ID,
} from "../lib/appwrite";
import { Query, ID } from "appwrite";
import type {
  Project,
  Certification,
  Education,
  GalleryImage,
  BlogPost,
  Comment,
  Journey,
  Message,
  Skill,
  Settings,
  About,
} from "../types";

// Projects
export async function getProjects(): Promise<Project[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECTS
  );
  return response.documents as unknown as Project[];
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    [Query.equal("featured", true)]
  );
  return response.documents as unknown as Project[];
}

export async function getProjectById(projectId: string): Promise<Project> {
  return databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    projectId
  ) as unknown as Promise<Project>;
}

export async function createProject(
  project: Omit<Project, "$id" | "$createdAt">
): Promise<Project> {
  try {
    console.log("Creating project with data:", project);
    const result = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      "unique()",
      project as Record<string, unknown>
    );
    console.log("Project created:", result);
    return result as unknown as Project;
  } catch (error) {
    console.error("Appwrite createProject error:", error);
    throw error;
  }
}

export async function updateProject(
  projectId: string,
  project: Partial<Omit<Project, "$id" | "$createdAt">>
): Promise<Project> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    projectId,
    project as Record<string, unknown>
  ) as unknown as Project;
}

export async function deleteProject(projectId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId);
}

// Certifications
export async function getCertifications(): Promise<Certification[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.CERTIFICATIONS
  );
  return response.documents as unknown as Certification[];
}

export async function createCertification(
  cert: Omit<Certification, "$id" | "$createdAt">
): Promise<Certification> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.CERTIFICATIONS,
    "unique()",
    cert as Record<string, unknown>
  ) as unknown as Certification;
}

export async function updateCertification(
  certId: string,
  cert: Partial<Omit<Certification, "$id" | "$createdAt">>
): Promise<Certification> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.CERTIFICATIONS,
    certId,
    cert as Record<string, unknown>
  ) as unknown as Certification;
}

export async function deleteCertification(certId: string): Promise<void> {
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.CERTIFICATIONS,
    certId
  );
}

// Education
export async function getEducation(): Promise<Education[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.EDUCATION
  );
  return response.documents as unknown as Education[];
}

// Gallery
export async function getGallery(): Promise<GalleryImage[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.GALLERY,
    [Query.orderAsc("order")]
  );
  return response.documents as unknown as GalleryImage[];
}

// Blog Posts
export async function getBlogPosts(): Promise<BlogPost[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.BLOG_POSTS,
    [Query.orderDesc("publishedAt")]
  );
  return response.documents as unknown as BlogPost[];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.BLOG_POSTS,
    [Query.equal("slug", slug)]
  );
  if (response.documents.length === 0) {
    throw new Error("Blog post not found");
  }
  return response.documents[0] as unknown as BlogPost;
}

export async function createBlogPost(
  post: Omit<BlogPost, "$id">
): Promise<BlogPost> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.BLOG_POSTS,
    ID.unique(),
    post
  ) as unknown as BlogPost;
}

export async function updateBlogPost(
  postId: string,
  post: Partial<Omit<BlogPost, "$id">>
): Promise<BlogPost> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.BLOG_POSTS,
    postId,
    post
  ) as unknown as BlogPost;
}

export async function deleteBlogPost(postId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.BLOG_POSTS, postId);
}

// Comments
export async function getCommentsByPostId(postId: string): Promise<Comment[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.COMMENTS,
    [Query.equal("postId", postId), Query.equal("isApproved", true)]
  );
  return response.documents as unknown as Comment[];
}

export async function createComment(
  comment: Omit<Comment, "$id">
): Promise<Comment> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.COMMENTS,
    "unique()",
    comment as Record<string, unknown>
  ) as unknown as Comment;
}

// Journey
export async function getJourney(): Promise<Journey[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.JOURNEY,
    [Query.orderAsc("order")]
  );
  return response.documents as unknown as Journey[];
}

// Messages
export async function getMessages(): Promise<Message[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.MESSAGES,
    [Query.orderDesc("$createdAt")]
  );
  return response.documents as unknown as Message[];
}

export async function createMessage(
  message: Omit<Message, "$id" | "$createdAt">
): Promise<Message> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.MESSAGES,
    "unique()",
    message as Record<string, unknown>
  ) as unknown as Message;
}

export async function updateMessageStatus(
  messageId: string,
  status: "new" | "read" | "replied"
): Promise<Message> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.MESSAGES,
    messageId,
    { status }
  ) as unknown as Message;
}

export async function deleteMessage(messageId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.MESSAGES, messageId);
}

// Skills
export async function getSkills(): Promise<Skill[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SKILLS
  );
  return response.documents as unknown as Skill[];
}

export async function createSkill(
  skill: Omit<Skill, "$id" | "$createdAt">
): Promise<Skill> {
  try {
    console.log("Creating skill with data:", skill);
    const result = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.SKILLS,
      "unique()",
      skill as Record<string, unknown>
    );
    console.log("Skill created:", result);
    return result as unknown as Skill;
  } catch (error) {
    console.error("Appwrite createSkill error:", error);
    throw error;
  }
}

export async function updateSkill(
  skillId: string,
  skill: Partial<Omit<Skill, "$id" | "$createdAt">>
): Promise<Skill> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SKILLS,
    skillId,
    skill as Record<string, unknown>
  ) as unknown as Skill;
}

export async function deleteSkill(skillId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.SKILLS, skillId);
}

// Gallery CRUD
export async function createGalleryImage(
  image: Omit<GalleryImage, "$id">
): Promise<GalleryImage> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.GALLERY,
    "unique()",
    image as Record<string, unknown>
  ) as unknown as GalleryImage;
}

export async function updateGalleryImage(
  imageId: string,
  image: Partial<Omit<GalleryImage, "$id">>
): Promise<GalleryImage> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.GALLERY,
    imageId,
    image as Record<string, unknown>
  ) as unknown as GalleryImage;
}

export async function deleteGalleryImage(imageId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.GALLERY, imageId);
}

// Education CRUD
export async function createEducation(
  edu: Omit<Education, "$id">
): Promise<Education> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.EDUCATION,
    "unique()",
    edu as Record<string, unknown>
  ) as unknown as Education;
}

export async function updateEducation(
  eduId: string,
  edu: Partial<Omit<Education, "$id">>
): Promise<Education> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.EDUCATION,
    eduId,
    edu as Record<string, unknown>
  ) as unknown as Education;
}

export async function deleteEducation(eduId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.EDUCATION, eduId);
}

// Journey CRUD
export async function createJourney(
  journey: Omit<Journey, "$id">
): Promise<Journey> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.JOURNEY,
    "unique()",
    journey as Record<string, unknown>
  ) as unknown as Journey;
}

export async function updateJourney(
  journeyId: string,
  journey: Partial<Omit<Journey, "$id">>
): Promise<Journey> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.JOURNEY,
    journeyId,
    journey as Record<string, unknown>
  ) as unknown as Journey;
}

export async function deleteJourney(journeyId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.JOURNEY, journeyId);
}

// Settings (for storing admin password and other config)
export async function getSetting(key: string): Promise<Settings | null> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SETTINGS,
      [Query.equal("key", key)]
    );
    if (response.documents.length > 0) {
      return response.documents[0] as unknown as Settings;
    }
    return null;
  } catch (error) {
    console.error("Error getting setting:", error);
    return null;
  }
}

export async function setSetting(
  key: string,
  value: string
): Promise<Settings> {
  // Check if setting exists
  const existing = await getSetting(key);

  if (existing) {
    // Update existing setting
    return databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.SETTINGS,
      existing.$id,
      { value }
    ) as unknown as Settings;
  } else {
    // Create new setting
    return databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.SETTINGS,
      "unique()",
      { key, value }
    ) as unknown as Settings;
  }
}

// Password utilities using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const storedHash = await getSetting("admin_password_hash");
  if (!storedHash) {
    // No password set, use default
    return password === "illona2025";
  }
  const inputHash = await hashPassword(password);
  return inputHash === storedHash.value;
}

export async function setAdminPassword(newPassword: string): Promise<void> {
  const hash = await hashPassword(newPassword);
  await setSetting("admin_password_hash", hash);
}

// About CRUD
export async function getAbout(): Promise<About | null> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ABOUT
    );
    if (response.documents.length > 0) {
      return response.documents[0] as unknown as About;
    }
    return null;
  } catch (error) {
    console.error("Error getting about:", error);
    return null;
  }
}

export async function createAbout(about: Omit<About, "$id">): Promise<About> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.ABOUT,
    "unique()",
    about as Record<string, unknown>
  ) as unknown as About;
}

export async function updateAbout(
  aboutId: string,
  about: Partial<Omit<About, "$id">>
): Promise<About> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.ABOUT,
    aboutId,
    about as Record<string, unknown>
  ) as unknown as About;
}

export async function saveAbout(
  about: Partial<Omit<About, "$id">> & { $id?: string }
): Promise<About> {
  // Check if about profile exists
  const existing = await getAbout();

  if (existing) {
    // Update existing about
    return updateAbout(existing.$id, about);
  } else {
    // Create new about
    return createAbout(about as Omit<About, "$id">);
  }
}

// ============ Storage Functions ============

/**
 * Upload an image to Appwrite Storage
 * @param file - The file to upload
 * @returns The URL of the uploaded image
 */
export async function uploadImage(file: File): Promise<string> {
  try {
    const response = await storage.createFile(
      STORAGE_BUCKET_ID,
      ID.unique(),
      file
    );

    // Get the file URL for viewing
    const fileUrl = storage.getFileView(STORAGE_BUCKET_ID, response.$id);
    return fileUrl.toString();
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

/**
 * Delete an image from Appwrite Storage
 * @param fileId - The ID of the file to delete
 */
export async function deleteImage(fileId: string): Promise<void> {
  try {
    await storage.deleteFile(STORAGE_BUCKET_ID, fileId);
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
}

/**
 * Get the file ID from an Appwrite Storage URL
 * @param url - The full URL of the stored file
 * @returns The file ID
 */
export function getFileIdFromUrl(url: string): string | null {
  try {
    // URL format: https://fra.cloud.appwrite.io/v1/storage/buckets/{bucketId}/files/{fileId}/view
    const match = url.match(/\/files\/([^/]+)\/view/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Get a preview URL for an image with optional transformations
 * @param fileId - The ID of the file
 * @param width - Optional width for resizing
 * @param height - Optional height for resizing
 * @returns The preview URL
 */
export function getImagePreviewUrl(
  fileId: string,
  width?: number,
  height?: number
): string {
  const url = storage.getFilePreview(STORAGE_BUCKET_ID, fileId, width, height);
  return url.toString();
}
