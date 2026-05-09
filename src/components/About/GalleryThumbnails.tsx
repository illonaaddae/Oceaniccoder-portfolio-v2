import React from "react";

const FALLBACK_SRC =
  "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444ceb001c1eda1331/view?project=6943431e00253c8f9883";

import type { GalleryImage } from "../../types";

interface GalleryThumbnailsProps {
  galleryImages: GalleryImage[];
  currentImageIndex: number;
  goToSlide: (index: number) => void;
}

const GalleryThumbnails = React.memo(
  ({ galleryImages, currentImageIndex, goToSlide }: GalleryThumbnailsProps) => (
    <div className="px-6 pt-3">
      <div className="flex justify-center gap-1.5">
        {galleryImages.map((image) => (
          <button
            key={image.$id || image.src}
            onClick={() => goToSlide(galleryImages.indexOf(image))}
            className={`relative overflow-hidden rounded-lg border-2 transition-all duration-300 ${
              galleryImages.indexOf(image) === currentImageIndex
                ? "border-oceanic-500 scale-105 shadow-lg shadow-oceanic-500/25"
                : "border-white/20 hover:border-oceanic-500/50 hover:scale-105"
            }`}
            style={{ width: "35px", height: "35px" }}
          >
            <img
              loading="lazy"
              decoding="async"
              width="60"
              height="60"
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover transition-transform duration-300"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                (e.target as HTMLImageElement).src = FALLBACK_SRC;
              }}
            />
            {galleryImages.indexOf(image) === currentImageIndex && (
              <div className="absolute inset-0 bg-oceanic-500/20"></div>
            )}
          </button>
        ))}
      </div>

      {/* Slide indicators */}
      <div className="flex justify-center gap-1.5 mt-2">
        {galleryImages.map((img, idx) => (
          <button
            key={img.$id || img.src || `slide-${idx}`}
            onClick={() => goToSlide(idx)}
            className={`transition-all duration-300 ${
              idx === currentImageIndex
                ? "w-5 h-1.5 bg-gradient-to-r from-oceanic-400 to-oceanic-400 rounded-full scale-110"
                : "w-1.5 h-1.5 bg-gray-500 rounded-full hover:bg-oceanic-500/70 hover:scale-105"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Navigation hint */}
      <div className="flex justify-center mt-2 mb-4">
        <div className="glass-card bg-white/5 border border-white/10 rounded-lg px-2.5 py-0.5">
          <span className="text-small text-gray-400">
            ← Swipe or click to navigate →
          </span>
        </div>
      </div>
    </div>
  ),
);

GalleryThumbnails.displayName = "GalleryThumbnails";
export default GalleryThumbnails;
