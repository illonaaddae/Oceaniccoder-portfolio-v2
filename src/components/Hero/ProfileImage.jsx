import React, { useState, useEffect, useRef } from "react";
import { PROFILE_IMAGE_URL } from "./heroData";

const ProfileImage = React.memo(function ProfileImage() {
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.src = PROFILE_IMAGE_URL;
    let checkTimeout = null;

    const checkImgElement = () => {
      if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
        setProfileLoaded(true);
        setImageReady(true);
        return true;
      }
      return false;
    };

    if (img.complete || img.naturalWidth > 0) {
      setProfileLoaded(true);
      setImageReady(true);
    } else {
      checkTimeout = setTimeout(() => checkImgElement(), 50);
      img.onload = () => {
        setProfileLoaded(true);
        requestAnimationFrame(() => setImageReady(true));
      };
      img.onerror = () => {
        setProfileLoaded(true);
        setImageReady(true);
      };
    }
    return () => {
      if (checkTimeout) clearTimeout(checkTimeout);
      img.onload = null;
      img.onerror = null;
    };
  }, []);

  const handleLoad = () => {
    if (!profileLoaded) setProfileLoaded(true);
    if (!imageReady) requestAnimationFrame(() => setImageReady(true));
  };
  const handleError = () => {
    setProfileLoaded(true);
    setImageReady(true);
  };

  const imgStyle = {
    willChange: imageReady ? "transform" : "opacity",
    transform: "translateZ(0)",
    WebkitTransform: "translateZ(0)",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    opacity: imageReady ? 1 : 0,
    transition: imageReady
      ? "opacity 0ms ease-out, transform 300ms ease-out"
      : "opacity 300ms ease-out, transform 300ms ease-out",
  };

  return (
    <div className="flex justify-center lg:justify-start order-1 lg:order-2">
      <div className="relative group">
        <div className="absolute -inset-4 bg-gradient-to-r from-teal-600/15 to-oceanic-900/15 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
        <div className="relative">
          <div className="w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[26rem] lg:h-[26rem] xl:w-[28rem] xl:h-[28rem] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 group-hover:scale-105 transition-transform duration-300">
            <img
              ref={imgRef}
              src={PROFILE_IMAGE_URL}
              alt="Illona Addae - Professional Developer Portrait"
              className={`w-full h-full object-cover object-center group-hover:scale-110 transition-all duration-300 hero-img ${imageReady ? "loaded" : ""}`}
              onLoad={handleLoad}
              onError={handleError}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              width="1200"
              height="1200"
              style={imgStyle}
            />
          </div>
        </div>
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
          <div className="glass-card bg-gradient-to-r from-oceanic-700/15 to-oceanic-900/15 backdrop-blur-md border border-oceanic-600/25 rounded-xl px-5 py-2 shadow-xl">
            <span className="text-oceanic-900 dark:text-oceanic-50 text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
              <span className="w-2 h-2 bg-oceanic-500 rounded-full animate-pulse"></span>
              Available for Hire
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProfileImage;
