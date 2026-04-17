import React, { useState } from "react";
import {
  FaShare,
  FaTwitter,
  FaLinkedin,
  FaFacebook,
  FaLink,
} from "react-icons/fa";

/**
 * Self-contained share button + dropdown menu.
 * Manages its own open/close and "copied" state.
 */
const ShareMenu = React.memo(({ title }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = (platform) => {
    const url = window.location.href;

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };

    if (platform === "copy") {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      window.open(shareUrls[platform], "_blank", "width=600,height=400");
    }
    setShowMenu(false);
  };

  return (
    <div className="relative ml-auto">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <FaShare /> Share
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 glass-card rounded-lg p-2 min-w-[150px] z-20">
          <button
            onClick={() => handleShare("twitter")}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <FaTwitter className="text-blue-400" /> Twitter
          </button>
          <button
            onClick={() => handleShare("linkedin")}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <FaLinkedin className="text-blue-500" /> LinkedIn
          </button>
          <button
            onClick={() => handleShare("facebook")}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <FaFacebook className="text-blue-600" /> Facebook
          </button>
          <button
            onClick={() => handleShare("copy")}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <FaLink className="text-emerald-400" />
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      )}
    </div>
  );
});

ShareMenu.displayName = "ShareMenu";
export { ShareMenu };
