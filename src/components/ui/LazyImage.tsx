import React, { useState, useRef, useEffect } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  fallbackSrc?: string;
  placeholderColor?: string;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * LazyImage Component
 *
 * Features:
 * - Intersection Observer for lazy loading
 * - Blur placeholder while loading
 * - Smooth fade-in animation
 * - Fallback image on error
 * - Supports custom placeholder colors
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = "",
  width,
  height,
  fallbackSrc = "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cef000da2150f34/view?project=6943431e00253c8f9883",
  placeholderColor = "from-gray-800 to-gray-900",
  objectFit = "cover",
  onClick,
  style,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to detect when image enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setCurrentSrc(src);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "100px", // Start loading 100px before entering viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  // Reset state when src changes
  useEffect(() => {
    if (isInView) {
      setIsLoaded(false);
      setHasError(false);
      setCurrentSrc(src);
    }
  }, [src, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    if (!hasError && fallbackSrc) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
    }
  };

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height, ...style }}
      onClick={onClick}
    >
      {/* Blur placeholder with gradient background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${placeholderColor} transition-opacity duration-500 ${
          isLoaded ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* Animated shimmer effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={`absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent ${
              !isLoaded ? "animate-shimmer" : ""
            }`}
          />
        </div>

        {/* Blurred preview placeholder */}
        <div className="absolute inset-0 backdrop-blur-sm bg-white/5" />
      </div>

      {/* Actual image */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full transition-all duration-500 ${
            isLoaded
              ? "opacity-100 scale-100 blur-0"
              : "opacity-0 scale-105 blur-sm"
          }`}
          style={{ objectFit }}
        />
      )}
    </div>
  );
};

export default LazyImage;
