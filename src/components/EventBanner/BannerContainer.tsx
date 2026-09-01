import React from "react";
import Confetti from "../Confetti";
import type { Event } from "./types";
import EventContent from "./EventContent";
import DismissButton from "./DismissButton";

interface BannerContainerProps {
  event: Event;
  showConfetti: boolean;
  onDismiss: () => void;
}

const BannerContainer: React.FC<BannerContainerProps> = React.memo(
  ({ event, showConfetti, onDismiss }) => (
    <>
      {showConfetti && <Confetti />}
      <div
        className={`fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r ${event.bgGradient} backdrop-blur-sm shadow-lg`}
      >
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <EventContent event={event} />
            <DismissButton onDismiss={onDismiss} />
          </div>
        </div>
      </div>
      {/* Spacer to prevent content from being hidden behind the banner */}
      <div className="h-12 sm:h-14 md:h-16" />
    </>
  ),
);

BannerContainer.displayName = "BannerContainer";

export default BannerContainer;
