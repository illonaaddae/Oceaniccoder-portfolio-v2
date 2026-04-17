import React from "react";

const SkillCard = React.memo(({ skill, index, isAnimated }) => (
  <div
    className="group hover:scale-105 transition-all duration-300"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
          {skill.icon}
        </span>
        <span className="font-medium text-white">{skill.name}</span>
      </div>
      <span className="text-sm font-bold text-oceanic-500">{skill.level}%</span>
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
    <div className="flex justify-between text-xs text-gray-400 mt-1 skills-level-label">
      <span>Beginner</span>
      <span>Intermediate</span>
      <span>Expert</span>
    </div>
  </div>
));

SkillCard.displayName = "SkillCard";

export default SkillCard;
