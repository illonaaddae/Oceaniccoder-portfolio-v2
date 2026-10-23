import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { GalleryImage } from "../../types";
import { listRows, manageCreate, manageDelete, manageUpdate, usesCosmos } from "./dataApi";

export async function getGallery(): Promise<GalleryImage[]> {
  const response = usesCosmos
    ? await listRows(COLLECTIONS.GALLERY, { orderBy: "order", limit: 100 })
    : await databases.listDocuments(DATABASE_ID, COLLECTIONS.GALLERY, [
        Query.orderAsc("order"),
        Query.limit(100),
      ]);
  return response.documents as unknown as GalleryImage[];
}

export async function createGalleryImage(image: Omit<GalleryImage, "$id">): Promise<GalleryImage> {
  return (usesCosmos
    ? manageCreate(COLLECTIONS.GALLERY, image as Record<string, unknown>)
    : databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.GALLERY,
        ID.unique(),
        image as Record<string, unknown>,
      )) as unknown as GalleryImage;
}

export async function updateGalleryImage(
  imageId: string,
  image: Partial<Omit<GalleryImage, "$id">>,
): Promise<GalleryImage> {
  return (usesCosmos
    ? manageUpdate(COLLECTIONS.GALLERY, imageId, image as Record<string, unknown>)
    : databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.GALLERY,
        imageId,
        image as Record<string, unknown>,
      )) as unknown as GalleryImage;
}

export async function deleteGalleryImage(imageId: string): Promise<void> {
  await (usesCosmos
    ? manageDelete(COLLECTIONS.GALLERY, imageId)
    : databases.deleteDocument(DATABASE_ID, COLLECTIONS.GALLERY, imageId));
}
