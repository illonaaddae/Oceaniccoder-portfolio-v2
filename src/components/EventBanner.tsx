import React from "react";
import { useEventBanner } from "./EventBanner/useEventBanner";
import BannerContainer from "./EventBanner/BannerContainer";

const EventBanner: React.FC = () => {
  const { currentEvent, showConfetti, handleDismiss } = useEventBanner();

  if (!currentEvent) return null;

  return (
    <BannerContainer
      event={currentEvent}
      showConfetti={showConfetti}
      onDismiss={handleDismiss}
    />
  );
};

export default EventBanner;
