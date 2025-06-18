import React, { useState, useEffect } from "react";
import { usePortfolio } from "../Context"; // Fixed path

const SkillsSection = () => {
  const { skills, activeSkillCategory, setActiveSkillCategory } =
    usePortfolio();
  const [animatedSkills, setAnimatedSkills] = useState({});

  useEffect(() => {
    // Animate skill bars when category changes
    const timer = setTimeout(() => {
      const newAnimated = {};
      skills[activeSkillCategory]?.skills.forEach((skill, index) => {
        setTimeout(() => {
          setAnimatedSkills((prev) => ({
            ...prev,
            [`${activeSkillCategory}-${index}`]: true,
          }));
        }, index * 100);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [activeSkillCategory, skills]);

  const handleCategoryClick = (index) => {
    setActiveSkillCategory(index);
    setAnimatedSkills({}); // Reset animations
  };

  return (
    <section
      id="skills"
      className="min-h-screen py-20 relative"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-tertiary) 100%)",
      }}
    >
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-morph absolute top-32 right-20 w-80 h-80 bg-gradient-to-r from-orange-500/5 to-red-500/5 blur-3xl"></div>
        <div className="liquid-morph absolute bottom-32 left-20 w-72 h-72 bg-gradient-to-r from-blue-500/5 to-purple-500/5 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-green-600 dark:from-cyan-400 dark:via-blue-400 dark:to-green-400 bg-clip-text text-transparent">
              Skills & Expertise
            </span>
          </h2>
          <p className="text-xl leading-relaxed max-w-3xl mx-auto text-gray-700 dark:text-gray-300">
            Technologies, tools, and methodologies that power my development
            workflow
          </p>
        </div>

        {/* Category Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {skills.map((category, index) => (
            <button
              key={index}
              onClick={() => handleCategoryClick(index)}
              className={`glass-btn px-6 py-3 font-medium transition-all duration-300 ${
                activeSkillCategory === index
                  ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border border-orange-500/30 scale-105"
                  : "text-gray-400 hover:text-white hover:bg-white/5 hover:scale-105"
              }`}
            >
              {category.category}
            </button>
          ))}
        </div>

        {/* Skills Grid */}
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-8">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">
              {skills[activeSkillCategory]?.category}
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {skills[activeSkillCategory]?.skills.map((skill, index) => {
                const skillKey = `${activeSkillCategory}-${index}`;
                const isAnimated = animatedSkills[skillKey];

                return (
                  <div
                    key={index}
                    className="group hover:scale-105 transition-all duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                          {skill.icon}
                        </span>
                        <span className="font-medium text-white">
                          {skill.name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-cyan-400">
                        {skill.level}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="glass-progress">
                      <div
                        className="glass-progress-fill"
                        style={{
                          width: isAnimated ? `${skill.level}%` : "0%",
                          background: `linear-gradient(90deg, 
                            hsl(${skill.level * 1.2}, 70%, 60%), 
                            hsl(${skill.level * 1.2 + 30}, 70%, 70%))`,
                        }}
                      ></div>
                    </div>

                    {/* Skill Level Indicator */}
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Beginner</span>
                      <span>Intermediate</span>
                      <span>Expert</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Skills Summary */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="glass-card p-6 text-center group hover:scale-105 transition-all duration-300">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
              💻
            </div>
            <h4 className="text-xl font-bold text-white mb-2">15+ Projects</h4>
            <p className="text-gray-300">Built and deployed</p>
          </div>

          <div className="glass-card p-6 text-center group hover:scale-105 transition-all duration-300">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
              🛠️
            </div>
            <h4 className="text-xl font-bold text-white mb-2">
              20+ Technologies
            </h4>
            <p className="text-gray-300">Mastered and counting</p>
          </div>

          <div className="glass-card p-6 text-center group hover:scale-105 transition-all duration-300">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
              👥
            </div>
            <h4 className="text-xl font-bold text-white mb-2">100+ Students</h4>
            <p className="text-gray-300">Mentored and guided</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SkillsSection;
