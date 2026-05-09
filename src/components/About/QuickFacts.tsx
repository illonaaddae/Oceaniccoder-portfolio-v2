import React from "react";
import {
  FaStar,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUsers,
  FaAward,
} from "react-icons/fa";

import type { About, Certification } from "../../types";

interface QuickFactsProps {
  about: About | null;
  certifications: Certification[] | null;
}

const QuickFacts = React.memo(({ about, certifications }: QuickFactsProps) => (
  <div className="glass-card w-full max-w-none p-6">
    <h4 className="text-heading-lg text-white mb-4 flex items-center gap-2">
      <FaStar className="text-yellow-400" />
      Quick Facts
    </h4>
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-caption group hover:scale-105 transition-transform duration-200">
        <div className="w-8 h-8 rounded-full bg-red-400/20 flex items-center justify-center">
          <FaMapMarkerAlt className="text-red-400 text-xs" />
        </div>
        <span className="text-gray-300">Based in Accra, Ghana</span>
      </div>
      <div className="flex items-center gap-3 text-caption group hover:scale-105 transition-transform duration-200">
        <div className="w-8 h-8 rounded-full bg-blue-400/20 flex items-center justify-center">
          <FaCalendarAlt className="text-blue-400 text-xs" />
        </div>
        <span className="text-gray-300">
          {about?.yearsExperience || 2}+ Years in Tech
        </span>
      </div>
      <div className="flex items-center gap-3 text-caption group hover:scale-105 transition-transform duration-200">
        <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center">
          <FaUsers className="text-green-400 text-xs" />
        </div>
        <span className="text-gray-300">
          {about?.studentsMentored || 40}+ Students Mentored
        </span>
      </div>
      <div className="flex items-center gap-3 text-caption group hover:scale-105 transition-transform duration-200">
        <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
          <FaAward className="text-yellow-400 text-xs" />
        </div>
        <span className="text-gray-300">
          {certifications?.length || 0}+ Certifications
        </span>
      </div>
    </div>
  </div>
));

QuickFacts.displayName = "QuickFacts";
export default QuickFacts;
