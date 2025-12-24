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
  BlogReaction,
  Comment,
  Journey,
  Message,
  Skill,
  Settings,
  About,
  Testimonial,
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
    const result = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      ID.unique(),
      project as Record<string, unknown>
    );
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
  // Clean up data - only include fields with values
  const cleanedData: Record<string, unknown> = {
    title: cert.title,
    issuer: cert.issuer,
    date: cert.date,
    platform: cert.platform,
  };

  // Only add optional fields if they have values
  if (cert.credential) cleanedData.credential = cert.credential;
  if (cert.skills && cert.skills.length > 0) cleanedData.skills = cert.skills;
  if (cert.downloadLink) cleanedData.downloadLink = cert.downloadLink;
  if (cert.verifyLink) cleanedData.verifyLink = cert.verifyLink;
  if (cert.platformColor) cleanedData.platformColor = cert.platformColor;
  if (cert.image) cleanedData.image = cert.image;

  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.CERTIFICATIONS,
    ID.unique(),
    cleanedData
  ) as unknown as Certification;
}

export async function updateCertification(
  certId: string,
  cert: Partial<Omit<Certification, "$id" | "$createdAt">>
): Promise<Certification> {
  // Clean up data - only include fields with values, set empty URL fields to null
  const cleanedData: Record<string, unknown> = {};

  if (cert.title !== undefined) cleanedData.title = cert.title;
  if (cert.issuer !== undefined) cleanedData.issuer = cert.issuer;
  if (cert.date !== undefined) cleanedData.date = cert.date;
  if (cert.platform !== undefined) cleanedData.platform = cert.platform;
  if (cert.credential !== undefined)
    cleanedData.credential = cert.credential || null;
  if (cert.skills !== undefined) cleanedData.skills = cert.skills;
  if (cert.platformColor !== undefined)
    cleanedData.platformColor = cert.platformColor || null;

  // URL fields - must be valid URL or null
  if (cert.downloadLink !== undefined)
    cleanedData.downloadLink = cert.downloadLink || null;
  if (cert.verifyLink !== undefined)
    cleanedData.verifyLink = cert.verifyLink || null;
  if (cert.image !== undefined) cleanedData.image = cert.image || null;

  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.CERTIFICATIONS,
    certId,
    cleanedData
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
    [Query.orderAsc("order"), Query.limit(100)] // Increase limit to fetch all gallery items
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
  try {
    // Clean up the data - only include fields with values
    const cleanedData: Record<string, unknown> = {
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
    };

    // Only add optional fields if they have values
    if (post.category) cleanedData.category = post.category;
    if (post.tags && post.tags.length > 0) cleanedData.tags = post.tags;
    if (post.publishedAt) cleanedData.publishedAt = post.publishedAt;
    if (post.readTime) cleanedData.readTime = post.readTime;
    if (post.image) cleanedData.image = post.image;
    if (post.featured !== undefined) cleanedData.featured = post.featured;
    if (post.published !== undefined) cleanedData.published = post.published;

    const result = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.BLOG_POSTS,
      ID.unique(),
      cleanedData
    );
    return result as unknown as BlogPost;
  } catch (error) {
    console.error("Appwrite createBlogPost error:", error);
    throw error;
  }
}

export async function updateBlogPost(
  postId: string,
  post: Partial<Omit<BlogPost, "$id">>
): Promise<BlogPost> {
  try {
    // Clean up the data - only include fields that are provided
    const cleanedData: Record<string, unknown> = {};

    if (post.title !== undefined) cleanedData.title = post.title;
    if (post.slug !== undefined) cleanedData.slug = post.slug;
    if (post.excerpt !== undefined) cleanedData.excerpt = post.excerpt;
    if (post.content !== undefined) cleanedData.content = post.content;
    if (post.category !== undefined)
      cleanedData.category = post.category || null;
    if (post.tags !== undefined)
      cleanedData.tags = post.tags && post.tags.length > 0 ? post.tags : [];
    if (post.publishedAt !== undefined)
      cleanedData.publishedAt = post.publishedAt || null;
    if (post.readTime !== undefined)
      cleanedData.readTime = post.readTime || null;
    if (post.image !== undefined) cleanedData.image = post.image || null;
    if (post.featured !== undefined) cleanedData.featured = post.featured;
    if (post.published !== undefined) cleanedData.published = post.published;

    const result = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.BLOG_POSTS,
      postId,
      cleanedData
    );
    return result as unknown as BlogPost;
  } catch (error) {
    console.error("Appwrite updateBlogPost error:", error);
    throw error;
  }
}

