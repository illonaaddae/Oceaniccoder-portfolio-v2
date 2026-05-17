import React, { useState, useRef, useEffect } from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholderClass?: string;
  displaySize?: "hero" | "thumb" | string;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = "",
  placeholderClass = "bg-gray-800/50 animate-pulse",
  displaySize,
  ...props
}) => {
  const isHero = displaySize === "hero";
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(isHero); // hero starts in-view immediately
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHero) return; // skip observer for hero — load immediately
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isHero]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {!loaded && <div className={`absolute inset-0 rounded ${placeholderClass}`} />}
      {inView && (
        <img
          src={src}
          alt={alt}
          loading={isHero ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={isHero ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          className={`transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${className}`}
          {...props}
        />
      )}
    </div>
  );
};

export default React.memo(LazyImage);
