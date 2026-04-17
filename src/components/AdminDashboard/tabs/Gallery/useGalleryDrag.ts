import { useState } from "react";
import type { GalleryImage } from "@/types";

interface UseGalleryDragParams {
  sortedGallery: GalleryImage[];
  onUpdateOrder?: (id: string, newOrder: number) => Promise<void>;
}

export function useGalleryDrag({
  sortedGallery,
  onUpdateOrder,
}: UseGalleryDragParams) {
  const [draggedItem, setDraggedItem] = useState<GalleryImage | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const handleDragStart = (e: React.DragEvent, image: GalleryImage) => {
    setDraggedItem(image);
    e.dataTransfer.effectAllowed = "move";
    (e.target as HTMLElement).style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = "1";
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => setDragOverIndex(null);

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem || !onUpdateOrder) return;
    const sourceIndex = sortedGallery.findIndex(
      (img) => img.$id === draggedItem.$id,
    );
    if (sourceIndex === targetIndex) {
      setDraggedItem(null);
      setDragOverIndex(null);
      return;
    }
    setReordering(true);
    try {
      const newGallery = [...sortedGallery];
      const [removed] = newGallery.splice(sourceIndex, 1);
      newGallery.splice(targetIndex, 0, removed);
      for (let i = 0; i < newGallery.length; i++) {
        if (newGallery[i].order !== i) {
          await onUpdateOrder(newGallery[i].$id, i);
        }
      }
    } catch (err) {
      console.error("Failed to reorder:", err);
    } finally {
      setDraggedItem(null);
      setDragOverIndex(null);
      setReordering(false);
    }
  };

  return {
    draggedItem,
    dragOverIndex,
    reordering,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
