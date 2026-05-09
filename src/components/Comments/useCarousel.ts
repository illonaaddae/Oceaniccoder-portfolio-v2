import { useState, useEffect, useRef, useCallback } from "react";

export const useCarousel = (totalItems: number) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyIndex, setReplyIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const goToNext = useCallback(() => {
    if (isAnimating || totalItems <= 1) return;
    setIsAnimating(true);
    setCurrentIndex((p) => (p + 1) % totalItems);
    setReplyIndex(0);
    setTimeout(() => setIsAnimating(false), 400);
  }, [isAnimating, totalItems]);

  const goToPrev = useCallback(() => {
    if (isAnimating || totalItems <= 1) return;
    setIsAnimating(true);
    setCurrentIndex((p) => (p - 1 + totalItems) % totalItems);
    setReplyIndex(0);
    setTimeout(() => setIsAnimating(false), 400);
  }, [isAnimating, totalItems]);

  const goToSlide = useCallback(
    (index: number) => {
      if (isAnimating || index === currentIndex) return;
      setIsAnimating(true);
      setCurrentIndex(index);
      setReplyIndex(0);
      setTimeout(() => setIsAnimating(false), 400);
    },
    [isAnimating, currentIndex],
  );

  useEffect(() => {
    if (totalItems <= 1) return;
    autoPlayRef.current = setInterval(goToNext, 8000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [totalItems, goToNext]);

  return {
    currentIndex,
    setCurrentIndex,
    replyIndex,
    setReplyIndex,
    isAnimating,
    goToNext,
    goToPrev,
    goToSlide,
  };
};
