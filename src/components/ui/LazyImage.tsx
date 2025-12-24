import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  getOptimizedImageUrl,
  isAppwriteUrl,
  generateSrcSet,
} from "../../utils/imageOptimizer";

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
  /** Display context for automatic optimization */
  displaySize?: "thumbnail" | "card" | "blog" | "hero" | "full";
  /** Disable image optimization (use original URL) */
  disableOptimization?: boolean;
}

// Size presets for optimization
const SIZE_PRESETS = {
  thumbnail: { width: 150, height: 150 },
  card: { width: 400, height: 300 },
  blog: { width: 800, height: 450 },
  hero: { width: 1200, height: 675 },
  full: { width: 1920, height: 1080 },
};

/**
 * LazyImage Component
 *
 * Features:
 * - Intersection Observer for lazy loading
 * - Blur placeholder while loading
 * - Smooth fade-in animation
 * - Fallback image on error
 * - Supports custom placeholder colors
 * - Automatic image optimization for Appwrite images
 * - Responsive srcSet generation
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
  displaySize = "card",
  disableOptimization = false,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  // Calculate optimized image URL based on display size
  const optimizedSrc = useMemo(() => {
    if (!src || disableOptimization || !isAppwriteUrl(src)) return src;

    const preset = SIZE_PRESETS[displaySize];
    return getOptimizedImageUrl(src, preset.width, preset.height, 80);
  }, [src, displaySize, disableOptimization]);

  // Generate srcSet for responsive images
  const srcSet = useMemo(() => {
    if (!src || disableOptimization || !isAppwriteUrl(src)) return "";
    return generateSrcSet(src, [320, 640, 768, 1024, 1280]);
  }, [src, disableOptimization]);

  // Intersection Observer to detect when image enters viewport
  useEffect(() => {
    // Check if element is already in viewport on mount (e.g., blog cover images at top)
    const checkInitialVisibility = () => {
      if (imgRef.current) {
        const rect = imgRef.current.getBoundingClientRect();
        const isVisible =
          rect.top < window.innerHeight + 200 && rect.bottom > -200;
        if (isVisible) {
          setIsInView(true);
          setCurrentSrc(optimizedSrc);
          return true;
        }
      }
      return false;
    };

    // If already visible, don't set up observer
    if (checkInitialVisibility()) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setCurrentSrc(optimizedSrc);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px", // Start loading 200px before entering viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [optimizedSrc]);

  // Reset state when src changes
  useEffect(() => {
    if (isInView) {
      setIsLoaded(false);
      setHasError(false);
      setCurrentSrc(optimizedSrc);
    }
  }, [optimizedSrc, isInView]);

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
          srcSet={srcSet || undefined}
          sizes={
            srcSet
              ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              : undefined
          }
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
