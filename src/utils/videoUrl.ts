/**
 * Demo video URL handling, shared by the project card hover preview and the
 * case study player.
 *
 * A demo is either an embed (YouTube, Loom) played in an iframe, or a hosted
 * file played in a <video>. Files uploaded from the admin form are stored in
 * Appwrite, whose view URL (`/storage/buckets/<b>/files/<f>/view?project=...`)
 * has no file extension, so an extension check alone missed them and the
 * video rendered nowhere.
 */

const VIDEO_EXTENSION = /\.(mp4|webm|ogg)(\?|#|$)/i;

/** Appwrite file view/download URL. The upload form only accepts video files. */
const APPWRITE_FILE = /\/storage\/buckets\/[^/]+\/files\/[^/]+\/(view|download)(\?|#|$)/;

const YOUTUBE = /youtube\.com|youtu\.be/;
const LOOM_SHARE = /loom\.com\/share\/([\w-]+)/;

/** True when the URL points at a video file a <video> element can play. */
export const isDirectVideoUrl = (url: string): boolean =>
  VIDEO_EXTENSION.test(url) || APPWRITE_FILE.test(url);

/** True when the URL is a YouTube or Loom page that needs an iframe. */
export const isEmbedVideoUrl = (url: string): boolean => YOUTUBE.test(url) || /loom\.com/.test(url);

/**
 * YouTube video id from any supported URL form:
 *   youtu.be/<id>?si=...
 *   youtube.com/watch?v=<id>&...
 *   youtube.com/shorts/<id>
 *   youtube.com/embed/<id>
 */
export const getYouTubeId = (url: string): string | null => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
};

/**
 * Iframe src for a YouTube or Loom URL, or null for anything else.
 *
 * `preview` gives the muted, looping, chrome-free player used on card hover.
 * youtube-nocookie.com avoids the "Sign in to confirm you're not a bot" gate
 * that fires on hover-preview iframes.
 */
export const getVideoEmbedUrl = (
  url: string,
  { preview = false }: { preview?: boolean } = {},
): string | null => {
  const ytId = getYouTubeId(url);
  if (ytId) {
    const params = preview
      ? `autoplay=1&mute=1&controls=0&loop=1&playlist=${ytId}&modestbranding=1&rel=0&playsinline=1`
      : "modestbranding=1&rel=0&playsinline=1";
    return `https://www.youtube-nocookie.com/embed/${ytId}?${params}`;
  }
  const loom = url.match(LOOM_SHARE);
  if (loom) {
    return `https://www.loom.com/embed/${loom[1]}${preview ? "?autoplay=1&hide_controls=1" : ""}`;
  }
  return null;
};
