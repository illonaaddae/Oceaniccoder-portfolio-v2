import React, { useState } from "react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { LazyImage } from "../ui/LazyImage";

interface Props {
  screenshots: string[];
  title: string;
}

const Screenshots: React.FC<Props> = React.memo(({ screenshots, title }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (screenshots.length === 0) return null;

  const close = () => setActiveIndex(null);
  const next = () => setActiveIndex((i) => ((i ?? 0) + 1) % screenshots.length);
  const prev = () =>
    setActiveIndex(
      (i) => ((i ?? 0) - 1 + screenshots.length) % screenshots.length,
    );

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
        Screenshots
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {screenshots.map((src, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className="rounded-xl overflow-hidden border border-[var(--glass-border)] hover:border-[var(--brand-ocean-2)]/50 transition-all hover:scale-[1.02]"
            aria-label={`View screenshot ${idx + 1} of ${title}`}
          >
            <LazyImage
              src={src}
              alt={`${title} screenshot ${idx + 1}`}
              className="w-full h-48 object-cover"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {activeIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={close}
        >
          <button
            onClick={close}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
            aria-label="Close lightbox"
          >
            <FaTimes className="text-2xl" />
          </button>
          {screenshots.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-4 p-3 text-white/70 hover:text-white transition-colors"
                aria-label="Previous image"
              >
                <FaChevronLeft className="text-2xl" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-4 p-3 text-white/70 hover:text-white transition-colors"
                aria-label="Next image"
              >
                <FaChevronRight className="text-2xl" />
              </button>
            </>
          )}
          <img
            src={screenshots[activeIndex]}
            alt="Screenshot"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 text-white/70 text-sm">
            {activeIndex + 1} / {screenshots.length}
          </div>
        </div>
      )}
    </div>
  );
});

Screenshots.displayName = "Screenshots";
export default Screenshots;
