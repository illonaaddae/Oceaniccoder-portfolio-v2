import React, { useState } from "react";
import { FaChevronLeft, FaChevronRight, FaPlay } from "react-icons/fa";
import { LazyImage } from "../ui/LazyImage";
import GalleryThumbnails from "./GalleryThumbnails";

import type { GalleryImage } from "../../types";

interface ImageGalleryProps {
  galleryImages: GalleryImage[];
}

const ImageGallery = React.memo(({ galleryImages }: ImageGalleryProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () =>
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  const prevImage = () =>
    setCurrentImageIndex(
      (prev) => (prev - 1 + galleryImages.length) % galleryImages.length,
    );
  const goToSlide = (index: number) => setCurrentImageIndex(index);

  return (
    <div className="glass-card w-full p-4 sm:p-6">
      <h3 className="text-heading-lg text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
        <FaPlay className="text-oceanic-500 flex-shrink-0" />
        <span>My Journey in Pictures</span>
      </h3>

      <div className="relative -mx-4 sm:-mx-6 -mb-4 sm:-mb-6">
        <div className="relative overflow-hidden rounded-b-2xl shadow-2xl border border-oceanic-500/30 bg-gradient-to-br from-gray-900 to-gray-800 gallery-container">
          {/* Image container */}
          <div
            className="relative w-full gallery-image-wrapper"
            style={{ minHeight: "280px", maxHeight: "60vh" }}
          >
            <div className="flex items-center justify-center w-full h-full p-3 sm:p-4 md:p-6">
              <LazyImage
                src={galleryImages[currentImageIndex]?.src || ""}
                alt={galleryImages[currentImageIndex]?.alt || "Gallery image"}
                className="gallery-main-image rounded-lg"
                placeholderColor="from-oceanic-900/30 to-slate-900"
                fallbackSrc="https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444ceb001c1eda1331/view?project=6943431e00253c8f9883"
                displaySize="hero"
                style={{
                  objectPosition: "center",
                  maxHeight: "60vh",
                  width: "auto",
                  maxWidth: "100%",
                }}
              />
            </div>
          </div>

          {/* Navigation arrows */}
          <button
            onClick={prevImage}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 glass-btn bg-black/80 backdrop-blur-sm text-white p-2.5 rounded-full hover:scale-110 hover:bg-black/90 transition-all duration-300 group shadow-xl z-20"
            aria-label="Previous image"
          >
            <FaChevronLeft className="w-3.5 h-3.5 group-hover:scale-110" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 glass-btn bg-black/80 backdrop-blur-sm text-white p-2.5 rounded-full hover:scale-110 hover:bg-black/90 transition-all duration-300 group shadow-xl z-20"
            aria-label="Next image"
          >
            <FaChevronRight className="w-3.5 h-3.5 group-hover:scale-110" />
          </button>

          {/* Image counter */}
          <div className="absolute bottom-2 right-2 z-10">
            <div className="glass-card bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg px-2.5 py-1 shadow-lg">
              <span className="text-white text-small font-medium">
                {currentImageIndex + 1}/{galleryImages.length}
              </span>
            </div>
          </div>

          {/* Caption */}
          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-14 sm:right-16 z-10">
            <div className="glass-card bg-black/80 backdrop-blur-md border border-white/20 rounded-lg px-3 py-2 shadow-xl max-w-md">
              <p className="text-white text-caption sm:text-base font-medium leading-relaxed">
                {galleryImages[currentImageIndex]?.caption || ""}
              </p>
            </div>
          </div>
        </div>

        <GalleryThumbnails
          galleryImages={galleryImages}
          currentImageIndex={currentImageIndex}
          goToSlide={goToSlide}
        />
      </div>
    </div>
  );
});

ImageGallery.displayName = "ImageGallery";
export default ImageGallery;
