import React from "react";
import SkillCard from "./SkillCard";

const SkillGrid = React.memo(
  ({ skills, activeSkillCategory, animatedSkills }) => {
    const activeCategory = skills[activeSkillCategory];

    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-8">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">
            {activeCategory?.category}
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {activeCategory?.skills.map((skill, index) => (
              <SkillCard
                key={index}
                skill={skill}
                index={index}
                isAnimated={!!animatedSkills[`${activeSkillCategory}-${index}`]}
              />
            ))}
          </div>
        </div>
      </div>
    );
  },
);

SkillGrid.displayName = "SkillGrid";

export default SkillGrid;
