import React from "react";
import { LazyImage } from "../ui/LazyImage";

/**
 * Hero / featured image displayed below the post header.
 */
const FeaturedImage = React.memo(({ image, title }) => {
  if (!image) return null;

  return (
    <div className="relative h-64 md:h-96 lg:h-[450px] rounded-2xl overflow-hidden mb-10">
      <LazyImage
        src={image}
        alt={title}
        className="w-full h-full"
        placeholderColor="from-emerald-900/30 to-slate-900"
        displaySize="blog"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
});

FeaturedImage.displayName = "FeaturedImage";
export { FeaturedImage };
