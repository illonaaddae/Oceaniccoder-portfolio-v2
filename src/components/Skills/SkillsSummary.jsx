import React from "react";
import { Link } from "react-router-dom";
import { FaLaptopCode, FaTools, FaUsers, FaArrowRight } from "react-icons/fa";

const SkillsSummary = React.memo(({ projects, about, totalTechnologies }) => (
  <>
    <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      <div className="glass-card p-6 text-center group hover:scale-105 transition-all duration-300">
        <div className="flex justify-center mb-3">
          <FaLaptopCode className="text-3xl text-oceanic-500 group-hover:scale-110 transition-transform duration-300" />
        </div>
        <h4 className="text-xl font-bold text-white mb-2 skills-summary-heading">
          {projects?.length || 15}+ Projects
        </h4>
        <p className="text-gray-300 skills-summary-description">Built and deployed</p>
      </div>

      <div className="glass-card p-6 text-center group hover:scale-105 transition-all duration-300">
        <div className="flex justify-center mb-3">
          <FaTools className="text-3xl text-oceanic-500 group-hover:scale-110 transition-transform duration-300" />
        </div>
        <h4 className="text-xl font-bold text-white mb-2 skills-summary-heading">
          {totalTechnologies}+ Technologies
        </h4>
        <p className="text-gray-300 skills-summary-description">Mastered and counting</p>
      </div>

      <div className="glass-card p-6 text-center group hover:scale-105 transition-all duration-300">
        <div className="flex justify-center mb-3">
          <FaUsers className="text-3xl text-oceanic-500 group-hover:scale-110 transition-transform duration-300" />
        </div>
        <h4 className="text-xl font-bold text-white mb-2 skills-summary-heading">
          {about?.studentsMentored || 40}+ Students
        </h4>
        <p className="text-gray-300 skills-summary-description">Mentored and guided</p>
      </div>
    </div>

    <div className="text-center mt-10">
      <Link
        to="/about"
        className="skills-about-cta inline-flex items-center gap-3 px-6 py-3 font-semibold mt-4 bg-gradient-to-r from-oceanic-500 to-oceanic-900 text-white rounded-xl hover:from-oceanic-400 hover:to-oceanic-800 hover:scale-110 transition-all duration-300 shadow-lg shadow-oceanic-500/25 group"
      >
        <span>Want to know more? Read my About</span>
        <FaArrowRight className="group-hover:translate-x-1 transition-transform duration-300" />
      </Link>
    </div>
  </>
));

SkillsSummary.displayName = "SkillsSummary";

export default SkillsSummary;
