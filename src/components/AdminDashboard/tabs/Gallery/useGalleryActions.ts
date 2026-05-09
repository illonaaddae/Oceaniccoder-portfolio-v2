import { useState } from "react";
import type { GalleryImage } from "@/types";

interface UseGalleryActionsParams {
  sortedGallery: GalleryImage[];
  onUpdateOrder?: (id: string, newOrder: number) => Promise<void>;
  onToggleVisibility?: (id: string, isPublic: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  toast: { success: (msg: string) => void; error: (msg: string) => void };
}

export function useGalleryActions({
  sortedGallery,
  onUpdateOrder,
  onToggleVisibility,
  onDelete,
  toast,
}: UseGalleryActionsParams) {
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [updatingVisibility, setUpdatingVisibility] = useState<string | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleMoveUp = async (image: GalleryImage, currentIndex: number) => {
    if (currentIndex === 0 || !onUpdateOrder) return;
    setUpdatingOrder(image.$id);
    try {
      const prev = sortedGallery[currentIndex - 1];
      await onUpdateOrder(image.$id, prev.order ?? currentIndex - 1);
      await onUpdateOrder(prev.$id, image.order ?? currentIndex);
      toast.success("Image moved up successfully!");
    } catch {
      toast.error("Failed to move image. Please try again.");
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleMoveDown = async (image: GalleryImage, currentIndex: number) => {
    if (currentIndex === sortedGallery.length - 1 || !onUpdateOrder) return;
    setUpdatingOrder(image.$id);
    try {
      const next = sortedGallery[currentIndex + 1];
      await onUpdateOrder(image.$id, next.order ?? currentIndex + 1);
      await onUpdateOrder(next.$id, image.order ?? currentIndex);
      toast.success("Image moved down successfully!");
    } catch {
      toast.error("Failed to move image. Please try again.");
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleToggleVisibility = async (image: GalleryImage) => {
    if (!onToggleVisibility) return;
    setUpdatingVisibility(image.$id);
    try {
      const newVis = !(image.isPublic ?? true);
      await onToggleVisibility(image.$id, newVis);
      toast.success(newVis ? "Image is now public!" : "Image is now hidden.");
    } catch {
      toast.error("Failed to update visibility. Please try again.");
    } finally {
      setUpdatingVisibility(null);
    }
  };

  const handleDeleteImage = async (image: GalleryImage) => {
    if (!window.confirm("Delete this image?")) return;
    setDeletingId(image.$id);
    try {
      await onDelete(image.$id);
      toast.success(`Image "${image.alt || "Untitled"}" deleted successfully!`);
    } catch {
      toast.error("Failed to delete image. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return {
    updatingOrder,
    updatingVisibility,
    deletingId,
    handleMoveUp,
    handleMoveDown,
    handleToggleVisibility,
    handleDeleteImage,
  };
}
