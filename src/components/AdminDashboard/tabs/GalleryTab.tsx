import { FaImage, FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import type { GalleryImage } from "@/types";

interface GalleryTabProps {
  theme: "light" | "dark";
  loading: boolean;
  gallery: GalleryImage[];
  onDelete: (id: string) => void;
  onEdit?: (image: GalleryImage) => void;
  onShowForm?: () => void;
}

export const GalleryTab: React.FC<GalleryTabProps> = ({
  theme,
  loading,
  gallery,
  onDelete,
  onEdit,
  onShowForm,
}) => {
  // Sort gallery by order
  const sortedGallery = [...gallery].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

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
            Manage your portfolio gallery images
          </p>
        </div>
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
      </div>

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
          {sortedGallery.map((image) => (
            <div
              key={image.$id}
              className={`glass-card border rounded-2xl overflow-hidden ${
                theme === "dark"
                  ? "bg-gray-800/50 border-gray-700/80"
                  : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
              }`}
            >
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
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => onEdit?.(image)}
                    className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Delete this image?")) {
                        onDelete(image.$id);
                      }
                    }}
                    className="p-2 rounded-lg bg-red-500/50 text-white hover:bg-red-500/70 transition"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              <div className="p-4">
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
                <p
                  className={`text-xs mt-2 ${
                    theme === "dark" ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Order: {image.order || 0}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
