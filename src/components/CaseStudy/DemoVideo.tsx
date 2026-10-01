import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getVideoEmbedUrl, isDirectVideoUrl } from "@/utils/videoUrl";

interface Props {
  url?: string;
  title: string;
  poster?: string;
}

// The card's Demo badge links here as /projects/<slug>#demo. React Router does
// not scroll to hashes on its own, so the player brings itself into view.
const DEMO_ANCHOR = "demo";

const DemoVideo: React.FC<Props> = React.memo(({ url, title, poster }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { hash } = useLocation();

  useEffect(() => {
    if (url && hash === `#${DEMO_ANCHOR}`) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [url, hash]);

  if (!url) return null;

  const wrapperClass =
    "mb-12 scroll-mt-28 rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-black";

  if (isDirectVideoUrl(url)) {
    return (
      <div id={DEMO_ANCHOR} ref={ref} className={wrapperClass}>
        <video
          src={url}
          poster={poster}
          controls
          playsInline
          preload="metadata"
          className="w-full aspect-video"
          title={`${title} demo video`}
        />
      </div>
    );
  }

  const embed = getVideoEmbedUrl(url);
  if (!embed) return null;
  return (
    <div id={DEMO_ANCHOR} ref={ref} className={wrapperClass}>
      <iframe
        src={embed}
        className="w-full aspect-video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        title={`${title} demo video`}
      />
    </div>
  );
});

DemoVideo.displayName = "DemoVideo";
export default DemoVideo;
