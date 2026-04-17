import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { GalleryImage } from "../../types";

export async function getGallery(): Promise<GalleryImage[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.GALLERY,
    [Query.orderAsc("order"), Query.limit(100)],
  );
  return response.documents as unknown as GalleryImage[];
}

export async function createGalleryImage(
  image: Omit<GalleryImage, "$id">,
): Promise<GalleryImage> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.GALLERY,
    ID.unique(),
    image as Record<string, unknown>,
  ) as unknown as GalleryImage;
}

export async function updateGalleryImage(
  imageId: string,
  image: Partial<Omit<GalleryImage, "$id">>,
): Promise<GalleryImage> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.GALLERY,
    imageId,
    image as Record<string, unknown>,
  ) as unknown as GalleryImage;
}

export async function deleteGalleryImage(imageId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.GALLERY, imageId);
}
