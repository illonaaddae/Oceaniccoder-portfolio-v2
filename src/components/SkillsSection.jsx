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
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-morph absolute top-32 right-20 w-80 h-80 bg-gradient-to-r from-orange-500/5 to-red-500/5 blur-3xl"></div>
        <div className="liquid-morph absolute bottom-32 left-20 w-72 h-72 bg-gradient-to-r from-blue-500/5 to-purple-500/5 blur-3xl"></div>
      </div>

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
        <SkillsSummary
          projects={projects}
          about={about}
          totalTechnologies={totalTechnologies}
        />
      </div>
    </section>
  );
};

export default SkillsSection;
