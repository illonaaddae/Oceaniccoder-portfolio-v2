import type { GalleryImage } from "@/types";
import {
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
} from "@/services/api";
import type { LoadDataFn } from "./types";

export function createGalleryHandlers(loadData: LoadDataFn) {
  const handleAddGalleryImage = async (
    imageForm: Omit<GalleryImage, "$id">,
  ) => {
    try {
      await createGalleryImage(imageForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add gallery image:", err);
      throw err;
    }
  };

  const handleUpdateGalleryImage = async (
    imageId: string,
    imageForm: Partial<Omit<GalleryImage, "$id">>,
  ) => {
    try {
      await updateGalleryImage(imageId, imageForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update gallery image:", err);
      throw err;
    }
  };

  const handleDeleteGalleryImage = async (imageId: string) => {
    try {
      await deleteGalleryImage(imageId);
      await loadData(false);
    } catch (err) {
      console.error("Failed to delete gallery image:", err);
      throw err;
    }
  };

  const handleUpdateGalleryOrder = async (
    imageId: string,
    newOrder: number,
  ) => {
    try {
      await updateGalleryImage(imageId, { order: newOrder });
      await loadData(false);
    } catch (err) {
      console.error("Failed to update gallery order:", err);
      throw err;
    }
  };

  const handleToggleGalleryVisibility = async (
    imageId: string,
    isPublic: boolean,
  ) => {
    try {
      await updateGalleryImage(imageId, { isPublic });
      await loadData(false);
    } catch (err) {
      console.error("Failed to toggle gallery visibility:", err);
      throw err;
    }
  };

  return {
    handleAddGalleryImage,
    handleUpdateGalleryImage,
    handleDeleteGalleryImage,
    handleUpdateGalleryOrder,
    handleToggleGalleryVisibility,
  };
}
