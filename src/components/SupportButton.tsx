import React, { useState } from "react";
import { FaCoffee, FaTimes, FaHeart, FaCalendarAlt } from "react-icons/fa";
import { IMAGES } from "../utils/imageUrls";

interface SupportLink {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  bgColor: string;
  hoverColor: string;
  badge?: string;
}

const SUPPORT_LINKS: SupportLink[] = [
  {
    id: "calendly",
    name: "Schedule a Meeting",
    description: "Book a time to chat with me!",
    url: "https://calendly.com/addaeillona",
    icon: <FaCalendarAlt className="text-xl" />,
    bgColor: "bg-gradient-to-r from-cyan-500 to-blue-500",
    hoverColor: "hover:from-cyan-600 hover:to-blue-600",
  },
  {
    id: "buymeacoffee",
    name: "Buy Me a Coffee",
    description: "Support my work with a coffee!",
    url: "https://buymeacoffee.com/gliy8vpa7m",
    icon: <FaCoffee className="text-xl" />,
    bgColor: "bg-[#FFDD00]",
    hoverColor: "hover:bg-[#FFE84D]",
  },
  {
    id: "scrimba",
    name: "Scrimba Pro",
    description: "Learn to code with 20% OFF!",
    url: "https://scrimba.com/?via=u01ap3s",
    icon: (
      <img
        src={IMAGES.scrimba}
        alt="Scrimba"
        className="w-5 h-5 object-contain"
      />
    ),
    bgColor: "bg-[#2B283A]",
    hoverColor: "hover:bg-[#3D3A4F]",
    badge: "20% OFF",
  },
];

const SupportButton: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      {/* Expanded support options */}
      <div
        className={`flex flex-col gap-2 transition-all duration-300 ${
          isExpanded
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {SUPPORT_LINKS.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-center gap-3 px-4 py-3 rounded-full ${link.bgColor} ${link.hoverColor} shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl`}
          >
            <span
              className={
                link.id === "buymeacoffee" ? "text-gray-800" : "text-white"
              }
            >
              {link.icon}
            </span>
            <div className="flex flex-col">
              <span
                className={`font-semibold text-sm ${
                  link.id === "buymeacoffee" ? "text-gray-800" : "text-white"
                }`}
              >
                {link.name}
              </span>
              <span
                className={`text-xs ${
                  link.id === "buymeacoffee" ? "text-gray-600" : "text-gray-300"
                }`}
              >
                {link.description}
              </span>
            </div>
            {link.badge && (
              <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse">
                {link.badge}
              </span>
            )}
          </a>
        ))}
      </div>

      {/* Main toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`group relative p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl ${
          isExpanded
            ? "bg-gray-700 hover:bg-gray-600"
            : "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
        }`}
        aria-label={isExpanded ? "Close support menu" : "Support me"}
      >
        <div
          className={`text-white transition-transform duration-300 ${
            isExpanded ? "rotate-0" : ""
          }`}
        >
          {isExpanded ? (
            <FaTimes className="text-xl" />
          ) : (
            <FaHeart className="text-xl animate-pulse" />
          )}
        </div>

        {/* Pulse ring animation when collapsed */}
        {!isExpanded && (
          <span className="absolute inset-0 rounded-full bg-pink-400 animate-ping opacity-25" />
        )}
      </button>
    </div>
  );
};

export default SupportButton;