export async function deleteBlogPost(postId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.BLOG_POSTS, postId);
}

// Blog Reactions
export async function getPostReactions(
  postId: string
): Promise<{ likes: number; dislikes: number }> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.BLOG_REACTIONS,
      [Query.equal("postId", postId)]
    );
    const reactions = response.documents as unknown as BlogReaction[];
    const likes = reactions.filter((r) => r.reaction === "like").length;
    const dislikes = reactions.filter((r) => r.reaction === "dislike").length;
    return { likes, dislikes };
  } catch {
    // Collection might not exist yet
    return { likes: 0, dislikes: 0 };
  }
}

export async function getVisitorReaction(
  postId: string,
  visitorId: string
): Promise<BlogReaction | null> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.BLOG_REACTIONS,
      [Query.equal("postId", postId), Query.equal("visitorId", visitorId)]
    );
    if (response.documents.length > 0) {
      return response.documents[0] as unknown as BlogReaction;
    }
    return null;
  } catch {
    return null;
  }
}

export async function addReaction(
  postId: string,
  visitorId: string,
  reaction: "like" | "dislike"
): Promise<BlogReaction> {
  // Check if visitor already reacted
  const existing = await getVisitorReaction(postId, visitorId);

  if (existing) {
    // Update existing reaction
    if (existing.reaction === reaction) {
      // Same reaction - remove it (toggle off)
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.BLOG_REACTIONS,
        existing.$id
      );
      return existing;
    } else {
      // Different reaction - update it
      return databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.BLOG_REACTIONS,
        existing.$id,
        { reaction }
      ) as unknown as BlogReaction;
    }
  } else {
    // Create new reaction
    return databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.BLOG_REACTIONS,
      ID.unique(),
      { postId, visitorId, reaction }
    ) as unknown as BlogReaction;
  }
}

export async function removeReaction(reactionId: string): Promise<void> {
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.BLOG_REACTIONS,
    reactionId
  );
}

// Comments
export async function getCommentsByPostId(postId: string): Promise<Comment[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.COMMENTS,
    [
      Query.equal("postId", postId),
      Query.equal("isApproved", true),
      Query.orderDesc("$createdAt"),
    ]
  );
  return response.documents as unknown as Comment[];
}

export async function getAllComments(): Promise<Comment[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.COMMENTS,
    [Query.orderDesc("$createdAt"), Query.limit(100)]
  );
  return response.documents as unknown as Comment[];
}

export async function updateComment(
  commentId: string,
  data: Partial<Comment>
): Promise<Comment> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.COMMENTS,
    commentId,
    data as Record<string, unknown>
  ) as unknown as Comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.COMMENTS, commentId);
}

export async function createComment(
  comment: Omit<Comment, "$id">
): Promise<Comment> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.COMMENTS,
    ID.unique(),
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
    ID.unique(),
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
    const result = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.SKILLS,
      ID.unique(),
      skill as Record<string, unknown>
    );
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
    ID.unique(),
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
  try {
    // Clean up the data - remove empty strings and undefined values for optional fields
    const cleanedData: Record<string, unknown> = {
      institution: edu.institution,
      degree: edu.degree,
      period: edu.period,
    };

    // Only add optional fields if they have values
    if (edu.field) cleanedData.field = edu.field;
    if (edu.achievement) cleanedData.achievement = edu.achievement;
    if (edu.description) cleanedData.description = edu.description;
    // Handle logo field - use 'universityLogo' as the Appwrite attribute name
    const logoUrl = edu.universityLogo || edu.logo;
    if (logoUrl) {
      cleanedData.universityLogo = logoUrl;
    }
    if (edu.gpa) cleanedData.gpa = edu.gpa;
    if (edu.classHonours) cleanedData.classHonours = edu.classHonours;
    if (edu.startDate) cleanedData.startDate = edu.startDate;
    if (edu.endDate) cleanedData.endDate = edu.endDate;
    if (edu.isOngoing !== undefined) cleanedData.isOngoing = edu.isOngoing;
    if (edu.initials) cleanedData.initials = edu.initials;
    if (edu.location) cleanedData.location = edu.location;
    if (edu.isVisible !== undefined) cleanedData.isVisible = edu.isVisible;

    const result = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.EDUCATION,
      ID.unique(),
      cleanedData
    );
    return result as unknown as Education;
  } catch (error) {
    console.error("Appwrite createEducation error:", error);
    throw error;
  }
}

