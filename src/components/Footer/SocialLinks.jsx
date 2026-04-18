import React from "react";
import { Link } from "react-router-dom";
import { FaCalendarAlt } from "react-icons/fa";
import { IMAGES } from "../../utils/imageUrls";
import { socialLinks } from "./footerData";

const SocialLinks = React.memo(() => (
  <div>
    <h4 className="text-lg font-semibold text-white mb-4">Connect</h4>
    <div className="space-y-4">
      {socialLinks.map((social, index) => (
        <a
          key={index}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-gray-400 hover:text-oceanic-500 transition-colors duration-300 text-sm"
        >
          <span className="text-base">
            <social.Icon />
          </span>
          {social.label}
        </a>
      ))}
    </div>

    {/* Availability Status */}
    <div className="mt-6 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400 text-sm font-medium">
            Available for hire
          </span>
        </div>
        <Link
          to="/booking"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium rounded-lg transition-all duration-300 hover:scale-105"
        >
          <FaCalendarAlt className="text-xs" />
          Schedule
        </Link>
      </div>
    </div>

    {/* Scrimba Ambassador */}
    <a
      href="https://scrimba.com/?via=u01ap3s"
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 block p-3 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 dark:from-[#2B283A]/60 dark:to-[#3D3A4F]/60 rounded-lg border border-purple-500/20 dark:border-[#5D5A6F]/30 hover:border-purple-500/40 dark:hover:border-[#7D7A8F]/50 transition-all duration-300 hover:scale-[1.02] group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-500/20 dark:bg-[#2B283A] rounded-lg">
          <img
            src={IMAGES.scrimba}
            alt="Scrimba"
            className="w-5 h-5 object-contain"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-800 dark:text-white text-sm font-medium">
              Scrimba Ambassador
            </span>
            <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse">
              20% OFF
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-xs">
            Learn to code with my exclusive discount!
          </p>
        </div>
      </div>
    </a>
  </div>
));

SocialLinks.displayName = "SocialLinks";

export default SocialLinks;
