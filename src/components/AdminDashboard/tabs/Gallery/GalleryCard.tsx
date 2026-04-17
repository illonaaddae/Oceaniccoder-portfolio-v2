import {
  FaGripVertical,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";
import type { GalleryImage } from "@/types";

interface GalleryCardProps {
  image: GalleryImage;
  index: number;
  totalCount: number;
  theme: "light" | "dark";
  isReadOnly: boolean;
  dragOverIndex: number | null;
  draggedItemId: string | undefined;
  updatingOrder: string | null;
  updatingVisibility: string | null;
  deletingId: string | null;
  onDragStart: (e: React.DragEvent, image: GalleryImage) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onMoveUp: (image: GalleryImage, index: number) => void;
  onMoveDown: (image: GalleryImage, index: number) => void;
  onToggleVisibility: (image: GalleryImage) => void;
  onEdit?: (image: GalleryImage) => void;
  onDeleteImage: (image: GalleryImage) => void;
}

export const GalleryCard: React.FC<GalleryCardProps> = ({
  image,
  index,
  totalCount,
  theme,
  isReadOnly,
  dragOverIndex,
  draggedItemId,
  updatingOrder,
  updatingVisibility,
  deletingId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onEdit,
  onDeleteImage,
}) => {
  const cardBg =
    theme === "dark"
      ? "bg-gray-800/50 border-gray-700/80"
      : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40";

  return (
    <div
      draggable={!isReadOnly}
      onDragStart={(e) => !isReadOnly && onDragStart(e, image)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => !isReadOnly && onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => !isReadOnly && onDrop(e, index)}
      className={`glass-card border rounded-2xl overflow-hidden transition-all duration-200 relative ${cardBg} ${dragOverIndex === index ? "ring-2 ring-oceanic-500 scale-[1.02]" : ""} ${draggedItemId === image.$id ? "opacity-50" : ""} ${image.isPublic === false && !isReadOnly ? "opacity-80" : ""} ${updatingOrder === image.$id ? "pointer-events-none" : ""}`}
    >
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
        {!isReadOnly && (
          <div
            className={`absolute top-2 right-2 p-2 rounded-lg cursor-grab active:cursor-grabbing ${theme === "dark" ? "bg-black/50 text-white" : "bg-white/80 text-slate-700"}`}
            title="Drag to reorder"
          >
            <FaGripVertical />
          </div>
        )}
        {!isReadOnly && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => onToggleVisibility(image)}
              disabled={updatingVisibility === image.$id}
              className={`p-2 rounded-lg transition ${image.isPublic === false ? "bg-green-500/50 text-white hover:bg-green-500/70" : "bg-yellow-500/50 text-white hover:bg-yellow-500/70"} ${updatingVisibility === image.$id ? "opacity-50 cursor-wait" : ""}`}
              title={
                image.isPublic === false ? "Make Public" : "Hide from Public"
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
              onClick={() => onDeleteImage(image)}
              disabled={deletingId === image.$id}
              className={`p-2 rounded-lg bg-red-500/50 text-white hover:bg-red-500/70 transition ${deletingId === image.$id ? "opacity-50 cursor-wait" : ""}`}
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
              className={`font-medium truncate ${theme === "dark" ? "text-white" : "text-slate-900"}`}
            >
              {image.alt}
            </p>
            {image.caption && (
              <p
                className={`text-sm truncate mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
              >
                {image.caption}
              </p>
            )}
          </div>
          {!isReadOnly && (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => onMoveUp(image, index)}
                disabled={index === 0 || updatingOrder === image.$id}
                className={`p-1.5 rounded transition ${index === 0 ? "opacity-30 cursor-not-allowed" : theme === "dark" ? "hover:bg-gray-700 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-500 hover:text-slate-800"} ${updatingOrder === image.$id ? "animate-pulse" : ""}`}
                title="Move up"
              >
                <FaArrowUp className="text-xs" />
              </button>
              <button
                onClick={() => onMoveDown(image, index)}
                disabled={
                  index === totalCount - 1 || updatingOrder === image.$id
                }
                className={`p-1.5 rounded transition ${index === totalCount - 1 ? "opacity-30 cursor-not-allowed" : theme === "dark" ? "hover:bg-gray-700 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-500 hover:text-slate-800"} ${updatingOrder === image.$id ? "animate-pulse" : ""}`}
                title="Move down"
              >
                <FaArrowDown className="text-xs" />
              </button>
            </div>
          )}
        </div>
        {!isReadOnly && (
          <p
            className={`text-xs mt-2 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}
          >
            Order: {image.order ?? 0}
          </p>
        )}
      </div>
    </div>
  );
};