export async function updateEducation(
  eduId: string,
  edu: Partial<Omit<Education, "$id">>
): Promise<Education> {
  try {
    // Clean up the data - only include fields that are provided
    const cleanedData: Record<string, unknown> = {};

    if (edu.institution !== undefined)
      cleanedData.institution = edu.institution;
    if (edu.degree !== undefined) cleanedData.degree = edu.degree;
    if (edu.period !== undefined) cleanedData.period = edu.period;
    if (edu.field !== undefined) cleanedData.field = edu.field || null;
    if (edu.achievement !== undefined)
      cleanedData.achievement = edu.achievement || null;
    if (edu.description !== undefined)
      cleanedData.description = edu.description || null;
    // Handle logo field - use 'universityLogo' as the Appwrite attribute name
    if (edu.universityLogo !== undefined || edu.logo !== undefined) {
      cleanedData.universityLogo = edu.universityLogo || edu.logo || null;
    }
    if (edu.gpa !== undefined) cleanedData.gpa = edu.gpa || null;
    if (edu.classHonours !== undefined)
      cleanedData.classHonours = edu.classHonours || null;
    if (edu.startDate !== undefined)
      cleanedData.startDate = edu.startDate || null;
    if (edu.endDate !== undefined) cleanedData.endDate = edu.endDate || null;
    if (edu.isOngoing !== undefined) cleanedData.isOngoing = edu.isOngoing;
    if (edu.initials !== undefined) cleanedData.initials = edu.initials || null;
    if (edu.location !== undefined) cleanedData.location = edu.location || null;
    if (edu.isVisible !== undefined) cleanedData.isVisible = edu.isVisible;

    const result = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.EDUCATION,
      eduId,
      cleanedData
    );
    return result as unknown as Education;
  } catch (error) {
    console.error("Appwrite updateEducation error:", error);
    throw error;
  }
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
    ID.unique(),
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
    // Re-throw the error so callers can handle it appropriately
    throw error;
  }
}

export async function setSetting(
  key: string,
  value: string
): Promise<Settings> {
  try {
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
        ID.unique(),
        { key, value }
      ) as unknown as Settings;
    }
  } catch (error) {
    console.error("Error setting value:", error);
    throw error;
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
  try {
    const storedHash = await getSetting("admin_password_hash");
    if (!storedHash) {
      // No password set yet - first time setup, hash and store the provided password
      // For security, require password to be set via environment or during first login
      const envPassword = import.meta.env.VITE_ADMIN_PASSWORD;
      if (envPassword && password === envPassword) {
        // Auto-set the password hash on first valid login
        await setAdminPassword(password);
        return true;
      }
      return false;
    }
    const inputHash = await hashPassword(password);
    return inputHash === storedHash.value;
  } catch (error) {
    console.error("Error verifying password:", error);
    // Fallback to environment variable if settings collection is not accessible
    const envPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    return envPassword ? password === envPassword : false;
  }
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
    ID.unique(),
    about as Record<string, unknown>
  ) as unknown as About;
}

