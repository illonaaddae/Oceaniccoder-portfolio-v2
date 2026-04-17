import React from "react";
import { FaDownload } from "react-icons/fa";

import type { About } from "../../types";

interface DownloadCVCardProps {
  about: About | null;
}

const DownloadCVCard = React.memo(({ about }: DownloadCVCardProps) => (
  <div className="glass-card p-6 text-center bg-gradient-to-r from-oceanic-500/10 to-blue-500/10 border border-oceanic-500/20">
    <h4 className="text-lg font-bold text-white mb-3">Want to Know More?</h4>
    <a
      href={
        about?.resumeUrl ||
        "https://drive.google.com/file/d/1ewZVJPLATbvO5X0tgceWuGKgQIXSxBRX/view?usp=sharing"
      }
      target="_blank"
      rel="noopener noreferrer"
      className="glass-btn bg-gradient-to-r from-oceanic-600 to-oceanic-900 text-white px-6 py-3 font-medium hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
    >
      <FaDownload className="w-4 h-4" />
      Download Full CV
    </a>
  </div>
));

DownloadCVCard.displayName = "DownloadCVCard";
export default DownloadCVCard;
