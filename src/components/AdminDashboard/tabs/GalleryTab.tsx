import { useState } from "react";
import {
  FaImage,
  FaPlus,
  FaEdit,
  FaTrash,
  FaGripVertical,
  FaEye,
  FaEyeSlash,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";
import type { GalleryImage } from "@/types";
import { ToastContainer, useToast } from "../Toast";

interface GalleryTabProps {
  theme: "light" | "dark";
  loading: boolean;
  gallery: GalleryImage[];
  onDelete: (id: string) => Promise<void>;
  onEdit?: (image: GalleryImage) => void;
  onShowForm?: () => void;
  onUpdateOrder?: (id: string, newOrder: number) => Promise<void>;
  onToggleVisibility?: (id: string, isPublic: boolean) => Promise<void>;
  isReadOnly?: boolean;
}

export const GalleryTab: React.FC<GalleryTabProps> = ({
  theme,
  loading,
  gallery,
  onDelete,
  onEdit,
  onShowForm,
  onUpdateOrder,
  onToggleVisibility,
  isReadOnly = false,
}) => {
  const [draggedItem, setDraggedItem] = useState<GalleryImage | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [updatingVisibility, setUpdatingVisibility] = useState<string | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();

  // Sort gallery by order
  const sortedGallery = [...gallery].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  // Move image up in order
  const handleMoveUp = async (image: GalleryImage, currentIndex: number) => {
    if (currentIndex === 0 || !onUpdateOrder) return;
    setUpdatingOrder(image.$id);
    try {
      const prevImage = sortedGallery[currentIndex - 1];
      await onUpdateOrder(image.$id, prevImage.order ?? currentIndex - 1);
      await onUpdateOrder(prevImage.$id, image.order ?? currentIndex);
      toast.success("Image moved up successfully!");
    } catch (err) {
      console.error("Failed to update order:", err);
      toast.error("Failed to move image. Please try again.");
    } finally {
      setUpdatingOrder(null);
    }
  };

  // Move image down in order
  const handleMoveDown = async (image: GalleryImage, currentIndex: number) => {
    if (currentIndex === sortedGallery.length - 1 || !onUpdateOrder) return;
    setUpdatingOrder(image.$id);
    try {
      const nextImage = sortedGallery[currentIndex + 1];
      await onUpdateOrder(image.$id, nextImage.order ?? currentIndex + 1);
      await onUpdateOrder(nextImage.$id, image.order ?? currentIndex);
      toast.success("Image moved down successfully!");
    } catch (err) {
      console.error("Failed to update order:", err);
      toast.error("Failed to move image. Please try again.");
    } finally {
      setUpdatingOrder(null);
    }
  };

  // Toggle visibility
  const handleToggleVisibility = async (image: GalleryImage) => {
    if (!onToggleVisibility) return;
    setUpdatingVisibility(image.$id);
    try {
      const newVisibility = !(image.isPublic ?? true);
      await onToggleVisibility(image.$id, newVisibility);
      toast.success(
        newVisibility ? "Image is now public!" : "Image is now hidden."
      );
    } catch (err) {
      console.error("Failed to toggle visibility:", err);
      toast.error("Failed to update visibility. Please try again.");
    } finally {
      setUpdatingVisibility(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, image: GalleryImage) => {
    setDraggedItem(image);
    e.dataTransfer.effectAllowed = "move";
    const target = e.target as HTMLElement;
    target.style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = "1";
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem || !onUpdateOrder) return;

    const sourceIndex = sortedGallery.findIndex(
      (img) => img.$id === draggedItem.$id
    );
    if (sourceIndex === targetIndex) {
      setDraggedItem(null);
      setDragOverIndex(null);
      return;
    }

    setUpdatingOrder(draggedItem.$id);

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
      setUpdatingOrder(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            Gallery
          </h1>
          <p
            className={`text-sm sm:text-base transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {isReadOnly
              ? "View portfolio gallery images"
              : "Manage your portfolio gallery images • Drag to reorder"}
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={onShowForm}
            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-xl font-bold text-sm sm:text-base transition duration-200 border shadow-lg ${
              theme === "dark"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-500/50 text-white hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20"
                : "bg-gradient-to-r from-blue-500 to-cyan-400 border-blue-400/50 text-white hover:from-blue-600 hover:to-cyan-500 shadow-blue-400/30"
            }`}
          >
            <FaPlus className="text-sm" />
            Add Image
          </button>
        )}
      </div>

      {/* Legend - only show for admins */}
      {!isReadOnly && (
        <div
          className={`flex flex-wrap gap-4 text-sm ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <FaEye className="text-green-500" />
            <span>Public (visible to visitors)</span>
          </div>
          <div className="flex items-center gap-2">
            <FaEyeSlash className="text-yellow-500" />
            <span>Hidden (admin only)</span>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
            Loading gallery...
          </p>
        </div>
      ) : sortedGallery.length === 0 ? (
        <div
          className={`glass-card border rounded-2xl p-12 text-center ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
          }`}
        >
          <FaImage
            className={`text-4xl mx-auto mb-4 ${
              theme === "dark" ? "text-gray-600" : "text-slate-400/60"
            }`}
          />
          <p className={theme === "dark" ? "text-gray-400" : "text-slate-600"}>
            No gallery images yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedGallery.map((image, index) => (
            <div
              key={image.$id}
              draggable={!isReadOnly}
              onDragStart={(e) => !isReadOnly && handleDragStart(e, image)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => !isReadOnly && handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => !isReadOnly && handleDrop(e, index)}
              className={`glass-card border rounded-2xl overflow-hidden transition-all duration-200 relative ${
                theme === "dark"
                  ? "bg-gray-800/50 border-gray-700/80"
                  : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
              } ${
                dragOverIndex === index
                  ? "ring-2 ring-cyan-500 scale-[1.02]"
                  : ""
              } ${draggedItem?.$id === image.$id ? "opacity-50" : ""} ${
                image.isPublic === false && !isReadOnly ? "opacity-80" : ""
              } ${updatingOrder === image.$id ? "pointer-events-none" : ""}`}
            >
              {/* Visibility Badge - only show for admin */}
              {!isReadOnly && (
                <div className="absolute top-2 left-2 z-10">
                  {image.isPublic === false ? (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/90 text-white text-xs font-medium shadow">
                      <FaEyeSlash className="text-xs" /> Hidden
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/90 text-white text-xs font-medium shadow">
                      <FaEye className="text-xs" /> Public
                    </span>
                  )}
                </div>
              )}

              <div className="relative group">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/400x300?text=Image+Not+Found";
                  }}
                />
                {/* Drag Handle - only for admin */}
                {!isReadOnly && (
                  <div
                    className={`absolute top-2 right-2 p-2 rounded-lg cursor-grab active:cursor-grabbing ${
                      theme === "dark"
                        ? "bg-black/50 text-white"
                        : "bg-white/80 text-slate-700"
                    }`}
                    title="Drag to reorder"
                  >
                    <FaGripVertical />
                  </div>
                )}

                {/* Hover Actions - only for admin */}
                {!isReadOnly && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {/* Toggle Visibility */}
                    <button
                      onClick={() => handleToggleVisibility(image)}
                      disabled={updatingVisibility === image.$id}
                      className={`p-2 rounded-lg transition ${
                        image.isPublic === false
                          ? "bg-green-500/50 text-white hover:bg-green-500/70"
                          : "bg-yellow-500/50 text-white hover:bg-yellow-500/70"
                      } ${
                        updatingVisibility === image.$id
                          ? "opacity-50 cursor-wait"
                          : ""
                      }`}
                      title={
                        image.isPublic === false
                          ? "Make Public"
                          : "Hide from Public"
                      }
                    >
                      {image.isPublic === false ? <FaEye /> : <FaEyeSlash />}
                    </button>

                    <button
                      onClick={() => onEdit?.(image)}
                      className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition"
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm("Delete this image?")) {
                          setDeletingId(image.$id);
                          try {
                            await onDelete(image.$id);
                            toast.success(
                              `Image "${
                                image.alt || "Untitled"
                              }" deleted successfully!`
                            );
                          } catch (err) {
                            console.error("Failed to delete image:", err);
                            toast.error(
                              "Failed to delete image. Please try again."
                            );
                          } finally {
                            setDeletingId(null);
                          }
                        }
                      }}
                      disabled={deletingId === image.$id}
                      className={`p-2 rounded-lg bg-red-500/50 text-white hover:bg-red-500/70 transition ${
                        deletingId === image.$id ? "opacity-50 cursor-wait" : ""
                      }`}
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium truncate ${
                        theme === "dark" ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {image.alt}
                    </p>
                    {image.caption && (
                      <p
                        className={`text-sm truncate mt-1 ${
                          theme === "dark" ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {image.caption}
                      </p>
                    )}
                  </div>

                  {/* Order Controls - only for admin */}
                  {!isReadOnly && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMoveUp(image, index)}
                        disabled={index === 0 || updatingOrder === image.$id}
                        className={`p-1.5 rounded transition ${
                          index === 0
                            ? "opacity-30 cursor-not-allowed"
                            : theme === "dark"
                            ? "hover:bg-gray-700 text-slate-400 hover:text-white"
                            : "hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                        } ${
                          updatingOrder === image.$id ? "animate-pulse" : ""
                        }`}
                        title="Move up"
                      >
                        <FaArrowUp className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(image, index)}
                        disabled={
                          index === sortedGallery.length - 1 ||
                          updatingOrder === image.$id
                        }
                        className={`p-1.5 rounded transition ${
                          index === sortedGallery.length - 1
                            ? "opacity-30 cursor-not-allowed"
                            : theme === "dark"
                            ? "hover:bg-gray-700 text-slate-400 hover:text-white"
                            : "hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                        } ${
                          updatingOrder === image.$id ? "animate-pulse" : ""
                        }`}
                        title="Move down"
                      >
                        <FaArrowDown className="text-xs" />
                      </button>
                    </div>
                  )}
                </div>

                {!isReadOnly && (
                  <p
                    className={`text-xs mt-2 ${
                      theme === "dark" ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Order: {image.order ?? 0}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer
        toasts={toast.toasts}
        onRemove={toast.removeToast}
        theme={theme}
      />
    </div>
  );
};