export async function updateAbout(
  aboutId: string,
  about: Partial<Omit<About, "$id">>
): Promise<About> {
  try {
    return (await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.ABOUT,
      aboutId,
      about as Record<string, unknown>
    )) as unknown as About;
  } catch (error: unknown) {
    // Log detailed error for debugging
    console.error("Error updating about:", error);

    // Check if it's an Appwrite error about missing attributes
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("Unknown attribute") ||
      errorMessage.includes("attribute")
    ) {
      const attrMatch = errorMessage.match(/"([^"]+)"/);
      const missingAttr = attrMatch ? attrMatch[1] : "unknown";
      throw new Error(
        `The attribute "${missingAttr}" doesn't exist in your Appwrite database. ` +
          `Please add it to the "about" collection in Appwrite Console.`
      );
    }
    throw error;
  }
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
    try {
      return await createAbout(about as Omit<About, "$id">);
    } catch (error: unknown) {
      console.error("Error creating about:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("Unknown attribute") ||
        errorMessage.includes("attribute")
      ) {
        const attrMatch = errorMessage.match(/"([^"]+)"/);
        const missingAttr = attrMatch ? attrMatch[1] : "unknown";
        throw new Error(
          `The attribute "${missingAttr}" doesn't exist in your Appwrite database. ` +
            `Please add it to the "about" collection in Appwrite Console.`
        );
      }
      throw error;
    }
  }
}

// ============ Storage Functions ============

export interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  usedPercentage: number;
  maxStorageMB: number;
}

/**
 * Get storage statistics for the bucket
 * @returns Storage statistics including file count and total size
 */
export async function getStorageStats(): Promise<StorageStats> {
  try {
    const response = await storage.listFiles(STORAGE_BUCKET_ID);

    // Calculate total size from all files
    let totalSizeBytes = 0;
    for (const file of response.files) {
      totalSizeBytes += file.sizeOriginal || 0;
    }

    const totalSizeMB = totalSizeBytes / (1024 * 1024);
    const maxStorageMB = 2048; // 2GB free tier limit for Appwrite
    const usedPercentage = Math.min((totalSizeMB / maxStorageMB) * 100, 100);

    return {
      totalFiles: response.total,
      totalSizeBytes,
      totalSizeMB: Math.round(totalSizeMB * 100) / 100,
      usedPercentage: Math.round(usedPercentage * 10) / 10,
      maxStorageMB,
    };
  } catch (error) {
    console.error("Error getting storage stats:", error);
    return {
      totalFiles: 0,
      totalSizeBytes: 0,
      totalSizeMB: 0,
      usedPercentage: 0,
      maxStorageMB: 2048,
    };
  }
}

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
  } catch (error: unknown) {
    console.error("Error uploading image:", error);
    // Provide more context about the error
    const appwriteError = error as {
      message?: string;
      code?: number;
      type?: string;
    };
    if (appwriteError.code === 401) {
      throw new Error(
        "Storage permission denied. Check bucket permissions in Appwrite Console."
      );
    } else if (appwriteError.code === 404) {
      throw new Error(
        "Storage bucket not found. Verify STORAGE_BUCKET_ID in appwrite.ts"
      );
    }
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

// Testimonials
export async function getTestimonials(): Promise<Testimonial[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.TESTIMONIALS,
    [Query.orderAsc("order")]
  );
  return response.documents as unknown as Testimonial[];
}

export async function getFeaturedTestimonials(): Promise<Testimonial[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.TESTIMONIALS,
    [Query.equal("featured", true), Query.orderAsc("order")]
  );
  return response.documents as unknown as Testimonial[];
}

export async function createTestimonial(
  testimonial: Omit<Testimonial, "$id" | "$createdAt">
): Promise<Testimonial> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.TESTIMONIALS,
    ID.unique(),
    testimonial as Record<string, unknown>
  ) as unknown as Testimonial;
}

export async function updateTestimonial(
  testimonialId: string,
  testimonial: Partial<Omit<Testimonial, "$id" | "$createdAt">>
): Promise<Testimonial> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.TESTIMONIALS,
    testimonialId,
    testimonial as Record<string, unknown>
  ) as unknown as Testimonial;
}

export async function deleteTestimonial(testimonialId: string): Promise<void> {
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.TESTIMONIALS,
    testimonialId
  );
}
