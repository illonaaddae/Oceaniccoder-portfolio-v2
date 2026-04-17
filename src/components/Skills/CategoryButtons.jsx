import React from "react";

const CategoryButtons = React.memo(
  ({ skills, activeSkillCategory, onCategoryClick }) => (
    <div className="flex flex-wrap justify-center gap-4 mb-12">
      {skills.map((category, index) => (
        <button
          key={index}
          onClick={() => onCategoryClick(index)}
          className={`glass-btn px-6 py-3 font-medium transition-all duration-300 skills-cat-btn ${
            activeSkillCategory === index
              ? "skills-cat-btn--active scale-105"
              : "skills-cat-btn--inactive hover:scale-105"
          }`}
        >
          {category.category}
        </button>
      ))}
    </div>
  ),
);

CategoryButtons.displayName = "CategoryButtons";

export default CategoryButtons;
