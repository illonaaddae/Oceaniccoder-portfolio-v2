import { COLLECTIONS } from "./collections";
import type { GalleryImage } from "../../types";
import { listRows, manageCreate, manageDelete, manageUpdate } from "./dataApi";

export async function getGallery(): Promise<GalleryImage[]> {
  const response = await listRows(COLLECTIONS.GALLERY, { orderBy: "order", limit: 100 });
  return response.documents as unknown as GalleryImage[];
}

export async function createGalleryImage(image: Omit<GalleryImage, "$id">): Promise<GalleryImage> {
  return manageCreate<GalleryImage>(COLLECTIONS.GALLERY, image);
}

export async function updateGalleryImage(
  imageId: string,
  image: Partial<Omit<GalleryImage, "$id">>,
): Promise<GalleryImage> {
  return manageUpdate<GalleryImage>(COLLECTIONS.GALLERY, imageId, image);
}

export async function deleteGalleryImage(imageId: string): Promise<void> {
  await manageDelete(COLLECTIONS.GALLERY, imageId);
}
