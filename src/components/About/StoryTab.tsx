import React from "react";
import StoryContent from "./StoryContent";
import ImageGallery from "./ImageGallery";
import QuickFacts from "./QuickFacts";

import type { About, GalleryImage, Certification } from "../../types";

interface StoryTabProps {
  galleryImages: GalleryImage[] | null;
  about: About | null;
  certifications: Certification[] | null;
}

const StoryTab = React.memo(
  ({ galleryImages, about, certifications }: StoryTabProps) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-start">
      <StoryContent />
      <div className="space-y-5 sm:space-y-6 lg:space-y-8">
        {galleryImages && galleryImages.length > 0 && (
          <ImageGallery galleryImages={galleryImages} />
        )}
        <QuickFacts about={about} certifications={certifications} />
      </div>
    </div>
  ),
);

StoryTab.displayName = "StoryTab";
export default StoryTab;
