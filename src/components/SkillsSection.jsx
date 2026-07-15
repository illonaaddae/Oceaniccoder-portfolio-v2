import React from "react";
import useSkillsData from "./Skills/useSkillsData";
import SectionHeader from "./Skills/SectionHeader";
import CategoryButtons from "./Skills/CategoryButtons";
import SkillGrid from "./Skills/SkillGrid";
import SkillsSummary from "./Skills/SkillsSummary";

const SkillsSection = () => {
  const {
    skills,
    activeSkillCategory,
    animatedSkills,
    totalTechnologies,
    projects,
    about,
    handleCategoryClick,
  } = useSkillsData();

  return (
    <section
      id="skills"
      className="min-h-screen py-20 relative"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-tertiary) 100%)",
      }}
    >
      <div className="container mx-auto px-6 relative z-10">
        <SectionHeader />
        <CategoryButtons
          skills={skills}
          activeSkillCategory={activeSkillCategory}
          onCategoryClick={handleCategoryClick}
        />
        <SkillGrid
          skills={skills}
          activeSkillCategory={activeSkillCategory}
          animatedSkills={animatedSkills}
        />
        <SkillsSummary projects={projects} about={about} totalTechnologies={totalTechnologies} />
      </div>
    </section>
  );
};

export default SkillsSection;
