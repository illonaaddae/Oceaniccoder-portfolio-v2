import React from "react";

interface Props {
  url?: string;
  title: string;
}

const isYouTube = (u: string) => /youtube\.com|youtu\.be/.test(u);
const isLoom = (u: string) => /loom\.com/.test(u);
const isDirectVideo = (u: string) => /\.(mp4|webm|ogg)(\?|$)/i.test(u);

// Extract YouTube id from common URL shapes including youtu.be/<id>?si=...
const getYouTubeId = (u: string): string | null => {
  const m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
};

const getEmbedUrl = (url: string): string | null => {
  const ytId = getYouTubeId(url);
  if (ytId) {
    // youtube-nocookie.com avoids the "Sign in to confirm you're not a bot"
    // gate; modestbranding + rel=0 cleans up the player chrome.
    return `https://www.youtube-nocookie.com/embed/${ytId}?modestbranding=1&rel=0&playsinline=1`;
  }
  const lm = url.match(/loom\.com\/share\/([\w-]+)/);
  if (lm) return `https://www.loom.com/embed/${lm[1]}`;
  return null;
};

const DemoVideo: React.FC<Props> = React.memo(({ url, title }) => {
  if (!url) return null;

  if (isDirectVideo(url)) {
    return (
      <div className="mb-12 rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-black">
        <video
          src={url}
          controls
          playsInline
          className="w-full aspect-video"
          title={`${title} demo video`}
        />
      </div>
    );
  }

  if (isYouTube(url) || isLoom(url)) {
    const embed = getEmbedUrl(url);
    if (!embed) return null;
    return (
      <div className="mb-12 rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-black">
        <iframe
          src={embed}
          className="w-full aspect-video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={`${title} demo video`}
        />
      </div>
    );
  }

  return null;
});

DemoVideo.displayName = "DemoVideo";
export default DemoVideo;
