import { FaImage, FaPlus, FaEye, FaEyeSlash } from "react-icons/fa";
import type { GalleryImage } from "@/types";
import { ToastContainer, useToast } from "../../Toast";
import { useGalleryActions } from "./useGalleryActions";
import { useGalleryDrag } from "./useGalleryDrag";
import { GalleryCard } from "./GalleryCard";

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
  const toast = useToast();
  const sortedGallery = [...gallery].sort(
    (a, b) => (a.order || 0) - (b.order || 0),
  );

  const {
    updatingOrder,
    updatingVisibility,
    deletingId,
    handleMoveUp,
    handleMoveDown,
    handleToggleVisibility,
    handleDeleteImage,
  } = useGalleryActions({
    sortedGallery,
    onUpdateOrder,
    onToggleVisibility,
    onDelete,
    toast,
  });
  const {
    draggedItem,
    dragOverIndex,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useGalleryDrag({ sortedGallery, onUpdateOrder });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
          >
            Gallery
          </h1>
          <p
            className={`text-sm sm:text-base transition-colors duration-300 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}
          >
            {isReadOnly
              ? "View portfolio gallery images"
              : "Manage your portfolio gallery images • Drag to reorder"}
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={onShowForm}
            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-xl font-bold text-sm sm:text-base transition duration-200 border shadow-lg ${theme === "dark" ? "bg-gradient-to-r from-oceanic-600 to-oceanic-900 border-oceanic-500/50 text-white hover:from-oceanic-500 hover:to-oceanic-900 shadow-oceanic-500/20" : "bg-gradient-to-r from-oceanic-500 to-oceanic-900 border-oceanic-500/50 text-white hover:from-oceanic-400 hover:to-oceanic-800 shadow-oceanic-500/20"}`}
          >
            <FaPlus className="text-sm" /> Add Image
          </button>
        )}
      </div>

      {!isReadOnly && (
        <div
          className={`flex flex-wrap gap-4 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
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

      {loading ? (
        <div className="text-center py-12">
          <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
            Loading gallery...
          </p>
        </div>
      ) : sortedGallery.length === 0 ? (
        <div
          className={`glass-card border rounded-2xl p-12 text-center ${theme === "dark" ? "bg-gray-800/50 border-gray-700/80" : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"}`}
        >
          <FaImage
            className={`text-4xl mx-auto mb-4 ${theme === "dark" ? "text-gray-600" : "text-slate-400/60"}`}
          />
          <p className={theme === "dark" ? "text-gray-400" : "text-slate-600"}>
            No gallery images yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedGallery.map((image, index) => (
            <GalleryCard
              key={image.$id}
              image={image}
              index={index}
              totalCount={sortedGallery.length}
              theme={theme}
              isReadOnly={isReadOnly}
              dragOverIndex={dragOverIndex}
              draggedItemId={draggedItem?.$id}
              updatingOrder={updatingOrder}
              updatingVisibility={updatingVisibility}
              deletingId={deletingId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onToggleVisibility={handleToggleVisibility}
              onEdit={onEdit}
              onDeleteImage={handleDeleteImage}
            />
          ))}
        </div>
      )}

      <ToastContainer
        toasts={toast.toasts}
        onRemove={toast.removeToast}
        theme={theme}
      />
    </div>
  );
};
